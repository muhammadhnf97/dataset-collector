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
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class AuditMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, default="system")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String, default="system", onupdate="system")


class Batch(Base, AuditMixin):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # raw | video | frames | crops
    source = Column(String)
    cover = Column(String)

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

    images = relationship("DatasetImage", back_populates="dataset")


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

    __table_args__ = (
        UniqueConstraint("dataset_id", "image_id", name="uq_annotation"),
    )


class Export(Base, AuditMixin):
    __tablename__ = "exports"

    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    format = Column(String, nullable=False)
    archive_path = Column(String)
    split = Column(JSON)
    counts = Column(JSON)


def init_db():
    Base.metadata.create_all(bind=engine)
