# PULC Person Attribute — Verified Semantics

Reference images in this folder are sampled from PA-100K `train_list.txt`
labels (the exact file PaddleClas trains on). Conventions below were verified
against both the label file AND live inference of the exported base model.

## Attribute index map (26-dim vector)

| Indices | Group | Options |
|---|---|---|
| 0 | Hat | Hat |
| 1 | Glasses | Glasses |
| 2–7 | Upper | ShortSleeve, LongSleeve, UpperStride, UpperLogo, UpperPlaid, UpperSplice |
| 8–13 | Lower | LowerStripe, LowerPattern, LongCoat, Trousers, Shorts, Skirt&Dress |
| 14 | Boots | Boots |
| 15–17 | Bag | HandBag, ShoulderBag, Backpack |
| 18 | HoldObjectsInFront | HoldObjectsInFront |
| 19–21 | Age | **AgeOver60, Age18-60, AgeLess18** |
| 22 | Gender | Female (0 = Male) |
| 23–25 | Direction | Front, Side, Back |

## Upstream bugs found (verified 2026-09-19)

### Age order is swapped in PaddleClas's decoder

PA-100K's label file orders Age as `[AgeOver60, Age18-60, AgeLess18]` at
indices 19–21. PaddleClas's `attr_rec.py` / `deploy/postprocess.py` decode
`res[19:22]` as `[AgeLess18, Age18-60, AgeOver60]` — swapped.

Verified empirically: batch inference shows col-19-labeled images (visually
elderly) argmax at index 19 in 18/20 cases; col-21-labeled images (visually
children) argmax at index 21 in 20/20. The model is correct; only the
upstream naming was wrong.

### UpperPlaid / UpperSplice are effectively swapped vs. English intuition

- `UpperSplice` (idx 7) labels → checkered/plaid shirts → alias `Kotak-kotak`
- `UpperPlaid` (idx 6) labels → contrast/two-tone/paneled tops → alias `Kombinasi`

Zero images carry both labels — annotators treated them as a mutually
exclusive pair, backwards from the English names.

## Annotation conventions

- **HoldObjectsInFront**: object must visibly occupy the space in front of
  the torso with arm(s) engaged — boxes, carried babies, bags cradled in
  front, umbrella held forward. NOT: phone/coffee held in one hand at the
  side. PaddleClas uses a stricter threshold (0.6) for this attribute.
- **One-piece dress**: `Skirt&Dress` in Lower + the dress's top half drives
  Upper attributes (sleeve length, pattern). PA-100K labels every dress
  wearer with exactly one sleeve attribute.
- **Boots**: boots only — sneakers/sandals count as "No boots" (very rare
  class, ~0.6% of PA-100K).
- **UpperLogo**: actually covers any graphic/text print, not just brand
  logos → alias `Bergambar`.

## Data migration note

`pre_labels` are raw model output — always semantically correct, never swap.

User-set `values` written under the old (swapped) Age labels are flipped:
any annotation where the Age slice was manually overridden needs indices
19↔21 swapped. Rows where the user accepted the pre-label Age unchanged
are already correct and must not be touched.
