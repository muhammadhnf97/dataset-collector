import json
import os
import random
import re
import shutil
import subprocess
import tarfile
import tempfile
import threading
import uuid
from pathlib import Path

import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

app = FastAPI(title="Dataset Collector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
CROPS_DIR = UPLOADS_DIR / "crops"
IMPORTS_DIR = UPLOADS_DIR / "imports"
VIDEOS_DIR = UPLOADS_DIR / "videos"
THUMBNAILS_DIR = VIDEOS_DIR / "thumbnails"
FRAMES_DIR = UPLOADS_DIR / "frames"
DATASETS_DIR = BASE_DIR / "datasets"
DATASETS_FILE = DATASETS_DIR / "datasets.json"
TEMPLATES_DIR = BASE_DIR / "template"

for directory in (CROPS_DIR, IMPORTS_DIR, VIDEOS_DIR, THUMBNAILS_DIR, FRAMES_DIR, DATASETS_DIR):
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


def next_batch_name():
    numbers = [
        int(m.group(1))
        for d in IMPORTS_DIR.iterdir()
        if d.is_dir() and (m := re.fullmatch(r"batch-(\d+)", d.name))
    ]
    return f"batch-{max(numbers, default=0) + 1}"


def next_video_name():
    numbers = [
        int(m.group(1))
        for d in VIDEOS_DIR.iterdir()
        if d.is_dir() and (m := re.fullmatch(r"video-(\d+)", d.name))
    ]
    return f"video-{max(numbers, default=0) + 1}"


def _image_extensions(path: Path | None = None):
    return (
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".bmp",
        ".gif",
    )


def batch_first_image(batch: str):
    batch_dir = IMPORTS_DIR / batch
    if not batch_dir.is_dir():
        return None
    for f in sorted(batch_dir.iterdir()):
        if f.is_file() and f.suffix.lower() in _image_extensions(path=f):
            return f"/uploads/imports/{batch}/{f.name}"
    return None


DEFAULT_SPLIT = {"train": 70, "val": 20, "test": 10}


def load_datasets():
    if not DATASETS_FILE.exists():
        return {}
    data = json.loads(DATASETS_FILE.read_text())
    migrated = {}
    for name, value in data.items():
        if isinstance(value, list):
            # Old format: plain list of batch names
            migrated[name] = {
                "batches": value,
                "split": dict(DEFAULT_SPLIT),
                "template": None,
            }
        elif isinstance(value, dict) and "batches" in value:
            migrated[name] = {
                "batches": value.get("batches", []),
                "split": value.get("split") or dict(DEFAULT_SPLIT),
                "template": value.get("template"),
            }
        elif isinstance(value, dict):
            # Older format: train/val/test batch lists
            seen = set()
            for s in ("train", "val", "test"):
                for b in value.get(s, []):
                    seen.add(b)
            migrated[name] = {
                "batches": sorted(seen),
                "split": dict(DEFAULT_SPLIT),
                "template": None,
            }
        else:
            migrated[name] = {
                "batches": [],
                "split": dict(DEFAULT_SPLIT),
                "template": None,
            }
    if migrated != data:
        DATASETS_FILE.write_text(json.dumps(migrated, indent=2))
    return migrated


def save_datasets(data: dict):
    atomic_write_json(DATASETS_FILE, data)


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


@app.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    if file.content_type and not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    suffix = Path(file.filename or "").suffix
    video_name = next_video_name()
    video_dir = VIDEOS_DIR / video_name
    video_dir.mkdir(parents=True)
    (video_dir / "imgs").mkdir(parents=True)

    destination = video_dir / f"{video_name}{suffix}"
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    thumbnail_url = make_thumbnail(destination, video_name)

    return {
        "filename": video_name,
        "original_filename": file.filename,
        "path": str(destination),
        "size": destination.stat().st_size,
        "thumbnail_url": thumbnail_url,
    }


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}


