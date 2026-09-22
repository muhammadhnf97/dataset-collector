# Dataset Collector

Internal tool for collecting, annotating, and exporting person-attribute
datasets (bunch_of_images), built around the PaddleClas
PULC person-attribute model (26-bit PA-100K label vector).

- **Server**: FastAPI + SQLAlchemy + SQLite (`server/`)
- **Client**: React 19 + Vite + Tailwind CSS v4 (`client/`)
- **Pre-labeling**: bundled Paddle inference model + YOLO (`yolo26l.pt`) for person crops

## Quick start

```bash
./start-tmux.sh
```

Creates a detached tmux session `dataset-collector` with two windows:

| Window | Command | Port |
|---|---|---|
| `server` | `uvicorn main:app --reload --port 8888` (conda env `closure`) | 8888 |
| `client` | `pnpm dev --host` (Node 22) | 5173 |

See `TMUX.md` for attach/log/stop commands.

Manual alternative:

```bash
# server (conda env: closure, deps in server/requirements.txt)
cd server && uvicorn main:app --reload --host 0.0.0.0 --port 8888

# client
cd client && pnpm install && pnpm dev
```

## Workflow

1. **Upload** — drop a `.tar` of person crops or individual images. Top-level
   folders become batches (`raw-images/<batch>`). Optionally tag with a source.
2. **Create a dataset** — pick a template (`paddlepaddle / pulc_person_attribute`)
   which supplies the attribute schema, reference images, and pre-label model.
3. **Assign images** — add/remove batches or images. Removal is non-destructive;
   source uploads stay on disk.
4. **Pre-label** — runs the bundled inference model over dataset images and
   stores predictions as `pre_labels`, so annotators correct instead of
   labeling from scratch.
5. **Annotate** — per-attribute-group correction UI (Indonesian aliases).
   Every save is diffed against `pre_labels`; changed bits are logged.
6. **Export** — produces `train/`, `val/`, `test/` folders plus
   `*_list.txt` files in PA-100K format (`path + 26 label bits`), packed as a
   downloadable tar.

## Annotation & activity model

- `annotations` — one row per `(dataset, image)`; stores the current 26-bit
  `values`, the model `pre_labels`, `updated_by`, `last_attr`.
- `activity_log` — append-only `annotate` events (with `changed_indices`,
  `corrected` counts) plus upserted `check` events per `(user, image, attr)`.
- Corrections = bit-level diffs between `values` and `pre_labels`, credited
  to `updated_by`. Re-saving identical values logs a `check`, not a correction.

### Multi-user features

- **User identity** — pick/verify a user; shown globally; every action is
  attributed.
- **Leaderboard** — per-user corrections, images corrected/annotated/reviewed.
- **Resume** — "From last edited" jumps back to where you left off.
- **Per-attribute reviewers** — each attribute group shows who reviewed it.
- **Batch handler chips** — batch strip shows coverage % per batch; click for
  per-contributor breakdown (image × attribute coverage, not just touched).
- **Overlap warning** — entering a batch another user has worked on shows a
  soft warning with their progress. Advisory only — never blocks.

## Export split logic

Default ratio `70/20/10` (editable per dataset, must sum to 100).

Two modes:

- **Group-aware (default, `group_split: true`)** — 64-bit perceptual hash per
  image; near-duplicates (≤12 bit difference, i.e. same person/burst) cluster
  into indivisible groups. Groups are shuffled and greedily assigned to the
  most under-filled split, so a near-duplicate can never leak across
  train/val/test and inflate validation scores.
- **Naive (`group_split: false`)** — plain shuffle + proportional cut.

Splits are random per export (no seed) and not stratified by attribute.

## Layout

```text
server/
  main.py        all API endpoints
  db.py          SQLAlchemy models (SQLite, data.db — gitignored)
  uploads/       raw uploaded images, organized by batch
  datasets/<name>/
    manifest.json
    export/      latest export (train/val/test + lists)
    pre-label-model/  unpacked inference model
  template/<framework>/<model>/
    config.yaml  attribute schema: groups, indices, options, aliases
    attribute/   per-attribute reference images
    person_attribute_infer.tar  bundled pre-label model
  archives/      tar snapshots of datasets (restorable)
client/src/App.jsx  single-page UI
```

## Integration with PaddleClas

Exports unpack directly into `PaddleClas-headless/dataset/`:

```bash
cd PaddleClas-headless/dataset
mkdir bunch_of_images-N && tar -xf "exported.tar" -C bunch_of_images-N
```

Then train/finetune with a `ppcls/configs/PULC/person_attribute/` config
pointed at the new `image_root`/`cls_label_path`, export the model with
`tools/export_model.py`, and drop the resulting inference tar into the
template dir to upgrade pre-labeling.
