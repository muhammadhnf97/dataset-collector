import json
import os
import random
import re
import shutil
import subprocess
import tarfile
import zipfile
import tempfile
import threading
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote

import yaml
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from sqlalchemy import and_, func
from sqlalchemy.dialects.sqlite import insert
from db import (
    SessionLocal,
    init_db,
    hash_password,
    verify_password,
    Batch as DbBatch,
    Dataset as DbDataset,
    DatasetImage as DbDatasetImage,
    Image as DbImage,
    Annotation as DbAnnotation,
    Archive as DbArchive,
    Source as DbSource,
    User as DbUser,
    ActivityLog as DbActivityLog,
)

app = FastAPI(title="Dataset Collector API")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
RAW_IMAGES_DIR = UPLOADS_DIR / "raw-images"
DATASETS_DIR = BASE_DIR / "datasets"
TEMPLATES_DIR = BASE_DIR / "template"
ARCHIVES_DIR = BASE_DIR / "archives"

for directory in (RAW_IMAGES_DIR, DATASETS_DIR, ARCHIVES_DIR):
    directory.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Guards against lost updates when concurrent requests read-modify-write the
# same JSON file (e.g. two people annotating/assigning at the same time).
DATASETS_LOCK = threading.Lock()
_annotation_locks_guard = threading.Lock()
_annotation_locks: dict[str, threading.Lock] = {}


def annotation_lock(name: str) -> threading.Lock:
    with _annotation_locks_guard:
        if name not in _annotation_locks:
            _annotation_locks[name] = threading.Lock()
        return _annotation_locks[name]


def atomic_write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def next_raw_images_name():
    RAW_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    numbers = [
        int(m.group(1))
        for d in RAW_IMAGES_DIR.iterdir()
        if d.is_dir() and (m := re.fullmatch(r"raw-images-(\d+)", d.name))
    ]
    return f"raw-images-{max(numbers, default=0) + 1}"




def next_batch_name(parent: Path):
    parent.mkdir(parents=True, exist_ok=True)
    numbers = [
        int(m.group(1))
        for d in parent.iterdir()
        if d.is_dir() and (m := re.fullmatch(r"batch-(\d+)(?:-(?:frames|crops))?", d.name))
    ]
    return f"batch-{max(numbers, default=0) + 1}"


def next_dataset_dir_name():
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    numbers = [
        int(m.group(1))
        for d in DATASETS_DIR.iterdir()
        if d.is_dir() and (m := re.fullmatch(r"dataset-(\d+)", d.name))
    ]
    return f"dataset-{max(numbers, default=0) + 1}"


def _image_extensions(path: Path | None = None):
    return (
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".bmp",
        ".gif",
    )


DEFAULT_SPLIT = {"train": 70, "val": 20, "test": 10}


def _split_from_template(config: dict) -> dict:
    folder = config.get("folder") or {}
    ratio = folder.get("ratio") or {}
    if not ratio:
        return dict(DEFAULT_SPLIT)
    converted = {}
    for k, v in ratio.items():
        try:
            n = float(v)
        except (TypeError, ValueError):
            continue
        converted[k] = round(n * 100) if n <= 1 else int(n)
    if not converted:
        return dict(DEFAULT_SPLIT)
    return converted


def _load_manifest(manifest_path: Path):
    if not manifest_path.exists():
        return None
    try:
        return json.loads(manifest_path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _save_manifest(dir_name: str, data: dict):
    manifest_path = DATASETS_DIR / dir_name / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "name": data.get("name", dir_name),
        "framework": data.get("framework") or "",
        "model": data.get("model") or "",
    }
    atomic_write_json(manifest_path, manifest)


def _normalize_template_path(framework: str, model: str) -> str:
    return "/".join(p.lower() for p in [framework, model] if p)


def load_datasets():
    db = SessionLocal()
    try:
        if db.query(DbDataset).count() == 0 and DATASETS_DIR.is_dir():
            for d in sorted(DATASETS_DIR.iterdir()):
                if not d.is_dir() or not re.fullmatch(r"dataset-(\d+)", d.name):
                    continue
                manifest = _load_manifest(d / "manifest.json")
                if not manifest:
                    continue
                # Migrate old manifests that used model/category to framework/model
                if "category" in manifest and "framework" not in manifest:
                    manifest = {
                        "name": manifest.get("name"),
                        "framework": manifest.get("model") or "",
                        "model": manifest.get("category") or "",
                    }
                name = manifest.get("name") or d.name
                ds = DbDataset(
                    name=name,
                    dir_name=d.name,
                    framework=(manifest.get("framework") or "").strip(),
                    model=(manifest.get("model") or "").strip(),
                    split=dict(DEFAULT_SPLIT),
                )
                db.add(ds)
            db.commit()

        datasets = {}
        for ds in db.query(DbDataset).all():
            dataset_dir = DATASETS_DIR / ds.dir_name
            batches = [
                txt.stem
                for txt in sorted(dataset_dir.glob("*.txt"))
            ] if dataset_dir.is_dir() else []
            datasets[ds.name] = {
                "name": ds.name,
                "framework": ds.framework or "",
                "model": ds.model or "",
                "dir": ds.dir_name,
                "split": ds.split,
                "batches": batches,
            }
        return datasets
    finally:
        db.close()


def save_datasets(data: dict):
    db = SessionLocal()
    try:
        existing = {d.name: d for d in db.query(DbDataset).all()}
        seen = set()
        for name, entry in data.items():
            seen.add(name)
            ds = existing.get(name)
            if ds is None:
                ds = DbDataset(name=name)
                db.add(ds)
            ds.framework = (entry.get("framework") or "").strip()
            ds.model = (entry.get("model") or "").strip()
            if entry.get("dir"):
                ds.dir_name = entry["dir"]
            if "split" in entry and entry["split"]:
                ds.split = entry["split"]
        for name, ds in list(existing.items()):
            if name not in seen:
                db.query(DbDatasetImage).filter_by(dataset_id=ds.id).delete()
                db.query(DbAnnotation).filter_by(dataset_id=ds.id).delete()
                db.delete(ds)
        db.commit()
    finally:
        db.close()


_model = None


def get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO

        _model = YOLO("yolo26l.pt")
    return _model


@app.get("/")
def root():
    return {"message": "Dataset Collector API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}



IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


@app.post("/upload/tar")
def _process_uploaded_files(tmp_path: Path, source_id: int | None = None):
    saved_images = []
    folders = {}
    batches = []
    batch_objs = {}
    db = SessionLocal()

    # A single top-level dir that only contains subdirs is a wrapper
    # (e.g. "tracklets/CH0001/...") — strip it so batches take the next level.
    files = [
        item
        for item in sorted(tmp_path.rglob("*"))
        if item.is_file() and not item.name.startswith("._")
    ]
    top_dirs = {
        item.relative_to(tmp_path).parts[0]
        for item in files
        if len(item.relative_to(tmp_path).parts) > 1
    }
    wrapper = None
    if len(top_dirs) == 1:
        only = next(iter(top_dirs))
        has_direct_files = any(
            len(item.relative_to(tmp_path).parts) == 2
            for item in files
            if item.relative_to(tmp_path).parts[0] == only
        )
        if not has_direct_files:
            wrapper = only

    try:
        for item in files:
            rel = item.relative_to(tmp_path)
            parts = rel.parts
            if wrapper and parts[0] == wrapper:
                parts = parts[1:]
            source_name = parts[0] if len(parts) > 1 else ""
            ext = item.suffix.lower()
            if ext in IMAGE_EXTENSIONS:
                if source_name not in folders:
                    if source_name:
                        batch_name = source_name
                    else:
                        batch_name = next_batch_name(RAW_IMAGES_DIR)
                    batch_dir = RAW_IMAGES_DIR / batch_name
                    batch_dir.mkdir(parents=True, exist_ok=True)
                    folders[source_name] = {"batch_name": batch_name, "batch_dir": batch_dir, "index": 1}
                    batches.append(batch_name)
                state = folders[source_name]
                batch_name = state["batch_name"]
                batch_dir = state["batch_dir"]
                i = state["index"]
                dest = batch_dir / f"{batch_name}-{i}{ext}"
                while dest.exists():
                    i += 1
                    dest = batch_dir / f"{batch_name}-{i}{ext}"
                shutil.move(str(item), dest)
                state["index"] = i + 1

                image_path = f"/uploads/raw-images/{batch_name}/{dest.name}"

                batch = batch_objs.get(batch_name)
                if batch is None:
                    batch = db.query(DbBatch).filter_by(name=batch_name).first()
                    if batch is None:
                        batch = DbBatch(
                            name=batch_name,
                            type="raw",
                            source=source_name or None,
                            source_id=source_id,
                        )
                        db.add(batch)
                        db.flush()
                    elif batch.source_id is None:
                        batch.source_id = source_id
                    batch_objs[batch_name] = batch

                db_image = DbImage(
                    batch_id=batch.id,
                    path=image_path,
                    filename=dest.name,
                    width=None,
                    height=None,
                )
                db.add(db_image)
                if not batch.cover:
                    batch.cover = image_path

                saved_images.append(image_path)

        db.commit()
    finally:
        db.close()

    return {
        "batch": f"raw-images/{batches[0]}" if batches else None,
        "batches": [f"raw-images/{b}" for b in batches],
        "images": saved_images,
        "image_count": len(saved_images),
    }


@app.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    source_id: int | None = Form(None),
):
    filename = file.filename or ""
    lowered = filename.lower()

    if any(
        lowered.endswith(ext)
        for ext in (".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz")
    ):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            try:
                with tarfile.open(fileobj=file.file) as tar:
                    tar.extractall(tmp_path, filter="data")
            except tarfile.TarError:
                raise HTTPException(status_code=400, detail="Invalid tar archive")
            return await run_in_threadpool(
                _process_uploaded_files, tmp_path, source_id
            )

    if lowered.endswith(".zip"):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            extract_dir = tmp_path / "extracted"
            extract_dir.mkdir()
            archive_path = tmp_path / "archive.zip"
            try:
                file.file.seek(0)
                with archive_path.open("wb") as archive:
                    shutil.copyfileobj(file.file, archive)
                with zipfile.ZipFile(archive_path) as zf:
                    zf.extractall(extract_dir)
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Invalid zip archive")
            return await run_in_threadpool(
                _process_uploaded_files, extract_dir, source_id
            )

    if lowered.endswith(".rar"):
        try:
            import rarfile
        except ImportError:
            raise HTTPException(
                status_code=400,
                detail="RAR support not installed (pip install rarfile)",
            )
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            try:
                with rarfile.RarFile(file.file) as rf:
                    rf.extractall(tmp_path)
            except rarfile.Error:
                raise HTTPException(status_code=400, detail="Invalid rar archive")
            return await run_in_threadpool(
                _process_uploaded_files, tmp_path, source_id
            )

    ext = Path(filename).suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        parent = Path(filename).parent
        source_name = parent.name if parent != Path(".") else ""
        batch_name = source_name if source_name else next_batch_name(RAW_IMAGES_DIR)
        batch_dir = RAW_IMAGES_DIR / batch_name
        batch_dir.mkdir(parents=True, exist_ok=True)
        i = 1
        dest = batch_dir / f"{batch_name}-{i}{ext}"
        while dest.exists():
            i += 1
            dest = batch_dir / f"{batch_name}-{i}{ext}"
        content = await file.read()
        dest.write_bytes(content)

        image_path = f"/uploads/raw-images/{batch_name}/{dest.name}"
        db = SessionLocal()
        try:
            batch = db.query(DbBatch).filter_by(name=batch_name).first()
            if batch is None:
                batch = DbBatch(
                    name=batch_name,
                    type="raw",
                    source=source_name or None,
                    source_id=source_id,
                )
                db.add(batch)
                db.flush()
            elif batch.source_id is None:
                batch.source_id = source_id
            db_image = DbImage(
                batch_id=batch.id,
                path=image_path,
                filename=dest.name,
                width=None,
                height=None,
            )
            db.add(db_image)
            if not batch.cover:
                batch.cover = image_path
            db.commit()
        finally:
            db.close()

        return {
            "batch": f"raw-images/{batch_name}",
            "images": [image_path],
            "image_count": 1,
        }

    raise HTTPException(status_code=400, detail="Unsupported file type")