def make_thumbnail(video_path: Path, batch: str):
    thumbnail_path = VIDEOS_DIR / batch / "thumbnail.jpg"
    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-ss", "00:00:01",
            "-frames:v", "1",
            str(thumbnail_path),
        ],
        capture_output=True,
    )
    return (
        f"/uploads/videos/{batch}/thumbnail.jpg"
        if result.returncode == 0
        else None
    )


@app.post("/upload/tar")
async def upload_tar(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".tar", ".gz", ".tgz", ".bz2", ".xz"}:
        raise HTTPException(status_code=400, detail="File must be a tar archive")

    saved_images = []
    saved_videos = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        try:
            with tarfile.open(fileobj=file.file) as tar:
                tar.extractall(tmp_path, filter="data")
        except tarfile.TarError:
            raise HTTPException(status_code=400, detail="Invalid tar archive")

        batch_name = next_batch_name()
        batch_dir = IMPORTS_DIR / batch_name
        batch_dir.mkdir(parents=True)

        for item in sorted(tmp_path.rglob("*")):
            if not item.is_file() or item.name.startswith("._"):
                continue
            ext = item.suffix.lower()
            if ext in IMAGE_EXTENSIONS:
                dest = batch_dir / item.name
                if dest.exists():
                    dest = batch_dir / f"{uuid.uuid4().hex}_{item.name}"
                shutil.move(str(item), dest)
                saved_images.append(
                    f"/uploads/imports/{batch_name}/{dest.name}"
                )
            elif ext in VIDEO_EXTENSIONS:
                dest = VIDEOS_DIR / item.name
                if dest.exists():
                    dest = VIDEOS_DIR / f"{uuid.uuid4().hex}_{item.name}"
                shutil.move(str(item), dest)
                make_thumbnail(dest)
                saved_videos.append(f"/uploads/videos/{dest.name}")

    return {
        "batch": batch_name,
        "images": saved_images,
        "videos": saved_videos,
        "image_count": len(saved_images),
        "video_count": len(saved_videos),
    }


@app.get("/videos")
def list_videos():
    videos = []
    for video_dir in sorted(VIDEOS_DIR.iterdir()):
        if not video_dir.is_dir():
            continue
        video_files = [f for f in video_dir.iterdir() if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS]
        if not video_files:
            continue
        video = video_files[0]
        thumbnail = video_dir / "thumbnail.jpg"
        imgs_dir = video_dir / "imgs"
        batch_count = sum(
            1
            for batch_dir in imgs_dir.iterdir()
            if batch_dir.is_dir() and re.fullmatch(r"batch-\d+", batch_dir.name)
        ) if imgs_dir.is_dir() else 0
        videos.append(
            {
                "filename": video_dir.name,
                "original_filename": video.name,
                "video_url": f"/uploads/videos/{video_dir.name}/{video.name}",
                "thumbnail_url": (
                    f"/uploads/videos/{video_dir.name}/thumbnail.jpg"
                    if thumbnail.exists()
                    else None
                ),
                "uploaded_at": video.stat().st_mtime,
                "batch_count": batch_count,
            }
        )
    videos.sort(key=lambda item: item["uploaded_at"], reverse=True)
    return {"videos": videos}


