"""Inference-only helper for SigLIP2 multi-attribute checkpoints produced by
`train_siglip2_attributes.py` (see /home/me/disk-256/00_RND_MODELS/paddlepaddle/siglip2/).

Deliberately duplicates the tiny model definition rather than importing the
training script, which lives outside this repo and pulls in training-only
code. Kept dependency-light: only needs `torch` + `transformers`, both
already required by the `closure` conda env the server runs in.
"""
from __future__ import annotations

from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from transformers import AutoImageProcessor, AutoModel


class Siglip2AttributeModel(nn.Module):
    """SigLIP2 vision tower + one linear head per attribute group.

    `groups` is the list of {"name", "options"} dicts saved inside the
    checkpoint by the training script — defines the heads and the order of
    classes each head's logits correspond to.
    """

    def __init__(self, checkpoint: str, groups: list[dict]):
        super().__init__()
        backbone = AutoModel.from_pretrained(checkpoint).vision_model
        hidden_size = backbone.config.hidden_size
        self.backbone = backbone
        self.heads = nn.ModuleDict(
            {g["name"].lower(): nn.Linear(hidden_size, len(g["options"])) for g in groups}
        )

    def forward(self, pixel_values):
        pooled = self.backbone(pixel_values=pixel_values).pooler_output
        return {key: head(pooled) for key, head in self.heads.items()}


def find_checkpoint_file(model_dir: Path) -> Path | None:
    for name in ("best.pt", "last.pt"):
        candidate = model_dir / name
        if candidate.is_file():
            return candidate
    return None


def load_predictor(model_dir: Path):
    """Loads a trained checkpoint and returns (model, processor, groups, device)."""
    ckpt_path = find_checkpoint_file(model_dir)
    if ckpt_path is None:
        raise FileNotFoundError(f"No best.pt/last.pt checkpoint found in {model_dir}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt = torch.load(ckpt_path, map_location=device)
    base_checkpoint = ckpt.get("checkpoint")
    groups = ckpt.get("groups") or []
    if not base_checkpoint or not groups:
        raise ValueError(f"Checkpoint {ckpt_path} is missing 'checkpoint'/'groups' metadata")

    model = Siglip2AttributeModel(base_checkpoint, groups).to(device)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    processor = AutoImageProcessor.from_pretrained(base_checkpoint)
    return model, processor, groups, device


def predict_values(image_path: Path, predictor, attr_groups: list[dict]) -> list[int]:
    """Runs the model and returns a one-hot vector matching the template's
    current attribute layout (`attr_groups`, as returned by the template's
    config.yaml — name/options/indices).

    Predictions are mapped back from the checkpoint's own group option order
    into the config's current option order/indices by option name, so minor
    reordering (not removal/renaming) of options after training still works.
    """
    model, processor, ckpt_groups, device = predictor

    image = Image.open(image_path).convert("RGB")
    pixel_values = processor(images=image, return_tensors="pt")["pixel_values"].to(device)

    with torch.no_grad():
        logits = model(pixel_values)

    vector_length = max((max(g.get("indices", [0]) or [0]) for g in attr_groups), default=-1) + 1
    values = [0] * max(vector_length, 1)

    ckpt_groups_by_key = {g["name"].lower(): g for g in ckpt_groups}

    for group in attr_groups:
        key = group["name"].lower()
        if key not in logits:
            continue
        ckpt_group = ckpt_groups_by_key.get(key)
        if not ckpt_group:
            continue

        pred_idx = int(logits[key].argmax(dim=-1).item())
        if pred_idx >= len(ckpt_group["options"]):
            continue
        option_name = str(ckpt_group["options"][pred_idx]).lower()

        config_options = [str(o).lower() for o in group.get("options", [])]
        if option_name not in config_options:
            continue
        local_idx = config_options.index(option_name)

        indices = group.get("indices") or []
        if local_idx < len(indices):
            values[indices[local_idx]] = 1

    return values
