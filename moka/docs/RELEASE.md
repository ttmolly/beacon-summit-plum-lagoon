# Release

Moka 0.1.0 is a source release of the Linux runtime, conversion CLI, tests
and studio. Model weights are **not** in git.

## Manual job: official bundles

This conversion host cannot run it (3.84 GiB RAM, ~3.2 GiB available, no
swap). `moka convert` exits 2 without downloading weights. Do not point
`models/typed` or `models/english` at `moka-tiny`.

Need, per checkpoint, before you start:

| Bundle | Command source | MemAvailable | Free disk | Hub safetensors |
| --- | --- | --- | --- | --- |
| `models/typed` | `laya-typed-decisions` | 6.71 GiB (8 GiB safer, 16 GiB physical recommended) | 4 GiB | 842,609,220 bytes |
| `models/english` | `laya` | 6.71 GiB | 4 GiB | 842,609,210 bytes |
| `models/multi` | `laya-multilingual` | 5.60 GiB | 3 GiB | 643,835,514 bytes |

All three, sequential: 8 GiB MemAvailable and **20 GiB free disk** (HF cache
plus three FP32 ONNX bundles). CPU-only is fine. No GPU required.

```bash
pip install 'moka[convert]'
# optional, only for the official-package column of the fidelity report:
pip install laya

moka convert laya-typed-decisions models/typed
moka convert laya models/english
moka convert laya-multilingual models/multi

# Export-graph reference (PyTorch, same checkpoint the bundle was built from).
# Replace the snapshot hash directory with the one convert recorded in
# moka_config.json ("revision").
SNAP_TYPED="$HOME/.cache/huggingface/hub/models--convaiinnovations--laya-typed-decisions/snapshots/f9ab0b228f0fc0f14d873dbc99038f135c2da1b2"
SNAP_EN="$HOME/.cache/huggingface/hub/models--convaiinnovations--laya/snapshots/c5d78730f3493e4fe16d61507ef4b78eef7318cf"
SNAP_MULTI="$HOME/.cache/huggingface/hub/models--convaiinnovations--laya-multilingual/snapshots/052592a15d198d9ad47da779604259b10b47b7aa"

moka validate models/typed --reference "$SNAP_TYPED" --laya "$SNAP_TYPED" \
  --output fidelity-typed.json
moka validate models/english --reference "$SNAP_EN" --laya "$SNAP_EN" \
  --output fidelity-english.json
moka validate models/multi --reference "$SNAP_MULTI" --laya "$SNAP_MULTI" \
  --output fidelity-multi.json

# Batch-1 is the real predict() shape. The second call is a small batch.
moka benchmark models/typed --warmup 10 --runs 100 --questions 1 \
  --output bench-typed.json
moka benchmark models/typed --warmup 5 --runs 50 --questions 8 \
  --output bench-typed-batch.json
moka benchmark models/english --warmup 10 --runs 100 --questions 1 \
  --output bench-english.json
moka benchmark models/multi --warmup 10 --runs 100 --questions 1 \
  --output bench-multi.json
```

`moka validate` without `--laya` is the export-graph gate only. `--laya`
also runs `laya.predict` on the same fixtures (including
`发票被重复扣款，请退款。`) and records selected-answer match plus calibrated
probability drift. A failed row stays `"passed": false`. INT8
(`--quantize int8`) is not a default unless that JSON says `"passed": true`.

`import moka` / `moka.load` does not import torch. `import laya` does.
Benchmark JSON includes `import_footprint` (fresh process) and
`rss_after_load_bytes`.

Pinned revisions, checked by downloading `encoder/config.json` and
`rl_agent_config.json` only:

| Short name | Hugging Face repo | Pinned revision | Context |
| --- | --- | --- | --- |
| `laya` | convaiinnovations/laya | `c5d78730f3493e4fe16d61507ef4b78eef7318cf` | 512 |
| `laya-multilingual` | convaiinnovations/laya-multilingual | `052592a15d198d9ad47da779604259b10b47b7aa` | 1024 |
| `laya-typed-decisions` | convaiinnovations/laya-typed-decisions | `f9ab0b228f0fc0f14d873dbc99038f135c2da1b2` | 1024 |

Hub `main` for `convaiinnovations/laya` had moved to `1c5edc17` as of
2026-09-20. Moka still pins the laya-coreml revision above so a bundle and a
Core ML package of the same name can be compared. Pass `--revision` to
override.

## What 0.1.0 actually ships

| Artifact | Status |
| --- | --- |
| `moka` Python package (ORT inference, CLI, Snake) | yes |
| `moka[convert]` export graph | yes |
| Linux GitHub Actions (pytest + ruff) | yes |
| `moka-tiny` ONNX (studio + CI only) | yes — **distilled reference model, not Laya** |
| Hub-converted `models/typed`, `models/english`, `models/multi` | **no** — this host refused on RAM |
| CUDA / TensorRT / OpenVINO wheels tested | **not in this release** |
| INT8 as default | **no** — approximate, gated |

A later release that publishes Hub ONNX bundles must include the fidelity
JSON in the same commit as the weights, the way laya-coreml's
`docs/RELEASE.md` tables sit next to the Hub revisions.