@app.get("/videos/{filename}/images")
def list_video_images(filename: str):
    if any(c in filename for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid filename")
    imgs_dir = VIDEOS_DIR / filename / "imgs"
    if not imgs_dir.is_dir():
        return {"images": []}
    images = []
    for batch_dir in sorted(imgs_dir.iterdir()):
        if not batch_dir.is_dir():
            continue
        for f in sorted(batch_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in _image_extensions():
                images.append(
                    f"/uploads/videos/{filename}/imgs/{batch_dir.name}/{f.name}"
                )
    return {"images": images}


@app.delete("/videos/{filename}")
def delete_video(filename: str):
    if any(c in filename for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid filename")
    video_dir = VIDEOS_DIR / filename
    if not video_dir.is_dir():
        raise HTTPException(status_code=404, detail="Video not found")

    for import_batch in IMPORTS_DIR.iterdir():
        if import_batch.is_dir() and import_batch.name.startswith(f"{filename}-"):
            shutil.rmtree(import_batch)

    if video_dir.exists():
        shutil.rmtree(video_dir)
    return {"deleted": filename}


@app.delete("/videos/{filename}/batches/{batch_name}")
def delete_video_batch(filename: str, batch_name: str):
    if any(c in filename for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if any(c in batch_name for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid batch name")
    match = re.fullmatch(r"batch-(\d+)", batch_name)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid batch name")
    batch_number = match.group(1)

    video_dir = VIDEOS_DIR / filename
    if not video_dir.is_dir():
        raise HTTPException(status_code=404, detail="Video not found")

    batch_dir = video_dir / "imgs" / batch_name
    if batch_dir.is_dir():
        shutil.rmtree(batch_dir)

    for import_batch in IMPORTS_DIR.iterdir():
        if (
            import_batch.is_dir()
            and import_batch.name.startswith(f"{filename}-{batch_number}-")
        ):
            shutil.rmtree(import_batch)

    return {"deleted": batch_name}


@app.get("/classes")
def list_classes():
    model = get_model()
    return {"classes": sorted(set(model.names.values()))}


@app.post("/videos/{filename}/frames")
def extract_frames(
    filename: str,
    frames_per_minute: int,
    margin: int = 0,
    classes: str = "",
    mode: str = "crops",
    confidence: float = 0.70,
):
    if mode not in ("frames", "crops"):
        raise HTTPException(
            status_code=400, detail="mode must be 'frames' or 'crops'"
        )
    if not 1 <= frames_per_minute <= 60:
        raise HTTPException(
            status_code=400,
            detail="frames_per_minute must be between 1 and 60",
        )
    if margin < 0:
        raise HTTPException(
            status_code=400,
            detail="margin must be non-negative",
        )

    video_dir = VIDEOS_DIR / filename
    if not video_dir.is_dir():
        raise HTTPException(status_code=404, detail="Video not found")

    video_files = [
        f
        for f in video_dir.iterdir()
        if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS
    ]
    if not video_files:
        raise HTTPException(status_code=404, detail="Video file not found")
    video_path = video_files[0]
    video_name = filename

    imgs_dir = video_dir / "imgs"
    existing_numbers = [
        int(m.group(1))
        for d in imgs_dir.iterdir()
        if d.is_dir() and (m := re.fullmatch(r"batch-(\d+)", d.name))
    ]
    batch_number = max(existing_numbers, default=0) + 1
    imgs_batch_dir = imgs_dir / f"batch-{batch_number}"
    imgs_batch_dir.mkdir(parents=True)

    output_batch = f"{video_name}-{batch_number}-{mode}"
    output_dir = IMPORTS_DIR / output_batch
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", str(video_path),
                "-vf", f"fps={frames_per_minute}/60",
                str(tmp_path / "frame_%04d.jpg"),
            ],
            capture_output=True,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Failed to extract frames")

        frames = sorted(tmp_path.glob("frame_*.jpg"))

        selected_classes = {c.strip() for c in classes.split(",") if c.strip()}
        need_model = mode == "crops" or (mode == "frames" and selected_classes)
        if need_model:
            model = get_model()

        if mode == "frames":
            frame_urls = []
            frame_index = 0
            for frame in frames:
                if selected_classes:
                    results = model(str(frame), verbose=False)
                    boxes = results[0].boxes if results else None
                    if boxes is None or len(boxes) == 0:
                        continue
                    found = any(
                        conf > confidence and model.names[int(cls)] in selected_classes
                        for conf, cls in zip(boxes.conf.tolist(), boxes.cls.tolist())
                    )
                    if not found:
                        continue
                frame_index += 1
                name = f"batch-{batch_number}-{frame_index:04d}.jpg"
                dest = output_dir / name
                img = Image.open(frame)
                img.save(dest, "JPEG", quality=95)
                shutil.copy2(dest, imgs_batch_dir / name)
                frame_urls.append(f"/uploads/imports/{output_batch}/{name}")
            return {
                "frames_per_minute": frames_per_minute,
                "count": len(frame_urls),
                "frames": frame_urls,
                "crops": [],
                "crop_count": 0,
            }

        crop_urls = []
        crop_index = 0
        for frame in frames:
            results = model(str(frame), verbose=False)
            boxes = results[0].boxes if results else None
            if boxes is None or len(boxes) == 0:
                continue
            image = Image.open(frame)
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
                name = f"batch-{batch_number}-{crop_index:04d}.jpg"
                dest = output_dir / name
                crop.save(dest, "JPEG", quality=95)
                shutil.copy2(dest, imgs_batch_dir / name)
                crop_urls.append(f"/uploads/imports/{output_batch}/{name}")

    return {
        "frames_per_minute": frames_per_minute,
        "crops": crop_urls,
        "crop_count": len(crop_urls),
    }


@app.post("/split-imports")
def split_imports(payload: dict):
    count = max(1, int(payload.get("count", 2)))
    source = payload.get("source")
    source_dir = IMPORTS_DIR / source if source else IMPORTS_DIR
    if not source_dir.exists():
        raise HTTPException(status_code=404, detail="Source batch not found")

    files = [p for p in source_dir.iterdir() if p.is_file()]
    if not files:
        return {"moved": 0, "batches": []}

    n = min(count, len(files))
    batch_dirs = []
    for i in range(n):
        name = f"{source_dir.name}-{i + 1}" if source else next_batch_name()
        batch_dir = IMPORTS_DIR / name
        if batch_dir.exists():
            batch_dir = IMPORTS_DIR / f"{name}-{uuid.uuid4().hex[:4]}"
        batch_dir.mkdir(parents=True)
        batch_dirs.append(batch_dir)

    for index, file in enumerate(files):
        target_dir = batch_dirs[index % n]
        dest = target_dir / file.name
        if dest.exists():
            dest = target_dir / f"{uuid.uuid4().hex}_{file.name}"
        file.rename(dest)

    if source and source_dir.is_dir() and not any(source_dir.iterdir()):
        source_dir.rmdir()

    return {
        "moved": len(files),
        "batches": [d.name for d in batch_dirs],
    }


@app.delete("/batches/{name}")
def delete_batch(name: str):
    batch_dir = (IMPORTS_DIR / name).resolve()
    if (
        not batch_dir.is_relative_to(IMPORTS_DIR.resolve())
        or batch_dir == IMPORTS_DIR.resolve()
        or not batch_dir.is_dir()
    ):
        raise HTTPException(status_code=404, detail="Batch not found")
    shutil.rmtree(batch_dir)
    return {"deleted": name}


def _dataset_summary(name: str, entry: dict):
    batches = entry.get("batches", [])
    previews = [p for p in (batch_first_image(b) for b in batches) if p][:3]
    return {
        "name": name,
        "batches": batches,
        "batch_count": len(batches),
        "split": entry.get("split", dict(DEFAULT_SPLIT)),
        "template": entry.get("template"),
        "previews": previews,
    }


def list_template_names():
    if not TEMPLATES_DIR.is_dir():
        return []
    return sorted(
        d.name
        for d in TEMPLATES_DIR.iterdir()
        if d.is_dir() and (d / "config.yaml").exists()
    )


def load_template_config(template_name: str):
    config_path = TEMPLATES_DIR / template_name / "config.yaml"
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    return yaml.safe_load(config_path.read_text()) or {}


@app.get("/templates")
def get_templates():
    templates = []
    for name in list_template_names():
        config = load_template_config(name)
        templates.append({"name": name, "label": config.get("label", name)})
    return {"templates": templates}


@app.get("/templates/{name}/attributes")
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
    with DATASETS_LOCK:
        datasets = load_datasets()
        if name in datasets:
            raise HTTPException(status_code=400, detail="Dataset already exists")
        datasets[name] = {"batches": [], "split": dict(DEFAULT_SPLIT), "template": None}
        save_datasets(datasets)
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
        del datasets[name]
        save_datasets(datasets)
    dataset_dir = DATASETS_DIR / name
    if dataset_dir.exists():
        shutil.rmtree(dataset_dir)
    return {"deleted": name}


@app.post("/datasets/{name}/template")
def set_dataset_template(name: str, payload: dict):
    template_name = (payload.get("template") or "").strip()
    if not template_name:
        raise HTTPException(status_code=400, detail="Template name required")
    if template_name not in list_template_names():
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    with DATASETS_LOCK:
        datasets = load_datasets()
        if name not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        datasets[name]["template"] = template_name
        save_datasets(datasets)
    return {"dataset": name, "template": template_name}


@app.get("/datasets/{name}/images")
def get_dataset_images(name: str):
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    images = []
    for batch in datasets[name].get("batches", []):
        batch_dir = IMPORTS_DIR / batch
        if batch_dir.is_dir():
            for f in sorted(batch_dir.iterdir()):
                if f.is_file() and f.suffix.lower() in _image_extensions(path=f):
                    images.append(f"/uploads/imports/{batch}/{f.name}")
    return {"dataset": name, "images": images}


def annotations_file(name: str):
    return DATASETS_DIR / name / "annotations.json"


def load_annotations(name: str):
    path = annotations_file(name)
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def save_annotations(name: str, data: dict):
    atomic_write_json(annotations_file(name), data)


@app.get("/datasets/{name}/annotations")
def get_dataset_annotations(name: str):
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"dataset": name, "annotations": load_annotations(name)}


@app.post("/datasets/{name}/annotations")
def set_dataset_annotation(name: str, payload: dict):
    image = payload.get("image")
    values = payload.get("values")
    if not image:
        raise HTTPException(status_code=400, detail="image is required")
    if not isinstance(values, list) or not all(v in (0, 1) for v in values):
        raise HTTPException(status_code=400, detail="values must be a list of 0/1")
    datasets = load_datasets()
    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    # Serialize read-modify-write per dataset so two people annotating
    # different images at the same time don't clobber each other's save.
    with annotation_lock(name):
        annotations = load_annotations(name)
        annotations[image] = values
        save_annotations(name, annotations)
    return {"dataset": name, "image": image, "values": values}


@app.post("/datasets/{name}/assign")
def assign_batch(name: str, payload: dict):
    batch = payload.get("batch")
    if not batch or not (IMPORTS_DIR / batch).is_dir():
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
    payload = payload or {}
    datasets = load_datasets()
    entry = datasets[name]
    template_name = payload.get("template") or entry.get("template") or "paddlepaddle"

    if name not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    batches = entry["batches"]
    split = entry["split"]

    if not batches:
        raise HTTPException(status_code=400, detail="No batches assigned to this dataset")
    if sum(split.values()) != 100:
        raise HTTPException(status_code=400, detail="Split ratios must sum to 100")

    config_path = TEMPLATES_DIR / template_name / "config.yaml"
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    config = yaml.safe_load(config_path.read_text()) or {}
    folder_map = config.get("folder", {})
    text_map = config.get("text", {})

    files = []
    for batch in batches:
        batch_dir = IMPORTS_DIR / batch
        if batch_dir.is_dir():
            files.extend(sorted(p for p in batch_dir.iterdir() if p.is_file()))
    if not files:
        raise HTTPException(status_code=400, detail="No images found in assigned batches")

    random.shuffle(files)
    total = len(files)
    n_train = round(total * split.get("train", 0) / 100)
    n_val = round(total * split.get("val", 0) / 100)
    n_test = total - n_train - n_val

    split_files = {
        "train": files[:n_train],
        "val": files[n_train:n_train + n_val],
        "test": files[n_train + n_val:],
    }

    annotations = load_annotations(name)
    attr_groups = config.get("attributes", [])
    if attr_groups:
        vector_length = max(max(g.get("indices", [0]) or [0]) for g in attr_groups) + 1
    else:
        vector_length = 26
    default_values = [0] * vector_length

    dataset_dir = DATASETS_DIR / name
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
            source_url = f"/uploads/imports/{f.parent.name}/{f.name}"
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

    tar_path = dataset_dir / f"{name}.tar"
    if tar_path.exists():
        tar_path.unlink()
    with tarfile.open(tar_path, "w") as tar:
        for item in sorted(export_dir.iterdir()):
            tar.add(item, arcname=item.name)

    return {
        "dataset": name,
        "template": template_name,
        "counts": counts,
        "missing_annotations": missing_annotations,
        "download": f"/datasets/{name}/download",
    }


@app.get("/datasets/{name}/download")
def download_dataset(name: str):
    tar_path = DATASETS_DIR / name / f"{name}.tar"
    if not tar_path.exists():
        raise HTTPException(status_code=404, detail="Export not found. Run export first.")
    return FileResponse(tar_path, filename=f"{name}.tar", media_type="application/x-tar")


@app.get("/batches")
def list_batches():
    return {
        "batches": sorted(
            d.name for d in IMPORTS_DIR.iterdir() if d.is_dir()
        )
    }


@app.get("/images")
def list_images(batch: str | None = None):
    def _is_frames_batch(name: str) -> bool:
        return name.endswith("-frames")

    def _is_crops_batch(name: str) -> bool:
        return name.endswith("-crops")

    if batch:
        batch_dir = IMPORTS_DIR / batch
        if batch_dir.is_dir():
            imported = [
                f"/uploads/imports/{batch}/{image.name}"
                for image in sorted(batch_dir.iterdir())
                if image.is_file()
            ]
        else:
            imported = []

        frames_batch = IMPORTS_DIR / f"{batch}-frames"
        if frames_batch.is_dir():
            frames = [
                f"/uploads/imports/{frames_batch.name}/{frame.name}"
                for frame in sorted(frames_batch.iterdir())
                if frame.is_file()
            ]
        else:
            frames = []

        crops_batch = IMPORTS_DIR / f"{batch}-crops"
        if crops_batch.is_dir():
            crops = [
                f"/uploads/imports/{crops_batch.name}/{crop.name}"
                for crop in sorted(crops_batch.iterdir())
                if crop.is_file()
            ]
        else:
            crops = []
    else:
        imported = []
        frames = [
            f"/uploads/frames/{image.parent.name}/{image.name}"
            for image in sorted(FRAMES_DIR.rglob("*.jpg"))
            if image.is_file()
        ]
        crops = [
            f"/uploads/crops/{image.name}"
            for image in sorted(CROPS_DIR.iterdir())
            if image.is_file()
        ]
        for batch_dir in sorted(IMPORTS_DIR.iterdir()):
            if not batch_dir.is_dir():
                continue
            for image in sorted(batch_dir.iterdir()):
                if not image.is_file():
                    continue
                url = f"/uploads/imports/{batch_dir.name}/{image.name}"
                if _is_frames_batch(batch_dir.name):
                    frames.append(url)
                elif _is_crops_batch(batch_dir.name):
                    crops.append(url)
                else:
                    imported.append(url)

    return {"imported": imported, "frames": frames, "crops": crops}


@app.post("/images/delete")
def delete_images(payload: dict):
    deleted = []
    uploads_root = UPLOADS_DIR.resolve()
    for url in payload.get("paths", []):
        rel = url.removeprefix("/uploads/")
        target = (UPLOADS_DIR / rel).resolve()
        if not target.is_relative_to(uploads_root):
            continue
        if target.is_file():
            target.unlink()
            deleted.append(url)

    # Clean up any dataset annotations that pointed to deleted images
    if deleted:
        with DATASETS_LOCK:
            datasets = load_datasets()
        for name in datasets:
            with annotation_lock(name):
                annotations = load_annotations(name)
                changed = False
                for url in deleted:
                    if url in annotations:
                        del annotations[url]
                        changed = True
                if changed:
                    save_annotations(name, annotations)

    return {"deleted": len(deleted)}