@app.get("/classes")
def list_classes():
    model = get_model()
    return {"classes": sorted(set(model.names.values()))}



@app.post("/raw-images/{source:path}/generate")
def generate_raw_images(source: str, payload: dict):
    mode = payload.get("mode", "use")
    if mode not in ("use", "crops"):
        raise HTTPException(status_code=400, detail="mode must be 'use' or 'crops'")
    margin = max(0, int(payload.get("margin", 0)))
    classes = payload.get("classes", "")
    confidence = float(payload.get("confidence", 0.7))

    source_dir = (UPLOADS_DIR / source).resolve()
    if (
        not source_dir.is_dir()
        or not source_dir.is_relative_to(UPLOADS_DIR.resolve())
    ):
        raise HTTPException(status_code=404, detail="Source not found")

    source_name = source_dir.name
    batch_name = f"{source_name}-{mode}"
    batch_dir = RAW_IMAGES_DIR / batch_name
    if batch_dir.exists():
        batch_name = f"{batch_name}-{uuid.uuid4().hex[:4]}"
        batch_dir = RAW_IMAGES_DIR / batch_name
    batch_dir.mkdir(parents=True)
    remove_source = bool(payload.get("remove_source", False))

    files = [
        p
        for p in source_dir.iterdir()
        if p.is_file() and p.name != ".source" and p.suffix.lower() in _image_extensions()
    ]
    if not files:
        return {"count": 0, "images": []}

    selected_classes = {c.strip() for c in classes.split(",") if c.strip()}
    urls = []

    if mode == "use":
        for i, f in enumerate(files, 1):
            dest = batch_dir / f"{batch_name}-{i}{f.suffix}"
            shutil.copy2(f, dest)
            urls.append(f"/uploads/{dest.relative_to(UPLOADS_DIR)}")
        if remove_source:
            shutil.rmtree(source_dir)

        db = SessionLocal()
        try:
            source_batch = db.query(DbBatch).filter_by(name=source_name).first()
            parent_source_id = source_batch.source_id if source_batch else None
            if remove_source and source_batch:
                for img in list(source_batch.images):
                    db.delete(img)
                db.delete(source_batch)

            new_type = "raw"
            new_batch = DbBatch(
                name=batch_name,
                type=new_type,
                source=source_name,
                source_id=parent_source_id,
                cover=urls[0] if urls else None,
            )
            db.add(new_batch)
            db.flush()
            for url in urls:
                db.add(
                    DbImage(
                        batch_id=new_batch.id,
                        path=url,
                        filename=Path(url).name,
                    )
                )
            db.commit()
        finally:
            db.close()

        return {"count": len(urls), "images": urls, "batch": str(batch_dir.relative_to(UPLOADS_DIR))}

    model = get_model()
    crop_index = 0
    for img_path in files:
        image = Image.open(img_path)
        results = model(str(img_path), verbose=False)
        boxes = results[0].boxes if results else None
        if boxes is None or len(boxes) == 0:
            continue
        for box, conf, cls in zip(
            boxes.xyxy.tolist(),
            boxes.conf.tolist(),
            boxes.cls.tolist(),
        ):
            if conf <= confidence:
                continue
            if (
                selected_classes
                and model.names[int(cls)] not in selected_classes
            ):
                continue
            x1, y1, x2, y2 = (int(v) for v in box)
            w, h = image.size
            x1 = max(0, x1 - margin)
            y1 = max(0, y1 - margin)
            x2 = min(w, x2 + margin)
            y2 = min(h, y2 + margin)
            crop = image.crop((x1, y1, x2, y2))
            crop_index += 1
            name = f"{batch_name}-{crop_index}.jpg"
            dest = batch_dir / name
            crop.save(dest, "JPEG", quality=95)
            urls.append(f"/uploads/{dest.relative_to(UPLOADS_DIR)}")

    if remove_source:
        shutil.rmtree(source_dir)

    db = SessionLocal()
    try:
        source_batch = db.query(DbBatch).filter_by(name=source_name).first()
        parent_source_id = source_batch.source_id if source_batch else None
        if remove_source and source_batch:
            for img in list(source_batch.images):
                db.delete(img)
            db.delete(source_batch)

        new_batch = DbBatch(
            name=batch_name,
            type="crops",
            source=source_name,
            source_id=parent_source_id,
            cover=urls[0] if urls else None,
        )
        db.add(new_batch)
        db.flush()
        for url in urls:
            db.add(
                DbImage(
                    batch_id=new_batch.id,
                    path=url,
                    filename=Path(url).name,
                )
            )
        db.commit()
    finally:
        db.close()

    return {"count": len(urls), "images": urls, "batch": str(batch_dir.relative_to(UPLOADS_DIR))}


@app.post("/split-imports")
def split_imports(payload: dict):
    count = max(1, int(payload.get("count", 2)))
    source = payload.get("source")
    if not source:
        raise HTTPException(status_code=400, detail="Source batch required")
    source_dir = (UPLOADS_DIR / source).resolve()
    if (
        not source_dir.is_dir()
        or not source_dir.is_relative_to(UPLOADS_DIR.resolve())
    ):
        raise HTTPException(status_code=404, detail="Source batch not found")

    files = [p for p in source_dir.iterdir() if p.is_file() and p.name != ".source"]
    if not files:
        return {"moved": 0, "batches": []}

    n = min(count, len(files))
    parent = source_dir.parent
    batch_dirs = []
    for i in range(n):
        name = f"{source_dir.name}-{i + 1}"
        batch_dir = parent / name
        if batch_dir.exists():
            batch_dir = parent / f"{name}-{uuid.uuid4().hex[:4]}"
        batch_dir.mkdir(parents=True)
        batch_dirs.append(batch_dir)

    for index, file in enumerate(files):
        target_dir = batch_dirs[index % n]
        dest = target_dir / file.name
        if dest.exists():
            dest = target_dir / f"{uuid.uuid4().hex}_{file.name}"
        file.rename(dest)

    if source_dir.is_dir() and not any(source_dir.iterdir()):
        source_dir.rmdir()

    return {
        "moved": len(files),
        "batches": [str(d.relative_to(UPLOADS_DIR)) for d in batch_dirs],
    }


@app.delete("/batches/{name:path}")
def delete_batch(name: str):
    name = unquote(name)
    parts = [p for p in name.split("/") if p]
    if not parts:
        raise HTTPException(status_code=400, detail="Invalid batch name")
    batch_name = parts[-1]
    batch_dir = (UPLOADS_DIR / name).resolve()
    if (
        not batch_dir.is_relative_to(UPLOADS_DIR.resolve())
        or batch_dir == UPLOADS_DIR.resolve()
    ):
        raise HTTPException(status_code=400, detail="Invalid batch path")

    db = SessionLocal()
    try:
        db_batch = db.query(DbBatch).filter_by(name=batch_name).first()
        if not db_batch and not batch_dir.is_dir():
            raise HTTPException(status_code=404, detail="Batch not found")

        if db_batch:
            for img in list(db_batch.images):
                db.query(DbDatasetImage).filter_by(image_id=img.id).delete()
                db.query(DbAnnotation).filter_by(image_id=img.id).delete()
                db.delete(img)
            db.delete(db_batch)
            db.commit()

        if batch_dir.is_dir():
            shutil.rmtree(batch_dir)
    finally:
        db.close()

    return {"deleted": name}


@app.delete("/batches/by-id/{id}")
def delete_batch_by_id(id: int):
    db = SessionLocal()
    try:
        batch = db.query(DbBatch).get(id)
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        for img in list(batch.images):
            db.query(DbDatasetImage).filter_by(image_id=img.id).delete()
            db.query(DbAnnotation).filter_by(image_id=img.id).delete()
            db.delete(img)

        batch_dir = (RAW_IMAGES_DIR / batch.name).resolve()
        if not batch_dir.is_relative_to(UPLOADS_DIR.resolve()):
            raise HTTPException(status_code=400, detail="Invalid batch path")

        db.delete(batch)
        db.commit()

        if batch_dir.is_dir():
            shutil.rmtree(batch_dir)
    finally:
        db.close()

    return {"deleted": id}


def _dataset_summary(name: str, entry: dict):
    split = entry.get("split") or dict(DEFAULT_SPLIT)
    framework = (entry.get("framework") or "").strip()
    model = (entry.get("model") or "").strip()
    if framework and model:
        try:
            config = load_template_config(_normalize_template_path(framework, model))
            split = _split_from_template(config)
        except HTTPException:
            pass

    batches = []
    previews = []
    last_annotated_at = None
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if db_dataset:
            for db_batch in (
                db.query(DbBatch)
                .join(DbDatasetImage)
                .filter(DbDatasetImage.dataset_id == db_dataset.id)
                .distinct()
                .order_by(DbBatch.name)
                .all()
            ):
                display = f"raw-images/{db_batch.name}"
                batches.append(display.replace("/", "_"))
                if not previews:
                    first_image = (
                        db.query(DbImage)
                        .filter(DbImage.batch_id == db_batch.id)
                        .order_by(DbImage.path)
                        .first()
                    )
                    if first_image:
                        previews.append(first_image.path)

            latest = (
                db.query(func.max(DbAnnotation.updated_at))
                .filter(DbAnnotation.dataset_id == db_dataset.id)
                .scalar()
            )
            if latest:
                last_annotated_at = latest.isoformat() + "Z"
    finally:
        db.close()

    return {
        "name": name,
        "framework": entry.get("framework") or "",
        "model": entry.get("model") or "",
        "batches": batches,
        "previews": previews,
        "split": split,
        "last_annotated_at": last_annotated_at,
    }


def list_template_names():
    if not TEMPLATES_DIR.is_dir():
        return []
    names = []
    for config_path in TEMPLATES_DIR.rglob("config.yaml"):
        rel = config_path.parent.relative_to(TEMPLATES_DIR)
        if rel == Path("."):
            continue
        names.append(rel.as_posix())
    return sorted(names)


def load_template_config(template_name: str):
    template_name = unquote(template_name).lower()
    config_path = (TEMPLATES_DIR / template_name / "config.yaml").resolve()
    if (
        not config_path.is_relative_to(TEMPLATES_DIR.resolve())
        or not config_path.exists()
    ):
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    return yaml.safe_load(config_path.read_text()) or {}


@app.get("/templates")
def get_templates():
    templates = []
    for name in list_template_names():
        config = load_template_config(name)
        framework = (
            config.get("framework-name")
            or name.split("/", 1)[0]
            if "/" in name
            else name
        )
        label = config.get("model-name") or config.get("model-category") or name
        templates.append({"name": name, "label": label, "framework": framework})
    return {"templates": templates}


@app.get("/templates/{name:path}/attributes")
def get_template_attributes(name: str):
    config = load_template_config(name)
    return {"template": name, "attributes": config.get("attributes", [])}


@app.get("/datasets")
def list_datasets():
    datasets = load_datasets()
    return {"datasets": [_dataset_summary(n, e) for n, e in datasets.items()]}


@app.post("/datasets")
def create_dataset(payload: dict):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Dataset name required")

    framework = (payload.get("framework") or "").strip()
    model = (payload.get("model") or "").strip()
    template = (payload.get("template") or "").strip()
    if not framework and not model and template:
        config = load_template_config(template)
        framework = (config.get("framework-name") or "").strip()
        model = (config.get("model-name") or "").strip()

    with DATASETS_LOCK:
        datasets = load_datasets()
        if name in datasets:
            raise HTTPException(status_code=400, detail="Dataset already exists")
        dataset_dir_name = next_dataset_dir_name()
        (DATASETS_DIR / dataset_dir_name).mkdir(parents=True)
        db = SessionLocal()
        try:
            db.add(
                DbDataset(
                    name=name,
                    dir_name=dataset_dir_name,
                    framework=framework,
                    model=model,
                    split=dict(DEFAULT_SPLIT),
                )
            )
            db.commit()
        finally:
            db.close()
    return {"dataset": name}


