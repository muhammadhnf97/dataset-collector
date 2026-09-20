import hashlib
import hmac
import os
from datetime import datetime
from pathlib import Path

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class AuditMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, default="system")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String, default="system", onupdate="system")


class Source(Base, AuditMixin):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)  # e.g. "Shop A"
    version = Column(String, nullable=False, default="1")

    __table_args__ = (
        UniqueConstraint("name", "version", name="uq_source_name_version"),
    )


class Batch(Base, AuditMixin):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # raw | video | frames | crops
    source = Column(String)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    cover = Column(String)

    source_ref = relationship("Source")
    images = relationship("Image", back_populates="batch")


class Image(Base, AuditMixin):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    path = Column(String, unique=True, nullable=False)
    filename = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    batch = relationship("Batch", back_populates="images")


class Dataset(Base, AuditMixin):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    dir_name = Column(String, unique=True, nullable=False)
    framework = Column(String)
    model = Column(String)
    split = Column(JSON, default={"train": 70, "val": 20, "test": 10})

    images = relationship(
        "DatasetImage", back_populates="dataset", cascade="all, delete-orphan"
    )


class DatasetImage(Base, AuditMixin):
    __tablename__ = "dataset_images"

    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("dataset_id", "image_id", name="uq_dataset_image"),
    )

    dataset = relationship("Dataset", back_populates="images")
    image = relationship("Image")
    batch = relationship("Batch")


class Annotation(Base, AuditMixin):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    values = Column(JSON, default=list)
    pre_labels = Column(JSON, default=list)
    last_attr = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("dataset_id", "image_id", name="uq_annotation"),
    )


class User(Base, AuditMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False, default="worker")  # "worker" | "superadmin"
    password_hash = Column(String, nullable=True)  # required for superadmin; workers unset for now


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_name = Column(String)  # denormalized: survives user rename/delete
    action = Column(String, nullable=False)  # e.g. "annotate", "prelabel", "remove_image"
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    dataset_name = Column(String, nullable=True)
    image_path = Column(String, nullable=True)
    detail = Column(JSON, default=dict)


class Archive(Base, AuditMixin):
    __tablename__ = "archives"

    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    dataset_name = Column(String)
    format = Column(String, nullable=False)
    archive_path = Column(String)
    split = Column(JSON)
    counts = Column(JSON)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2_sha256$200000${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt_hex, digest_hex = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(digest, expected)
    except (ValueError, AttributeError):
        return False


def init_db():
    # WAL lets readers proceed while a writer holds a transaction (e.g. a
    # large upload committing thousands of images while a batch is deleted).
    with engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        conn.exec_driver_sql("PRAGMA busy_timeout=30000")
        conn.commit()
    # Rename legacy table before create_all so it isn't recreated empty.
    with engine.connect() as conn:
        tables = {
            r[0]
            for r in conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        if "exports" in tables and "archives" not in tables:
            conn.exec_driver_sql("ALTER TABLE exports RENAME TO archives")
            conn.commit()
    Base.metadata.create_all(bind=engine)
    # Lightweight migration: create_all does not ALTER existing tables.
    with engine.connect() as conn:
        cols = {
            r[1]
            for r in conn.exec_driver_sql("PRAGMA table_info(archives)")
        }
        if "dataset_name" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE archives ADD COLUMN dataset_name VARCHAR"
            )
            conn.commit()
        batch_cols = {
            r[1] for r in conn.exec_driver_sql("PRAGMA table_info(batches)")
        }
        if "source_id" not in batch_cols:
            conn.exec_driver_sql(
                "ALTER TABLE batches ADD COLUMN source_id INTEGER "
                "REFERENCES sources(id)"
            )
            conn.commit()
        annotation_cols = {
            r[1]
            for r in conn.exec_driver_sql("PRAGMA table_info(annotations)")
        }
        if "last_attr" not in annotation_cols:
            conn.exec_driver_sql(
                "ALTER TABLE annotations ADD COLUMN last_attr INTEGER"
            )
            conn.commit()
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_activity_log_dataset_created "
            "ON activity_log (dataset_id, created_at)"
        )
        conn.commit()