@app.get("/datasets/{name}")
def get_dataset(name: str):
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return _dataset_summary(name, datasets[name])


@app.delete("/datasets/{name}")
def delete_dataset(name: str):
    if any(c in name for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid dataset name")
    with DATASETS_LOCK:
        datasets = load_datasets()
        if name not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        dataset_dir_name = datasets[name].get("dir")
        del datasets[name]
        save_datasets(datasets)
    if dataset_dir_name:
        dataset_dir = DATASETS_DIR / dataset_dir_name
        if dataset_dir.exists():
            shutil.rmtree(dataset_dir)
    return {"deleted": name}


@app.post("/datasets/{name:path}/import")
def import_dataset_batch(name: str, payload: dict):
    name = unquote(name)
    batch_ids = payload.get("batch_ids") or []
    batches = payload.get("batches") or []
    if not batch_ids and not batches:
        single = (payload.get("batch") or "").strip()
        if single:
            batches = [single]
    if not batch_ids and not batches:
        raise HTTPException(status_code=400, detail="Batches required")

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        framework = (db_dataset.framework or "").strip()
        model = (db_dataset.model or "").strip()
        if not framework or not model:
            raise HTTPException(status_code=400, detail="Dataset framework/model not set")
        config = load_template_config(
            _normalize_template_path(framework, model)
        )
        attributes = config.get("attributes", [])
        if not attributes:
            raise HTTPException(status_code=400, detail="Template has no attributes")

        existing_images = {
            di.image_id
            for di in db.query(DbDatasetImage)
            .filter_by(dataset_id=db_dataset.id)
            .all()
        }

        target_batches = []
        if batch_ids:
            for bid in batch_ids:
                try:
                    bid = int(bid)
                except (TypeError, ValueError):
                    continue
                db_batch = db.query(DbBatch).filter_by(id=bid).first()
                if db_batch:
                    target_batches.append(db_batch)
        elif batches:
            for batch in batches:
                batch = (batch or "").strip()
                if not batch:
                    continue
                batch_path = Path(batch)
                if batch_path.parts[0] == "raw-images" and len(batch_path.parts) > 1:
                    db_batch = (
                        db.query(DbBatch)
                        .filter_by(name=batch_path.name, type="raw")
                        .first()
                    )
                else:
                    db_batch = db.query(DbBatch).filter_by(name=batch).first()
                if db_batch:
                    target_batches.append(db_batch)

        total = 0
        results = []
        for db_batch in target_batches:
            added = 0
            for db_image in db_batch.images:
                if db_image.id in existing_images:
                    continue
                db.add(
                    DbDatasetImage(
                        dataset_id=db_dataset.id,
                        image_id=db_image.id,
                        batch_id=db_batch.id,
                    )
                )
                existing_images.add(db_image.id)
                added += 1
            results.append({"name": db_batch.name, "count": added})
            total += added

        db.commit()
    finally:
        db.close()

    if not results:
        raise HTTPException(status_code=404, detail="No valid batches found")
    return {
        "batches": [r["name"] for r in results],
        "count": total,
    }


@app.post("/datasets/{name}/template")
def set_dataset_template(name: str, payload: dict):
    template_name = (payload.get("template") or "").strip()
    if not template_name:
        raise HTTPException(status_code=400, detail="Template name required")
    if template_name not in list_template_names():
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    config = load_template_config(template_name)
    framework = (config.get("framework-name") or "").strip()
    model = (config.get("model-name") or "").strip()
    with DATASETS_LOCK:
        datasets = load_datasets()
        if name not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        entry = datasets[name]
        entry["framework"] = framework
        entry["model"] = model
        save_datasets(datasets)
    return {"dataset": name, "framework": framework, "model": model}


@app.patch("/datasets/{name:path}/settings")
def update_dataset_settings(name: str, payload: dict):
    from urllib.parse import unquote
    name = unquote(name)
    new_name = (payload.get("name") or "").strip()
    template = (payload.get("template") or "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Dataset name is required")

    framework = ""
    model = ""
    if template:
        config = load_template_config(template)
        framework = (config.get("framework-name") or "").strip()
        model = (config.get("model-name") or "").strip()
    if not framework or not model:
        framework = (payload.get("framework") or "").strip()
        model = (payload.get("model") or "").strip()
    if not framework or not model:
        raise HTTPException(status_code=400, detail="Model template is required")

    db = SessionLocal()
    try:
        ds = db.query(DbDataset).filter_by(name=name).first()
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if new_name != name and db.query(DbDataset).filter_by(name=new_name).first():
            raise HTTPException(status_code=400, detail="Dataset name already exists")
        ds.name = new_name
        ds.framework = framework
        ds.model = model
        dir_name = ds.dir_name
        db.commit()
    finally:
        db.close()

    manifest = _load_manifest(DATASETS_DIR / dir_name / "manifest.json") or {}
    manifest["name"] = new_name
    manifest["framework"] = framework
    manifest["model"] = model
    manifest_path = DATASETS_DIR / dir_name / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(manifest, f)

    return {"dataset": new_name, "framework": framework, "model": model}


def _create_prelabel_predictor(model_dir: Path):
    try:
        import paddle
        from paddle.inference import Config, create_predictor
    except ImportError as e:
        raise HTTPException(
            status_code=400,
            detail=f"PaddlePaddle not installed: {e}",
        )

    model_file = next((p for p in model_dir.rglob("inference.pdmodel")), None)
    params_file = next((p for p in model_dir.rglob("inference.pdiparams")), None)
    if not model_file or not params_file:
        raise HTTPException(status_code=404, detail="Model pdmodel/pdiparams not found")

    config = Config(str(model_file), str(params_file))
    config.disable_gpu()
    config.enable_mkldnn()
    config.set_cpu_math_library_num_threads(10)
    config.disable_glog_info()
    config.switch_ir_optim(True)
    config.enable_memory_optim()
    config.switch_use_feed_fetch_ops(False)
    config.switch_ir_optim(True)

    predictor = create_predictor(config)
    input_names = predictor.get_input_names()
    input_tensor = predictor.get_input_handle(input_names[0])
    output_names = predictor.get_output_names()
    output_tensor = predictor.get_output_handle(output_names[0])

    return predictor, input_tensor, output_tensor


def _prelabel_image(image_path: Path, model_parts) -> list[int]:
    import cv2
    import numpy as np

    predictor, input_tensor, output_tensor = model_parts
    img = cv2.imread(str(image_path))
    if img is None:
        raise HTTPException(status_code=400, detail=f"Cannot read image {image_path}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (192, 256), interpolation=cv2.INTER_LINEAR)
    img = img.astype(np.float32) / 255.0
    img = (img - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
    img = img.transpose((2, 0, 1))
    batch = np.expand_dims(img, axis=0).astype("float32")

    input_tensor.copy_from_cpu(batch)
    predictor.run()
    output = output_tensor.copy_to_cpu()

    res = output[0].tolist()
    threshold_list = [0.5] * len(res)
    threshold_list[1] = 0.3   # glasses
    threshold_list[18] = 0.6  # hold objects in front
    return [int(v > t) for v, t in zip(res, threshold_list)]


@app.post("/datasets/{name:path}/prelabel")
def prelabel_dataset(name: str, payload: dict = Body(default={})):
    name = unquote(name)
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    entry = datasets[name]
    dir_name = entry.get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")

    framework = (entry.get("framework") or "").strip()
    model = (entry.get("model") or "").strip()
    if not framework or not model:
        raise HTTPException(status_code=400, detail="Dataset framework/model not set")

    config = load_template_config(_normalize_template_path(framework, model))
    prelabel_file = (config.get("pre-label-model") or "").strip()
    if not prelabel_file:
        raise HTTPException(status_code=400, detail="No pre-label model configured")

    template_slug = _normalize_template_path(framework, model)
    tar_path = (TEMPLATES_DIR / template_slug / prelabel_file).resolve()
    if not tar_path.is_relative_to(TEMPLATES_DIR.resolve()) or not tar_path.exists():
        raise HTTPException(status_code=404, detail="Pre-label model file not found")

    dataset_dir = DATASETS_DIR / dir_name
    model_dir = dataset_dir / "pre-label-model"
    if model_dir.exists():
        shutil.rmtree(model_dir)
    model_dir.mkdir(parents=True)
    with tarfile.open(tar_path, "r") as tar:
        tar.extractall(model_dir, filter="data")

    selected_batch = (payload.get("batch") or "").strip()
    target_batch_id = None
    if selected_batch:
        if selected_batch.startswith("raw-images_"):
            selected_batch = selected_batch.replace("raw-images_", "raw-images/", 1)
        batch_name = Path(selected_batch).name
        db = SessionLocal()
        try:
            db_batch = db.query(DbBatch).filter_by(name=batch_name).first()
            if not db_batch:
                raise HTTPException(status_code=404, detail="Batch not found")
            target_batch_id = db_batch.id
        finally:
            db.close()

    write_values = payload.get("write_values", True)

    # Only images actually processed by this run get written. Do NOT reuse the
    # full dataset-wide load_annotations() dict here — passing it to
    # save_annotations/save_prelabels would re-write every batch's rows
    # (bumping updated_at/updated_by) even though their content is unchanged.
    processed = {}
    count = 0
    model_parts = _create_prelabel_predictor(model_dir)
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if db_dataset:
            query = (
                db.query(DbImage)
                .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
                .filter(DbDatasetImage.dataset_id == db_dataset.id)
            )
            if target_batch_id is not None:
                query = query.filter(DbImage.batch_id == target_batch_id)
            for db_image in query.all():
                img_path = (
                    UPLOADS_DIR / db_image.path.removeprefix("/uploads/")
                ).resolve()
                if (
                    not img_path.is_file()
                    or not img_path.is_relative_to(UPLOADS_DIR.resolve())
                ):
                    continue
                values = _prelabel_image(img_path, model_parts)
                processed[db_image.path] = values
                count += 1
    finally:
        db.close()

    if write_values:
        save_annotations(dir_name, processed)
    save_prelabels(dir_name, processed)

    user_name = (payload.get("user") or "").strip() or "system"
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        log_activity(
            db,
            user_name,
            "prelabel",
            dataset_id=db_dataset.id if db_dataset else None,
            dataset_name=name,
            detail={"batch": payload.get("batch") or None, "images": count, "write_values": write_values},
        )
        db.commit()
    finally:
        db.close()

    return {
        "dataset": name,
        "batch": payload.get("batch") or None,
        "images": count,
        "write_values": write_values,
    }


@app.post("/datasets/{name:path}/images/remove")
def remove_dataset_image(name: str, payload: dict):
    name = unquote(name)
    images = payload.get("images")
    if isinstance(images, list):
        image_paths = [str(p).strip() for p in images if str(p).strip()]
    else:
        single = (payload.get("image") or "").strip()
        image_paths = [single] if single else []
    if not image_paths:
        raise HTTPException(status_code=400, detail="Image path(s) required")
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dir_name = datasets[name].get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")

    removed = 0
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        db_images = (
            db.query(DbImage).filter(DbImage.path.in_(image_paths)).all()
        )
        if db_dataset and db_images:
            image_ids = [img.id for img in db_images]
            removed += db.query(DbDatasetImage).filter(
                DbDatasetImage.dataset_id == db_dataset.id,
                DbDatasetImage.image_id.in_(image_ids),
            ).delete(synchronize_session=False)
            removed += db.query(DbAnnotation).filter(
                DbAnnotation.dataset_id == db_dataset.id,
                DbAnnotation.image_id.in_(image_ids),
            ).delete(synchronize_session=False)
            log_activity(
                db,
                (payload.get("user") or "").strip() or "root",
                "remove_image",
                dataset_id=db_dataset.id,
                dataset_name=name,
                detail={"count": len(image_paths)},
            )
            db.commit()
    finally:
        db.close()

    return {"removed": removed}


_PHASH_CACHE = {}


def _phash64(path: Path):
    import cv2
    import numpy as np

    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    img = cv2.resize(img, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    low = cv2.dct(img)[:8, :8].flatten()
    med = np.median(low[1:])
    h = 0
    for b in low > med:
        h = (h << 1) | int(b)
    return h


def _cluster_hashes(items, threshold):
    import numpy as np

    parent = list(range(len(items)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    hashes = np.array([h for _, h in items], dtype=np.uint64)
    hash_bytes = hashes.view(np.uint8).reshape(len(items), 8)
    for i in range(len(items)):
        dist = np.unpackbits(np.bitwise_xor(hash_bytes[i], hash_bytes), axis=1).sum(axis=1)
        for j in np.nonzero(dist <= threshold)[0]:
            j = int(j)
            if j > i:
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[ri] = rj

    groups = {}
    for i in range(len(items)):
        groups.setdefault(find(i), []).append(items[i][0])
    return list(groups.values())


@app.get("/datasets/{name:path}/images/similar")
def dataset_similar_images(name: str, batch: str, threshold: int = 6):
    name = unquote(name)
    batch_name = Path(unquote(batch)).name
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not datasets[name].get("dir"):
        raise HTTPException(status_code=404, detail="Dataset not found")

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        paths = [
            row.path
            for row in db.query(DbImage)
            .join(DbBatch, DbImage.batch_id == DbBatch.id)
            .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
            .filter(DbDatasetImage.dataset_id == db_dataset.id)
            .filter(DbBatch.name == batch_name)
            .order_by(DbImage.path)
            .all()
        ]
    finally:
        db.close()

    uploads_root = UPLOADS_DIR.resolve()
    items = []
    for p in paths:
        target = (UPLOADS_DIR / p.removeprefix("/uploads/")).resolve()
        if not target.is_relative_to(uploads_root) or not target.is_file():
            continue
        mtime = target.stat().st_mtime_ns
        cached = _PHASH_CACHE.get(str(target))
        if cached and cached[0] == mtime:
            h = cached[1]
        else:
            h = _phash64(target)
            if h is not None:
                _PHASH_CACHE[str(target)] = (mtime, h)
        if h is not None:
            items.append((p, h))

    clusters_raw = _cluster_hashes(items, max(0, min(32, threshold)))
    clusters = sorted(
        (sorted(c) for c in clusters_raw if len(c) >= 2),
        key=len,
        reverse=True,
    )
    clustered = {p for c in clusters for p in c}
    singles = [p for p, _ in items if p not in clustered]
    return {
        "dataset": name,
        "batch": batch_name,
        "hashed": len(items),
        "clusters": clusters,
        "singles": singles,
    }


@app.post("/datasets/{name:path}/batches/{batch:path}/remove")
def remove_dataset_batch(name: str, batch: str):
    name = unquote(name)
    batch = unquote(batch)
    if not batch or any(c in batch for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid batch")
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dir_name = datasets[name].get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")

    display = batch.replace("_", "/")
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        if display.startswith("raw-images/") and len(Path(display).parts) > 1:
            batch_name = Path(display).name
            db_batch = db.query(DbBatch).filter_by(name=batch_name).first()
        else:
            db_batch = db.query(DbBatch).filter_by(name=display).first()

        if not db_batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        removed = 0
        for db_image_id, in (
            db.query(DbImage.id)
            .filter(DbImage.batch_id == db_batch.id)
            .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
            .filter(DbDatasetImage.dataset_id == db_dataset.id)
            .all()
        ):
            removed += db.query(DbDatasetImage).filter_by(
                dataset_id=db_dataset.id, image_id=db_image_id
            ).delete()
            removed += db.query(DbAnnotation).filter_by(
                dataset_id=db_dataset.id, image_id=db_image_id
            ).delete()
        db.commit()
    finally:
        db.close()

    return {"removed": removed}


@app.get("/datasets/{name:path}/images")
def get_dataset_images(
    name: str,
    batch: str | None = None,
    page: int = 0,
    limit: int = 200,
    counts: bool = False,
):
    name = unquote(name)
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    entry = datasets[name]
    dir_name = entry.get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            return {
                "dataset": name,
                "groups": {},
                "batch_sources": {},
                "counts": {},
            }

        if counts:
            rows = (
                db.query(
                    DbBatch,
                    func.count(DbImage.id.distinct()),
                    func.count(DbAnnotation.id.distinct()),
                )
                .join(DbImage, DbImage.batch_id == DbBatch.id)
                .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
                .outerjoin(
                    DbAnnotation,
                    and_(
                        DbAnnotation.image_id == DbImage.id,
                        DbAnnotation.dataset_id == db_dataset.id,
                    ),
                )
                .filter(DbDatasetImage.dataset_id == db_dataset.id)
                .group_by(DbBatch.id)
                .order_by(DbBatch.name)
                .all()
            )
            counts_out = {}
            batch_sources = {}
            for db_batch, total, annotated in rows:
                stem = f"raw-images_{db_batch.name}"
                counts_out[stem] = {"total": total, "annotated": annotated}
                src = _source_dict(db_batch.source_ref)
                if src:
                    batch_sources[stem] = src
            return {
                "dataset": name,
                "counts": counts_out,
                "batch_sources": batch_sources,
            }

        if batch is not None:
            batch_name = Path(unquote(batch)).name
            base_query = (
                db.query(DbImage)
                .join(DbBatch, DbImage.batch_id == DbBatch.id)
                .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
                .filter(DbDatasetImage.dataset_id == db_dataset.id)
                .filter(DbBatch.name == batch_name)
            )
            total = base_query.count()
            page = max(0, page)
            limit = max(0, min(5000, limit))
            query = base_query.order_by(DbImage.path)
            if limit:
                query = query.offset(page * limit).limit(limit)
            image_rows = query.all()
            return {
                "dataset": name,
                "batch": f"raw-images_{batch_name}",
                "images": [row.path for row in image_rows],
                "total": total,
                "page": page,
                "limit": limit,
            }

        groups = {}
        seen = set()
        batch_sources = {}
        for row in (
            db.query(DbImage, DbBatch)
            .join(DbBatch, DbImage.batch_id == DbBatch.id)
            .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
            .filter(DbDatasetImage.dataset_id == db_dataset.id)
            .order_by(DbImage.path)
            .all()
        ):
            db_image, db_batch = row
            display = f"raw-images/{db_batch.name}"
            stem = display.replace("/", "_")
            if stem not in groups:
                groups[stem] = []
                src = _source_dict(db_batch.source_ref)
                if src:
                    batch_sources[stem] = src
            if db_image.path not in seen:
                seen.add(db_image.path)
                groups[stem].append(db_image.path)
    finally:
        db.close()
    return {
        "dataset": name,
        "groups": groups,
        "batch_sources": batch_sources,
    }


def annotations_file(dir_name: str):
    return DATASETS_DIR / dir_name / "annotations.json"


def load_annotations(dir_name: str):
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(dir_name=dir_name).first()
        if not db_dataset:
            path = annotations_file(dir_name)
            if not path.exists():
                return {}
            return json.loads(path.read_text())

        if db.query(DbAnnotation).filter_by(dataset_id=db_dataset.id).count() == 0:
            path = annotations_file(dir_name)
            if path.exists():
                data = json.loads(path.read_text())
                for img_path, values in data.items():
                    db_image = db.query(DbImage).filter_by(path=img_path).first()
                    if not db_image:
                        continue
                    db.add(
                        DbAnnotation(
                            dataset_id=db_dataset.id,
                            image_id=db_image.id,
                            values=values,
                        )
                    )
                db.commit()

        result = {}
        for path, values in (
            db.query(DbImage.path, DbAnnotation.values)
            .join(DbAnnotation, DbImage.id == DbAnnotation.image_id)
            .filter(DbAnnotation.dataset_id == db_dataset.id)
            .all()
        ):
            result[path] = values
        return result
    finally:
        db.close()


def save_annotations(dir_name: str, data: dict, updated_by="system", updated_keys=None):
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(dir_name=dir_name).first()
        if not db_dataset:
            atomic_write_json(annotations_file(dir_name), data)
            return

        existing = {
            a.image_id: a
            for a in db.query(DbAnnotation).filter_by(dataset_id=db_dataset.id).all()
        }
        for img_path, values in data.items():
            db_image = db.query(DbImage).filter_by(path=img_path).first()
            if not db_image:
                continue
            ann = existing.get(db_image.id)
            if ann is None:
                ann = DbAnnotation(
                    dataset_id=db_dataset.id,
                    image_id=db_image.id,
                )
                db.add(ann)
            ann.values = values
            if updated_by is not None and (updated_keys is None or img_path in updated_keys):
                ann.updated_by = updated_by
        db.commit()
    finally:
        db.close()


def save_prelabels(dir_name: str, data: dict):
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(dir_name=dir_name).first()
        if not db_dataset:
            return

        existing = {
            a.image_id: a
            for a in db.query(DbAnnotation).filter_by(dataset_id=db_dataset.id).all()
        }
        for img_path, values in data.items():
            db_image = db.query(DbImage).filter_by(path=img_path).first()
            if not db_image:
                continue
            ann = existing.get(db_image.id)
            if ann is None:
                ann = DbAnnotation(
                    dataset_id=db_dataset.id,
                    image_id=db_image.id,
                )
                db.add(ann)
            ann.pre_labels = values
        db.commit()
    finally:
        db.close()


def load_annotation_times(dir_name: str):
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(dir_name=dir_name).first()
        if not db_dataset:
            return {}
        result = {}
        last_attrs = {}
        for path, updated_at, last_attr in (
            db.query(DbImage.path, DbAnnotation.updated_at, DbAnnotation.last_attr)
            .join(DbAnnotation, DbImage.id == DbAnnotation.image_id)
            .filter(DbAnnotation.dataset_id == db_dataset.id)
            .all()
        ):
            if updated_at:
                result[path] = updated_at.isoformat() + "Z"
            if last_attr is not None:
                last_attrs[path] = last_attr
        return result, last_attrs
    finally:
        db.close()


@app.get("/datasets/{name}/annotations")
def get_dataset_annotations(name: str):
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dir_name = datasets[name].get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")
    updated_at, last_attr = load_annotation_times(dir_name)
    reviewed = {}
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if db_dataset:
            rows = (
                db.query(
                    DbActivityLog.image_path,
                    DbActivityLog.user_name,
                    DbActivityLog.created_at,
                    DbActivityLog.detail,
                )
                .filter(
                    DbActivityLog.dataset_id == db_dataset.id,
                    DbActivityLog.action.in_(["annotate", "check"]),
                    DbActivityLog.image_path.isnot(None),
                )
                .order_by(DbActivityLog.created_at.desc())
                .all()
            )
            # rows are newest-first: first hit per (image, attr, user) is the
            # latest. attr key is str(attr_index); "all" = whole-image action
            # (e.g. freeform annotate with no focused group).
            for path, user, ts, detail in rows:
                attr = (detail or {}).get("attr_index")
                key = "all" if attr is None else str(attr)
                users = reviewed.setdefault(path, {}).setdefault(key, {})
                if user not in users:
                    users[user] = ts.isoformat() + "Z" if ts else None
    finally:
        db.close()
    return {
        "dataset": name,
        "annotations": load_annotations(dir_name),
        "updated_at": updated_at,
        "last_attr": last_attr,
        "reviewed": reviewed,
    }


def _upsert_check(db, db_dataset, user_name, image, attr_index):
    """One check row per (dataset, user, image, attr_index) — revisits bump
    its `created_at` so the log stays compact and resume stays accurate.
    Skips entirely when the user's latest activity is an `annotate` on the
    same pair, since that already stamped the view. Does not commit.
    Returns "skipped" | "updated" | "inserted".
    """
    valid_attr = attr_index if isinstance(attr_index, int) and not isinstance(attr_index, bool) else None
    last = (
        db.query(DbActivityLog)
        .filter(
            DbActivityLog.dataset_id == db_dataset.id,
            DbActivityLog.user_name == user_name,
            DbActivityLog.action.in_(["annotate", "check"]),
            DbActivityLog.image_path.isnot(None),
        )
        .order_by(DbActivityLog.created_at.desc())
        .first()
    )
    last_attr = ((last.detail or {}).get("attr_index") if last else None)
    if last and last.image_path == image and last_attr == valid_attr and last.action == "annotate":
        return "skipped"

    attr_expr = func.json_extract(DbActivityLog.detail, "$.attr_index")
    existing = (
        db.query(DbActivityLog)
        .filter(
            DbActivityLog.dataset_id == db_dataset.id,
            DbActivityLog.user_name == user_name,
            DbActivityLog.action == "check",
            DbActivityLog.image_path == image,
            attr_expr == valid_attr if valid_attr is not None else attr_expr.is_(None),
        )
        .first()
    )
    if existing:
        existing.created_at = datetime.utcnow()
        return "updated"
    log_activity(
        db,
        user_name,
        "check",
        dataset_id=db_dataset.id,
        dataset_name=db_dataset.name,
        image_path=image,
        detail={"attr_index": attr_index} if valid_attr is not None else {},
    )
    return "inserted"


@app.post("/datasets/{name}/check")
def check_dataset_image(name: str, payload: dict = Body(...)):
    """Record that `user` reviewed `image` under attribute `attr_index`
    without changing anything. Upserted: one check row per
    (dataset, user, image, attr_index) — revisits just bump its
    `created_at` so the log stays compact and resume stays accurate.
    Skips entirely when the user's latest activity is an `annotate`
    on this same pair, since that already stamped the view.
    """
    image = payload.get("image")
    if not image:
        raise HTTPException(status_code=400, detail="image is required")
    user_name = (payload.get("user") or "").strip() or "root"
    attr_index = payload.get("attr_index")

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        result = _upsert_check(db, db_dataset, user_name, image, attr_index)
        db.commit()
        if result == "skipped":
            return {"dataset": name, "image": image, "skipped": True}
        if result == "updated":
            return {"dataset": name, "image": image, "updated": True}
        return {"dataset": name, "image": image, "skipped": False}
    finally:
        db.close()


@app.post("/datasets/{name}/annotations")
def set_dataset_annotation(name: str, payload: dict):
    image = payload.get("image")
    values = payload.get("values")
    if not image:
        raise HTTPException(status_code=400, detail="image is required")
    if not isinstance(values, list) or not all(v in (0, 1) for v in values):
        raise HTTPException(status_code=400, detail="values must be a list of 0/1")

    user_name = (payload.get("user") or "").strip() or "root"
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        db_image = db.query(DbImage).filter_by(path=image).first()
        if not db_image:
            raise HTTPException(status_code=404, detail="Image not found")

        attr_index = payload.get("attr_index")

        existing_ann = (
            db.query(DbAnnotation)
            .filter_by(dataset_id=db_dataset.id, image_id=db_image.id)
            .first()
        )
        old_values = list(existing_ann.values or []) if existing_ann else []
        old_values += [0] * max(0, len(values) - len(old_values))
        changed_indices = [i for i in range(len(values)) if old_values[i] != values[i]]
        pre_labels = list(existing_ann.pre_labels or []) if existing_ann else []
        corrected = None
        if pre_labels:
            corrected = sum(
                1
                for i in range(len(values))
                if (pre_labels[i] if i < len(pre_labels) else 0) != values[i]
            )

        # A save that flips nothing is semantically a review: keep the
        # annotation untouched (preserving updated_by credit) and record
        # the view as an upserted check instead of an annotate row.
        if not changed_indices:
            if (
                existing_ann
                and isinstance(attr_index, int)
                and not isinstance(attr_index, bool)
                and existing_ann.last_attr != attr_index
            ):
                existing_ann.last_attr = attr_index
            _upsert_check(db, db_dataset, user_name, image, attr_index)
            db.commit()
            return {
                "dataset": name,
                "image": image,
                "values": values,
                "updated_by": user_name,
                "unchanged": True,
            }

        insert_values = {
            "dataset_id": db_dataset.id,
            "image_id": db_image.id,
            "values": values,
            "updated_by": user_name,
        }
        if isinstance(attr_index, int) and not isinstance(attr_index, bool):
            insert_values["last_attr"] = attr_index
        stmt = insert(DbAnnotation).values(**insert_values)
        set_map = {
            "values": stmt.excluded["values"],
            "updated_by": stmt.excluded["updated_by"],
            "updated_at": datetime.utcnow(),
        }
        if "last_attr" in insert_values:
            set_map["last_attr"] = stmt.excluded["last_attr"]
        stmt = stmt.on_conflict_do_update(
            index_elements=["dataset_id", "image_id"],
            set_=set_map,
        )
        db.execute(stmt)
        detail = {
            "changed": len(changed_indices),
            "changed_indices": changed_indices,
        }
        if corrected is not None:
            detail["corrected"] = corrected
        if attr_index is not None:
            detail["attr_index"] = attr_index
        log_activity(
            db,
            user_name,
            "annotate",
            dataset_id=db_dataset.id,
            dataset_name=name,
            image_path=image,
            detail=detail,
        )
        db.commit()
    finally:
        db.close()
    return {"dataset": name, "image": image, "values": values, "updated_by": user_name}


def _attribute_labels(attributes, vector_length):
    labels = [f"Attribute {i}" for i in range(vector_length)]
    for group in attributes:
        options = group.get("option_aliases") or group.get("options", [])
        group_label = group.get("alias") or group["name"]
        for pos, idx in enumerate(group.get("indices", [])):
            if 0 <= idx < vector_length:
                labels[idx] = options[pos] if pos < len(options) else f"{group_label} {pos}"
    return labels


@app.get("/datasets/{name}/prelabel-stats")
def get_prelabel_stats(name: str):
    name = unquote(name)
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    entry = datasets[name]
    dir_name = entry.get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")

    framework = (entry.get("framework") or "").strip()
    model = (entry.get("model") or "").strip()
    if not framework or not model:
        raise HTTPException(status_code=400, detail="Dataset framework/model not set")
    config = load_template_config(_normalize_template_path(framework, model))
    attributes = config.get("attributes", [])
    vector_length = max(max(g.get("indices", [0]) or [0]) for g in attributes) + 1 if attributes else 26

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found in DB")

        rows = (
            db.query(DbAnnotation)
            .filter(
                DbAnnotation.dataset_id == db_dataset.id,
                DbAnnotation.pre_labels != None,
                DbAnnotation.pre_labels != [],
            )
            .all()
        )

        counts = [{"tp": 0, "fp": 0, "fn": 0, "tn": 0} for _ in range(vector_length)]
        total = len(rows)
        for ann in rows:
            pre_vals = ann.pre_labels or []
            val_vals = ann.values or []
            for i in range(vector_length):
                p = pre_vals[i] if i < len(pre_vals) else 0
                v = val_vals[i] if i < len(val_vals) else 0
                if p == 1 and v == 1:
                    counts[i]["tp"] += 1
                elif p == 1 and v == 0:
                    counts[i]["fp"] += 1
                elif p == 0 and v == 1:
                    counts[i]["fn"] += 1
                else:
                    counts[i]["tn"] += 1

        labels = _attribute_labels(attributes, vector_length)
        stats = []
        for i, c in enumerate(counts):
            precision = c["tp"] / (c["tp"] + c["fp"]) if (c["tp"] + c["fp"]) > 0 else 0
            recall = c["tp"] / (c["tp"] + c["fn"]) if (c["tp"] + c["fn"]) > 0 else 0
            accuracy = (c["tp"] + c["tn"]) / total if total > 0 else 0
            stats.append({
                "index": i,
                "name": labels[i],
                "tp": c["tp"],
                "fp": c["fp"],
                "fn": c["fn"],
                "tn": c["tn"],
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "accuracy": round(accuracy, 4),
            })

        return {
            "dataset": name,
            "total": total,
            "attributes": stats,
        }
    finally:
        db.close()


@app.post("/datasets/{name}/assign")
def assign_batch(name: str, payload: dict):
    batch = payload.get("batch")
    if not batch:
        raise HTTPException(status_code=400, detail="Batch required")
    batch_dir = (UPLOADS_DIR / batch).resolve()
    if not batch_dir.is_dir() or not batch_dir.is_relative_to(UPLOADS_DIR.resolve()):
        raise HTTPException(status_code=404, detail="Batch not found")
    with DATASETS_LOCK:
        datasets = load_datasets()
        if name not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        entry = datasets[name]
        if batch not in entry["batches"]:
            entry["batches"].append(batch)
        save_datasets(datasets)
    return {"dataset": name, "batch": batch}


@app.post("/datasets/{name}/split")
def set_dataset_split(name: str, payload: dict):
    try:
        train = int(payload.get("train", 0))
        val = int(payload.get("val", 0))
        test = int(payload.get("test", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Split values must be numbers")
    if train < 0 or val < 0 or test < 0 or train + val + test != 100:
        raise HTTPException(status_code=400, detail="Split ratios must sum to 100")
    with DATASETS_LOCK:
        datasets = load_datasets()
        if name not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        datasets[name]["split"] = {"train": train, "val": val, "test": test}
        save_datasets(datasets)
    return {"dataset": name, "split": datasets[name]["split"]}


@app.post("/datasets/{name}/export")
def export_dataset(name: str, payload: dict | None = None):
    from urllib.parse import unquote
    payload = payload or {}
    name = unquote(name)
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    entry = datasets[name]
    dir_name = entry.get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset_dir = DATASETS_DIR / dir_name
    if not dataset_dir.is_dir():
        raise HTTPException(status_code=404, detail="Dataset not found")

    framework = (entry.get("framework") or "").strip()
    model = (entry.get("model") or "").strip()
    if not framework or not model:
        raise HTTPException(status_code=400, detail="Dataset framework/model not set")
    config = load_template_config(_normalize_template_path(framework, model))
    split = payload.get("split") or _split_from_template(config)
    try:
        split = {k: int(v) for k, v in split.items()}
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Split values must be numbers")
    if sum(split.values()) != 100:
        raise HTTPException(status_code=400, detail="Split ratios must sum to 100")

    folder_config = config.get("folder") or {}
    folder_map = {name: name for name in folder_config.get("structure", ["train", "val", "test"])}
    text_map = config.get("text", {}) or {}

    files = []
    selected_batches = payload.get("batches") or []
    selected_set = set(selected_batches)

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found in DB")
        query = (
            db.query(DbImage, DbBatch)
            .join(DbBatch, DbImage.batch_id == DbBatch.id)
            .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
            .filter(DbDatasetImage.dataset_id == db_dataset.id)
            .order_by(DbImage.path)
            .all()
        )
        for db_image, db_batch in query:
            if selected_set:
                display = f"raw-images/{db_batch.name}"
                if display.replace("/", "_") not in selected_set:
                    continue
            img = (UPLOADS_DIR / db_image.path.removeprefix("/uploads/")).resolve()
            if img.is_file() and img.is_relative_to(UPLOADS_DIR.resolve()):
                files.append(img)
    finally:
        db.close()

    if not files:
        raise HTTPException(status_code=400, detail="No images found in selected batches")

    total = len(files)
    group_split = payload.get("group_split", True)

    if group_split and total > 1:
        # Cluster-aware split: near-duplicate crops (same burst/person) are
        # indivisible, so a group can't straddle train/val/test and inflate
        # val metrics. Loose threshold on purpose — over-merging is safe,
        # under-merging leaks.
        items = []
        for f in files:
            mtime = f.stat().st_mtime
            cached = _PHASH_CACHE.get(str(f))
            if cached and cached[0] == mtime:
                h = cached[1]
            else:
                h = _phash64(f)
                if h is not None:
                    _PHASH_CACHE[str(f)] = (mtime, h)
            items.append((f, h))
        hashed = [(f, h) for f, h in items if h is not None]
        groups = (
            _cluster_hashes(hashed, 12) if len(hashed) > 1 else [[f] for f, _ in hashed]
        )
        groups += [[f] for f, h in items if h is None]
        random.shuffle(groups)
        targets = {s: total * split.get(s, 0) / 100 for s in ("train", "val", "test")}
        split_files = {s: [] for s in ("train", "val", "test")}
        for g in groups:
            best = max(
                targets,
                key=lambda s: (targets[s] - len(split_files[s])) / max(targets[s], 1),
            )
            split_files[best].extend(g)
    else:
        random.shuffle(files)
        n_train = round(total * split.get("train", 0) / 100)
        n_val = round(total * split.get("val", 0) / 100)
        split_files = {
            "train": files[:n_train],
            "val": files[n_train:n_train + n_val],
            "test": files[n_train + n_val:],
        }

    annotations = load_annotations(dir_name)
    attr_groups = config.get("attributes", [])
    if attr_groups:
        vector_length = max(max(g.get("indices", [0]) or [0]) for g in attr_groups) + 1
    else:
        vector_length = 26
    default_values = [0] * vector_length

    from urllib.parse import quote
    export_dir = dataset_dir / "export"
    if export_dir.exists():
        shutil.rmtree(export_dir)
    export_dir.mkdir(parents=True)

    counts = {}
    missing_annotations = 0
    for split_name, split_list in split_files.items():
        folder_name = folder_map.get(split_name, split_name)
        text_name = text_map.get(split_name, f"{split_name}_list.txt")
        target_dir = export_dir / folder_name
        target_dir.mkdir(parents=True, exist_ok=True)
        lines = []
        for f in split_list:
            dest = target_dir / f.name
            if dest.exists():
                dest = target_dir / f"{uuid.uuid4().hex[:8]}_{f.name}"
            shutil.copy2(f, dest)
            rel = f.relative_to(UPLOADS_DIR)
            source_url = f"/uploads/{rel.as_posix()}"
            values = annotations.get(source_url, default_values)
            if source_url not in annotations:
                missing_annotations += 1
            if len(values) < vector_length:
                values = values + [0] * (vector_length - len(values))
            elif len(values) > vector_length:
                values = values[:vector_length]
            label = ",".join(str(v) for v in values)
            lines.append(f"{folder_name}/{dest.name}\t{label}")
        (export_dir / text_name).write_text(
            "\n".join(lines) + ("\n" if lines else "")
        )
        counts[split_name] = len(split_list)

    export_format = (payload.get("format") or "tar").strip().lower()
    format_map = {
        "tar": ("tar", "w", "application/x-tar"),
        "zip": ("zip", None, "application/zip"),
        "tar.gz": ("tar.gz", "w:gz", "application/gzip"),
        "rar": ("rar", None, "application/vnd.rar"),
    }
    if export_format not in format_map:
        raise HTTPException(status_code=400, detail="Unsupported export format")

    ext, tar_mode, media_type = format_map[export_format]
    archive_path = dataset_dir / f"{dir_name}.{ext}"
    if archive_path.exists():
        archive_path.unlink()

    if export_format == "zip":
        import zipfile
        with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as z:
            for item in sorted(export_dir.iterdir()):
                z.write(item, arcname=item.name)
    elif export_format == "rar":
        import subprocess
        if not shutil.which("rar"):
            raise HTTPException(status_code=400, detail="rar binary not installed")
        subprocess.run(
            ["rar", "a", "-r", str(archive_path), str(export_dir)],
            check=True,
            capture_output=True,
        )
    else:
        with tarfile.open(archive_path, tar_mode) as tar:
            for item in sorted(export_dir.iterdir()):
                tar.add(item, arcname=item.name)

    return {
        "dataset": name,
        "template": "",
        "counts": counts,
        "missing_annotations": missing_annotations,
        "format": export_format,
        "split_strategy": "cluster" if group_split else "random",
        "download": f"/datasets/{quote(name, safe='')}/download?format={export_format}",
    }


@app.get("/datasets/{name}/download")
def download_dataset(name: str, format: str = "tar"):
    from urllib.parse import unquote
    name = unquote(name)
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dir_name = datasets[name].get("dir")
    if not dir_name:
        raise HTTPException(status_code=404, detail="Dataset not found")
    format_map = {
        "tar": ("tar", "application/x-tar"),
        "zip": ("zip", "application/zip"),
        "tar.gz": ("tar.gz", "application/gzip"),
        "rar": ("rar", "application/vnd.rar"),
    }
    export_format = (format or "tar").strip().lower()
    ext, media_type = format_map.get(export_format, format_map["tar"])
    archive_path = DATASETS_DIR / dir_name / f"{dir_name}.{ext}"
    if not archive_path.exists():
        raise HTTPException(status_code=404, detail="Export not found. Run export first.")
    return FileResponse(archive_path, filename=f"{name}.{ext}", media_type=media_type)


ARCHIVE_FORMATS = {
    "tar": ("tar", "w", "application/x-tar"),
    "zip": ("zip", None, "application/zip"),
    "tar.gz": ("tar.gz", "w:gz", "application/gzip"),
}


def _archive_staging(staging: Path, dataset_name: str, db, db_dataset):
    """Build the restorable archive contents under `staging`."""
    rows = (
        db.query(DbImage, DbBatch, DbAnnotation)
        .join(DbDatasetImage, DbImage.id == DbDatasetImage.image_id)
        .join(DbBatch, DbDatasetImage.batch_id == DbBatch.id)
        .outerjoin(
            DbAnnotation,
            (DbAnnotation.image_id == DbImage.id)
            & (DbAnnotation.dataset_id == db_dataset.id),
        )
        .filter(DbDatasetImage.dataset_id == db_dataset.id)
        .order_by(DbBatch.name, DbImage.path)
        .all()
    )

    (staging / "images").mkdir(parents=True)
    annotations = {}
    batch_sources = {}
    seen_keys = set()
    image_count = 0
    for db_image, db_batch, db_annotation in rows:
        if (
            db_batch.name not in batch_sources
            and db_batch.source_ref is not None
        ):
            batch_sources[db_batch.name] = {
                "name": db_batch.source_ref.name,
                "version": db_batch.source_ref.version,
            }
        src = (UPLOADS_DIR / db_image.path.removeprefix("/uploads/")).resolve()
        if not (src.is_file() and src.is_relative_to(UPLOADS_DIR.resolve())):
            continue
        rel_key = f"{db_batch.name}/{src.name}"
        if rel_key in seen_keys:
            rel_key = f"{db_batch.name}/{uuid.uuid4().hex[:8]}_{src.name}"
        seen_keys.add(rel_key)
        dest = staging / "images" / rel_key
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        image_count += 1
        if db_annotation is not None:
            annotations[rel_key] = {
                "values": db_annotation.values or [],
                "pre_labels": db_annotation.pre_labels or [],
            }

    manifest = {
        "version": 1,
        "name": dataset_name,
        "framework": db_dataset.framework or "",
        "model": db_dataset.model or "",
        "split": db_dataset.split or dict(DEFAULT_SPLIT),
        "batch_sources": batch_sources,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    (staging / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (staging / "annotations.json").write_text(json.dumps(annotations))
    return image_count, len(annotations), manifest["split"]


@app.post("/datasets/{name}/archive")
def archive_dataset(name: str, payload: dict | None = None):
    payload = payload or {}
    name = unquote(name)
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    export_format = (payload.get("format") or "tar.gz").strip().lower()
    if export_format not in ARCHIVE_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported archive format")

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found in DB")

        ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        safe = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-") or "dataset"
        ext, tar_mode, media_type = ARCHIVE_FORMATS[export_format]
        archive_name = f"{safe}-archive-{ts}.{ext}"
        archive_path = ARCHIVES_DIR / archive_name

        with tempfile.TemporaryDirectory() as tmp:
            staging = Path(tmp) / "archive"
            image_count, annotated_count, split = _archive_staging(
                staging, name, db, db_dataset
            )
            if image_count == 0:
                raise HTTPException(status_code=400, detail="Dataset has no images")

            if export_format == "zip":
                with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as z:
                    for item in sorted(staging.rglob("*")):
                        if item.is_file():
                            z.write(
                                item,
                                arcname=item.relative_to(staging).as_posix(),
                            )
            else:
                with tarfile.open(archive_path, tar_mode) as tar:
                    for item in sorted(staging.iterdir()):
                        tar.add(item, arcname=item.name)

        db.add(
            DbArchive(
                dataset_id=db_dataset.id,
                dataset_name=name,
                format=export_format,
                archive_path=archive_path.relative_to(BASE_DIR).as_posix(),
                split=split,
                counts={"images": image_count, "annotated": annotated_count},
            )
        )
        db.commit()
    finally:
        db.close()

    return {
        "archive": archive_name,
        "images": image_count,
        "annotated": annotated_count,
    }


@app.get("/archives")
def list_archives():
    db = SessionLocal()
    try:
        items = []
        for e in db.query(DbArchive).order_by(DbArchive.created_at.desc()).all():
            path = (BASE_DIR / (e.archive_path or "")).resolve()
            items.append(
                {
                    "id": e.id,
                    "dataset": e.dataset_name,
                    "format": e.format,
                    "name": path.name,
                    "size": path.stat().st_size if path.is_file() else 0,
                    "exists": path.is_file(),
                    "counts": e.counts or {},
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
            )
        return {"archives": items}
    finally:
        db.close()


@app.get("/archives/{archive_id}/download")
def download_archive(archive_id: int):
    db = SessionLocal()
    try:
        e = db.query(DbArchive).filter_by(id=archive_id).first()
        if not e or not e.archive_path:
            raise HTTPException(status_code=404, detail="Archive not found")
        path = (BASE_DIR / e.archive_path).resolve()
    finally:
        db.close()
    if not path.is_file() or not path.is_relative_to(ARCHIVES_DIR.resolve()):
        raise HTTPException(status_code=404, detail="Archive file not found")
    return FileResponse(path, filename=path.name)


@app.delete("/archives/{archive_id}")
def delete_archive(archive_id: int):
    db = SessionLocal()
    try:
        e = db.query(DbArchive).filter_by(id=archive_id).first()
        if not e:
            raise HTTPException(status_code=404, detail="Archive not found")
        path = (BASE_DIR / (e.archive_path or "")).resolve()
        db.delete(e)
        db.commit()
    finally:
        db.close()
    if path.is_file() and path.is_relative_to(ARCHIVES_DIR.resolve()):
        path.unlink()
    return {"deleted": archive_id}


def _extract_archive(archive_path: Path, staging: Path):
    name = archive_path.name.lower()
    if name.endswith(".zip"):
        with zipfile.ZipFile(archive_path) as z:
            z.extractall(staging)
    elif name.endswith(".rar"):
        subprocess.run(
            ["bsdtar", "-xf", str(archive_path), "-C", str(staging)],
            check=True,
            capture_output=True,
        )
    else:
        with tarfile.open(archive_path) as t:
            t.extractall(staging)


def _restore_archive_staging(staging: Path):
    manifest = _load_manifest(staging / "manifest.json")
    if not manifest or not manifest.get("name"):
        raise HTTPException(
            status_code=400, detail="Invalid archive: manifest.json missing"
        )
    annotations = {}
    ann_path = staging / "annotations.json"
    if ann_path.is_file():
        annotations = json.loads(ann_path.read_text()) or {}

    base_name = manifest["name"]
    with DATASETS_LOCK:
        datasets = load_datasets()
        new_name = base_name
        if new_name in datasets:
            new_name = f"{base_name}-restored"
            i = 2
            while new_name in datasets:
                new_name = f"{base_name}-restored-{i}"
                i += 1
        dataset_dir_name = next_dataset_dir_name()
        (DATASETS_DIR / dataset_dir_name).mkdir(parents=True)

        db = SessionLocal()
        try:
            db_dataset = DbDataset(
                name=new_name,
                dir_name=dataset_dir_name,
                framework=manifest.get("framework") or "",
                model=manifest.get("model") or "",
                split=manifest.get("split") or dict(DEFAULT_SPLIT),
            )
            db.add(db_dataset)
            db.flush()

            batch_cache = {}
            source_cache = {}
            batch_sources = manifest.get("batch_sources") or {}
            linked = set()
            restored = 0
            annotated = 0
            for item in sorted((staging / "images").rglob("*")):
                if not item.is_file() or item.suffix.lower() not in IMAGE_EXTENSIONS:
                    continue
                batch_name = item.parent.name
                db_batch = batch_cache.get(batch_name)
                if db_batch is None:
                    db_batch = (
                        db.query(DbBatch).filter_by(name=batch_name).first()
                    )
                    if db_batch is None:
                        db_batch = DbBatch(name=batch_name, type="raw")
                        db.add(db_batch)
                        db.flush()
                    src_info = batch_sources.get(batch_name)
                    if src_info and db_batch.source_id is None:
                        key = (src_info.get("name"), str(src_info.get("version") or "1"))
                        db_source = source_cache.get(key)
                        if db_source is None and key[0]:
                            db_source = (
                                db.query(DbSource)
                                .filter_by(name=key[0], version=key[1])
                                .first()
                            )
                            if db_source is None:
                                db_source = DbSource(name=key[0], version=key[1])
                                db.add(db_source)
                                db.flush()
                            source_cache[key] = db_source
                        if db_source is not None:
                            db_batch.source_id = db_source.id
                    batch_cache[batch_name] = db_batch

                image_path = f"/uploads/raw-images/{batch_name}/{item.name}"
                db_image = db.query(DbImage).filter_by(path=image_path).first()
                if db_image is None:
                    batch_dir = RAW_IMAGES_DIR / batch_name
                    batch_dir.mkdir(parents=True, exist_ok=True)
                    dest = batch_dir / item.name
                    if dest.exists():
                        stem, suffix = item.stem, item.suffix
                        n = 1
                        while dest.exists():
                            dest = batch_dir / f"{stem}-{n}{suffix}"
                            n += 1
                    shutil.copy2(item, dest)
                    image_path = f"/uploads/raw-images/{batch_name}/{dest.name}"
                    db_image = DbImage(
                        batch_id=db_batch.id,
                        path=image_path,
                        filename=dest.name,
                    )
                    db.add(db_image)
                    db.flush()

                if db_image.id not in linked:
                    db.add(
                        DbDatasetImage(
                            dataset_id=db_dataset.id,
                            image_id=db_image.id,
                            batch_id=db_batch.id,
                        )
                    )
                    linked.add(db_image.id)

                rel_key = f"{batch_name}/{item.name}"
                ann = annotations.get(rel_key)
                if ann:
                    db.add(
                        DbAnnotation(
                            dataset_id=db_dataset.id,
                            image_id=db_image.id,
                            values=ann.get("values") or [],
                            pre_labels=ann.get("pre_labels") or [],
                        )
                    )
                    annotated += 1
                restored += 1
            dataset_id = db_dataset.id
            db.commit()
        finally:
            db.close()

    _save_manifest(
        dataset_dir_name,
        {
            "name": new_name,
            "framework": manifest.get("framework"),
            "model": manifest.get("model"),
        },
    )
    return new_name, restored, annotated, dataset_id, manifest


@app.post("/archives/{archive_id}/restore")
def restore_archive(archive_id: int):
    db = SessionLocal()
    try:
        e = db.query(DbArchive).filter_by(id=archive_id).first()
        if not e or not e.archive_path:
            raise HTTPException(status_code=404, detail="Archive not found")
        archive_path = (BASE_DIR / e.archive_path).resolve()
    finally:
        db.close()
    if not archive_path.is_file() or not archive_path.is_relative_to(
        ARCHIVES_DIR.resolve()
    ):
        raise HTTPException(status_code=404, detail="Archive file not found")

    with tempfile.TemporaryDirectory() as tmp:
        staging = Path(tmp) / "archive"
        staging.mkdir()
        _extract_archive(archive_path, staging)
        new_name, restored, _, _, _ = _restore_archive_staging(staging)

    return {"dataset": new_name, "images": restored}


@app.post("/archives/import")
def import_archive(file: UploadFile = File(...)):
    filename = Path(file.filename or "archive").name
    lower = filename.lower()
    ext_full = next(
        (
            s
            for s in (".tar.gz", ".tar.bz2", ".tar.xz", ".tgz", ".tar", ".zip", ".rar")
            if lower.endswith(s)
        ),
        None,
    )
    if not ext_full:
        raise HTTPException(
            status_code=400,
            detail="Unsupported archive type. Use .tar, .tar.gz, .zip or .rar",
        )
    fmt = {".tgz": "tar.gz", ".tar.bz2": "tar", ".tar.xz": "tar"}.get(
        ext_full, ext_full.lstrip(".")
    )

    safe_base = re.sub(r"[^A-Za-z0-9._-]+", "-", filename[: -len(ext_full)]).strip(
        "-"
    ) or "dataset"
    dest = ARCHIVES_DIR / f"{safe_base}{ext_full}"
    n = 1
    while dest.exists():
        dest = ARCHIVES_DIR / f"{safe_base}-{n}{ext_full}"
        n += 1
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    with tempfile.TemporaryDirectory() as tmp:
        staging = Path(tmp) / "archive"
        staging.mkdir()
        try:
            _extract_archive(dest, staging)
        except Exception:
            dest.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400, detail="Could not extract archive"
            )
        if not _load_manifest(staging / "manifest.json"):
            dest.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail="Not a dataset archive (manifest.json missing)",
            )
        new_name, restored, annotated, dataset_id, manifest = (
            _restore_archive_staging(staging)
        )

    db = SessionLocal()
    try:
        db.add(
            DbArchive(
                dataset_id=dataset_id,
                dataset_name=manifest["name"],
                format=fmt,
                archive_path=dest.relative_to(BASE_DIR).as_posix(),
                split=manifest.get("split"),
                counts={"images": restored, "annotated": annotated},
            )
        )
        db.commit()
    finally:
        db.close()

    return {
        "dataset": new_name,
        "images": restored,
        "archive": dest.name,
    }


def _source_dict(src):
    if not src:
        return None
    return {"id": src.id, "name": src.name, "version": src.version}


def log_activity(
    db,
    user_name: str | None,
    action: str,
    dataset_id: int | None = None,
    dataset_name: str | None = None,
    image_path: str | None = None,
    detail: dict | None = None,
):
    db.add(
        DbActivityLog(
            user_name=user_name or "system",
            action=action,
            dataset_id=dataset_id,
            dataset_name=dataset_name,
            image_path=image_path,
            detail=detail or {},
        )
    )


@app.get("/users")
def list_users():
    db = SessionLocal()
    try:
        users = db.query(DbUser).order_by(DbUser.name).all()
        return {
            "users": [
                {"id": u.id, "name": u.name, "role": u.role}
                for u in users
            ]
        }
    finally:
        db.close()


@app.post("/users")
def create_user(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    role = (payload.get("role") or "worker").strip()
    if role not in ("worker", "superadmin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    password = payload.get("password") or ""
    if role == "superadmin" and not password:
        raise HTTPException(status_code=400, detail="Password required for superadmin")

    db = SessionLocal()
    try:
        existing = db.query(DbUser).filter_by(name=name).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        user = DbUser(
            name=name,
            role=role,
            password_hash=hash_password(password) if password else None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"id": user.id, "name": user.name, "role": user.role}
    finally:
        db.close()


@app.post("/users/{name}/verify")
def verify_user(name: str, payload: dict = Body(default={})):
    name = unquote(name)
    password = payload.get("password") or ""
    db = SessionLocal()
    try:
        user = db.query(DbUser).filter_by(name=name).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role == "superadmin":
            if not user.password_hash or not verify_password(password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid password")
        return {"id": user.id, "name": user.name, "role": user.role}
    finally:
        db.close()


@app.get("/activity")
def list_activity(dataset: str | None = None, limit: int = 50):
    db = SessionLocal()
    try:
        query = db.query(DbActivityLog).order_by(DbActivityLog.created_at.desc())
        if dataset:
            dataset = unquote(dataset)
            query = query.filter(DbActivityLog.dataset_name == dataset)
        rows = query.limit(min(limit, 200)).all()
        return {
            "activity": [
                {
                    "id": r.id,
                    "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
                    "user_name": r.user_name,
                    "action": r.action,
                    "dataset_name": r.dataset_name,
                    "image_path": r.image_path,
                    "detail": r.detail or {},
                }
                for r in rows
            ]
        }
    finally:
        db.close()


@app.get("/datasets/{name}/review-progress")
def get_review_progress(
    name: str,
    user: str,
    batch: str | None = None,
    attr_index: int | None = None,
):
    """Distinct images `user` has annotate/check activity on, scoped to this
    dataset (optionally a batch and attribute group). Rows with no
    attr_index (whole-image actions) count toward every attribute.
    """
    name = unquote(name)
    if not user:
        raise HTTPException(status_code=400, detail="user is required")
    batch = Path(unquote(batch)).name if batch else None

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        rows = (
            db.query(DbActivityLog.image_path, DbActivityLog.detail)
            .filter(
                DbActivityLog.dataset_id == db_dataset.id,
                DbActivityLog.user_name == user,
                DbActivityLog.action.in_(["annotate", "check"]),
                DbActivityLog.image_path.isnot(None),
            )
            .all()
        )
        seen = set()
        for path, detail in rows:
            if batch:
                parts = (path or "").strip("/").split("/")
                if (parts[-2] if len(parts) >= 2 else None) != batch:
                    continue
            ai = (detail or {}).get("attr_index")
            if attr_index is not None and ai is not None and ai != attr_index:
                continue
            seen.add(path)
        return {"dataset": name, "reviewed": len(seen)}
    finally:
        db.close()


@app.get("/datasets/{name}/leaderboard")
def get_leaderboard(name: str):
    """Per-user contribution stats for this dataset.

    - corrections: bits in current annotations that differ from the model's
      pre_labels, credited to updated_by (last writer takes the image).
    - images_annotated: distinct images with an 'annotate' event.
    - reviewed: distinct images with annotate/check activity —
      annotating counts as reviewing.
    """
    name = unquote(name)
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        stats = {}
        valid_paths = {
            p
            for (p,) in db.query(DbImage.path)
            .join(DbDatasetImage, DbDatasetImage.image_id == DbImage.id)
            .filter(DbDatasetImage.dataset_id == db_dataset.id)
            .all()
        }

        def entry(user):
            return stats.setdefault(
                user,
                {
                    "user": user,
                    "corrections": 0,
                    "images_corrected": 0,
                    "annotated": set(),
                    "reviewed": set(),
                },
            )

        anns = (
            db.query(DbAnnotation.updated_by, DbAnnotation.values, DbAnnotation.pre_labels)
            .filter(DbAnnotation.dataset_id == db_dataset.id)
            .all()
        )
        for updated_by, values, pre_labels in anns:
            user = updated_by or "system"
            if user == "system":
                continue
            values = values or []
            pre_labels = pre_labels or []
            if not pre_labels:
                continue
            n = sum(
                1
                for i in range(len(values))
                if (pre_labels[i] if i < len(pre_labels) else 0) != values[i]
            )
            e = entry(user)
            e["corrections"] += n
            if n:
                e["images_corrected"] += 1

        rows = (
            db.query(DbActivityLog.user_name, DbActivityLog.action, DbActivityLog.image_path)
            .filter(
                DbActivityLog.dataset_id == db_dataset.id,
                DbActivityLog.action.in_(["annotate", "check"]),
                DbActivityLog.image_path.isnot(None),
            )
            .all()
        )
        for user_name, action, image_path in rows:
            user = user_name or "system"
            if user == "system" or image_path not in valid_paths:
                continue
            e = entry(user)
            if action == "annotate":
                e["annotated"].add(image_path)
            e["reviewed"].add(image_path)

        board = [
            {
                "user": e["user"],
                "corrections": e["corrections"],
                "images_corrected": e["images_corrected"],
                "images_annotated": len(e["annotated"]),
                "reviewed": len(e["reviewed"]),
            }
            for e in stats.values()
        ]
        board.sort(key=lambda r: (-r["corrections"], -r["reviewed"], r["user"]))
        return {"dataset": name, "leaderboard": board}
    finally:
        db.close()


@app.get("/datasets/{name}/batch-handlers")
def get_batch_handlers(name: str):
    """Per-batch handler stats — which users have annotate/check activity
    in each batch, how many distinct images, attribute coverage, and their
    last activity. Powers the "this batch is already handled by X" warning.
    Coverage = (image, attr_index) pairs seen / (batch images x attr groups),
    so checking every image under only a few attributes is not 100%.
    """
    name = unquote(name)
    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        attr_count = 0
        if db_dataset.framework and db_dataset.model:
            try:
                cfg = load_template_config(f"{db_dataset.framework}/{db_dataset.model}")
                attr_count = len(cfg.get("attributes") or [])
            except HTTPException:
                attr_count = 0
        rows = (
            db.query(
                DbActivityLog.user_name,
                DbActivityLog.image_path,
                DbActivityLog.detail,
                DbActivityLog.created_at,
            )
            .filter(
                DbActivityLog.dataset_id == db_dataset.id,
                DbActivityLog.action.in_(["annotate", "check"]),
                DbActivityLog.image_path.isnot(None),
            )
            .all()
        )
        valid_paths = {
            p
            for (p,) in db.query(DbImage.path)
            .join(DbDatasetImage, DbDatasetImage.image_id == DbImage.id)
            .filter(DbDatasetImage.dataset_id == db_dataset.id)
            .all()
        }
        batch_totals = {}
        for p in valid_paths:
            parts = p.strip("/").split("/")
            batch = parts[-2] if len(parts) >= 2 else None
            if batch:
                stem = f"raw-images_{batch}"
                batch_totals[stem] = batch_totals.get(stem, 0) + 1
        handlers = {}
        union_covered = {}
        for user_name, image_path, detail, created_at in rows:
            user = user_name or "system"
            if user == "system" or image_path not in valid_paths:
                continue
            parts = image_path.strip("/").split("/")
            batch = parts[-2] if len(parts) >= 2 else None
            if not batch:
                continue
            stem = f"raw-images_{batch}"
            ai = (detail or {}).get("attr_index")
            attr = ai if isinstance(ai, int) and not isinstance(ai, bool) else -1
            union_covered.setdefault(stem, {}).setdefault(image_path, set()).add(attr)
            entry = handlers.setdefault(stem, {}).setdefault(
                user, {"user": user, "images": set(), "covered": {}, "last": None}
            )
            entry["images"].add(image_path)
            entry["covered"].setdefault(image_path, set()).add(attr)
            if created_at and (entry["last"] is None or created_at > entry["last"]):
                entry["last"] = created_at
        out = {}
        for stem in set(handlers) | set(union_covered):
            denom = batch_totals.get(stem, 0) * attr_count
            union_pairs = sum(
                attr_count if -1 in s else len(s)
                for s in union_covered.get(stem, {}).values()
            )
            lst = []
            for h in handlers.get(stem, {}).values():
                covered_pairs = sum(
                    attr_count if -1 in s else len(s)
                    for s in h["covered"].values()
                )
                lst.append(
                    {
                        "user": h["user"],
                        "images": len(h["images"]),
                        "coverage": covered_pairs / denom if denom else None,
                        "last_activity": (
                            h["last"].isoformat() + "Z" if h["last"] else None
                        ),
                    }
                )
            out[stem] = {
                "coverage": union_pairs / denom if denom else None,
                "handlers": sorted(lst, key=lambda h: -(h["coverage"] or 0)),
            }
        return {"dataset": name, "handlers": out}
    finally:
        db.close()


@app.get("/datasets/{name}/last-edit")
def get_last_edit(name: str, user: str, batch: str | None = None):
    """Most recent 'annotate' or 'check' activity by `user` in this dataset
    (optionally scoped to `batch`) — powers the per-user "resume where I
    left off" flow.
    """
    name = unquote(name)
    if not user:
        raise HTTPException(status_code=400, detail="user is required")
    batch = Path(unquote(batch)).name if batch else None

    db = SessionLocal()
    try:
        db_dataset = db.query(DbDataset).filter_by(name=name).first()
        if not db_dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        rows = (
            db.query(DbActivityLog)
            .filter(
                DbActivityLog.dataset_id == db_dataset.id,
                DbActivityLog.user_name == user,
                DbActivityLog.action.in_(["annotate", "check"]),
                DbActivityLog.image_path.isnot(None),
            )
            .order_by(DbActivityLog.created_at.desc())
            .limit(500)
            .all()
        )
        for row in rows:
            if batch:
                parts = (row.image_path or "").strip("/").split("/")
                img_batch = parts[-2] if len(parts) >= 2 else None
                if img_batch != batch:
                    continue
            return {
                "image": row.image_path,
                "attr_index": (row.detail or {}).get("attr_index"),
                "created_at": row.created_at.isoformat() + "Z" if row.created_at else None,
            }
        return {"image": None, "attr_index": None, "created_at": None}
    finally:
        db.close()


@app.get("/sources")
def list_sources():
    db = SessionLocal()
    try:
        items = []
        for src in (
            db.query(DbSource).order_by(DbSource.name, DbSource.version).all()
        ):
            items.append(
                {
                    "id": src.id,
                    "name": src.name,
                    "version": src.version,
                    "batches": db.query(DbBatch)
                    .filter(DbBatch.source_id == src.id)
                    .count(),
                }
            )
        return {"sources": items}
    finally:
        db.close()


@app.post("/sources")
def create_source(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Source name required")
    version = (str(payload.get("version") or "")).strip()
    db = SessionLocal()
    try:
        existing = [
            s.version
            for s in db.query(DbSource).filter(DbSource.name == name).all()
        ]
        if not version:
            numeric = [int(v) for v in existing if str(v).isdigit()]
            n = max(numeric, default=0) + 1
            while str(n) in existing:
                n += 1
            version = str(n)
        if version in existing:
            raise HTTPException(
                status_code=400,
                detail=f"Source '{name}' version '{version}' already exists",
            )
        src = DbSource(name=name, version=version)
        db.add(src)
        db.commit()
        db.refresh(src)
        return _source_dict(src)
    finally:
        db.close()


@app.patch("/sources/{source_id}")
def update_source(source_id: int, payload: dict = Body(...)):
    db = SessionLocal()
    try:
        src = db.query(DbSource).filter_by(id=source_id).first()
        if not src:
            raise HTTPException(status_code=404, detail="Source not found")
        name = (payload.get("name") or src.name).strip()
        version = (str(payload.get("version") or src.version)).strip()
        if not name or not version:
            raise HTTPException(
                status_code=400, detail="Name and version are required"
            )
        clash = (
            db.query(DbSource)
            .filter(
                DbSource.name == name,
                DbSource.version == version,
                DbSource.id != source_id,
            )
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=400,
                detail=f"Source '{name}' version '{version}' already exists",
            )
        src.name = name
        src.version = version
        db.commit()
        return _source_dict(src)
    finally:
        db.close()


@app.delete("/sources/{source_id}")
def delete_source(source_id: int):
    db = SessionLocal()
    try:
        src = db.query(DbSource).filter_by(id=source_id).first()
        if not src:
            raise HTTPException(status_code=404, detail="Source not found")
        for batch in db.query(DbBatch).filter(DbBatch.source_id == src.id):
            batch.source_id = None
        db.delete(src)
        db.commit()
        return {"deleted": src.id}
    finally:
        db.close()


@app.post("/batches/{batch_id}/source")
def set_batch_source(batch_id: int, payload: dict = Body(...)):
    source_id = payload.get("source_id")
    db = SessionLocal()
    try:
        batch = db.query(DbBatch).filter_by(id=batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if source_id is not None:
            src = db.query(DbSource).filter_by(id=source_id).first()
            if not src:
                raise HTTPException(status_code=404, detail="Source not found")
        batch.source_id = source_id
        db.commit()
        return {
            "batch": batch.name,
            "source": _source_dict(batch.source_ref),
        }
    finally:
        db.close()


@app.get("/batches")
def list_batches():
    db = SessionLocal()
    try:
        items = []
        for batch in db.query(DbBatch).order_by(DbBatch.name).all():
            name = f"raw-images/{batch.name}"
            items.append(
                {
                    "id": batch.id,
                    "name": name,
                    "cover": batch.cover,
                    "count": len(batch.images),
                    "type": batch.type,
                    "source": _source_dict(batch.source_ref),
                }
            )
        items.sort(key=lambda x: x["name"])
        model = get_model()
        classes = sorted(set(model.names.values()))
        return {"batches": items, "classes": classes}
    finally:
        db.close()


@app.get("/batches/covers")
def list_batch_covers():
    db = SessionLocal()
    try:
        covers = []
        for batch in db.query(DbBatch).order_by(DbBatch.name).all():
            name = f"raw-images/{batch.name}"
            covers.append(
                {
                    "id": batch.id,
                    "name": name,
                    "cover": batch.cover,
                    "count": len(batch.images),
                    "source": _source_dict(batch.source_ref),
                }
            )
        return {"batches": covers}
    finally:
        db.close()


@app.get("/images")
def list_images(
    batch: str | None = None,
    id: int | None = None,
    page: int = 0,
    limit: int = 50,
):
    page = max(0, page)
    limit = max(1, min(500, limit))
    offset = page * limit

    def _key_for_type(batch_type: str) -> str:
        if batch_type == "raw":
            return "imported"
        if batch_type in ("frames", "crops"):
            return batch_type
        return "frames"

    db = SessionLocal()
    try:
        if id is not None:
            base_query = db.query(DbImage).filter(DbImage.batch_id == id)
            total = base_query.count()
            image_rows = (
                base_query.order_by(DbImage.path)
                .offset(offset)
                .limit(limit)
                .all()
            )
            return {
                "images": [{"id": row.id, "path": row.path} for row in image_rows],
                "total": total,
                "page": page,
                "limit": limit,
            }

        if batch:
            batch_name = Path(batch).name
            base_query = (
                db.query(DbImage)
                .join(DbBatch)
                .filter(DbBatch.name == batch_name)
            )
            total = base_query.count()
            image_rows = (
                base_query.order_by(DbImage.path)
                .offset(offset)
                .limit(limit)
                .all()
            )
            return {
                "images": [row.path for row in image_rows],
                "total": total,
                "page": page,
                "limit": limit,
            }

        result = {"imported": [], "frames": [], "crops": []}
        for row in db.query(DbImage).join(DbBatch).order_by(DbImage.path).all():
            key = _key_for_type(row.batch.type)
            result[key].append(row.path)

        return result
    finally:
        db.close()


@app.post("/images/delete")
def delete_images(payload: dict):
    db = SessionLocal()
    try:
        rows = []
        ids = payload.get("ids")
        paths = payload.get("paths")
        if ids:
            ids = [int(i) for i in ids]
            rows = db.query(DbImage).filter(DbImage.id.in_(ids)).all()
        elif paths:
            rows = db.query(DbImage).filter(DbImage.path.in_(paths)).all()

        uploads_root = UPLOADS_DIR.resolve()
        deleted = []
        for img in rows:
            path = img.path
            rel = path.removeprefix("/uploads/")
            target = (UPLOADS_DIR / rel).resolve()
            if not target.is_relative_to(uploads_root):
                continue
            if target.is_file():
                target.unlink()
            deleted.append(path)
            batch = img.batch
            db.delete(img)
            db.flush()
            remaining = (
                db.query(DbImage)
                .filter(DbImage.batch_id == batch.id)
                .count()
            )
            if remaining == 0:
                db.delete(batch)
            elif batch.cover == path:
                new_cover = (
                    db.query(DbImage)
                    .filter(DbImage.batch_id == batch.id)
                    .first()
                )
                batch.cover = new_cover.path if new_cover else None

        # Remove any files that were passed by path but not in the database
        if paths and not ids:
            for path in paths:
                if path in deleted:
                    continue
                rel = path.removeprefix("/uploads/")
                target = (UPLOADS_DIR / rel).resolve()
                if not target.is_relative_to(uploads_root):
                    continue
                if target.is_file():
                    target.unlink()
                    deleted.append(path)

        db.commit()
    finally:
        db.close()

    # Clean up any dataset annotations that pointed to deleted images
    if deleted:
        with DATASETS_LOCK:
            datasets = load_datasets()
        for name in datasets:
            dir_name = datasets[name].get("dir")
            if not dir_name:
                continue
            with annotation_lock(name):
                annotations = load_annotations(dir_name)
                changed = False
                for url in deleted:
                    if url in annotations:
                        del annotations[url]
                        changed = True
                if changed:
                    save_annotations(dir_name, annotations, updated_by=None)

    return {"deleted": len(deleted)}
