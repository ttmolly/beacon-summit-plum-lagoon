# Benchmarks

Numbers below are **measured on the named host** or explicitly marked not
measured. Nothing here is an estimate of ANE, M3 Max, or a T4.

## Host

| Field | Value |
| --- | --- |
| CPU | Intel Xeon Platinum 8481C @ 2.70 GHz |
| Cores | 2 |
| RAM | MemTotal 3.84 GiB, MemAvailable ~3.2 GiB, swap 0 |
| GPU | none (`nvidia-smi` absent) |
| OS | Linux x86_64 |
| Python | 3.10 |
| ONNX Runtime | 1.23.2 (CPU Execution Provider only) |
| PyTorch | 2.14.0+cpu, used for conversion attempts and the distilled baseline only |
| Energy | RAPL sysfs not readable; no figure is reported |

## Official Laya — not measured

`models/typed`, `models/english`, and `models/multi` do not exist on this
host. The table the runtime is supposed to fill in, once those bundles exist:

| Implementation | P50 batch 1 | P95 batch 1 | decisions/s | Peak RSS | Import `moka` | Bundle bytes vs Hub safetensors |
| --- | --- | --- | --- | --- | --- | --- |
| official `laya` / PyTorch (`pip install laya`) | not measured | not measured | not measured | not measured | imports torch | Hub file itself |
| Moka ORT CPU FP32 | not measured | not measured | not measured | not measured | must not import torch | not measured |
| Moka ORT CUDA | no GPU | — | — | — | — | — |
| Moka ORT INT8 | not a default unless fidelity `passed: true` | — | — | — | — | — |

Batch-1 is the real `predict()` shape. A second row with `--questions 8` is
the small batched run, also not measured here. If ORT CPU lands within noise
of official PyTorch, write that. Do not invent a 10×.

File sizes that **are** known, because they are the Hub blobs (not Moka
bundles): typed 842,609,220 bytes, english 842,609,210 bytes, multilingual
643,835,514 bytes, all FP16 safetensors. The FP32 ONNX will be larger. That
size is not measured until a convert finishes.

Commands that produce the missing rows are in [RELEASE.md](RELEASE.md).

## Distilled reference model, not Laya

Host as above. Graph is `moka-tiny` (hidden 64, 4 layers), **not** a
convaiinnovations checkpoint. 40 measured calls after 8 warmup.
JSON: `benchmarks/results/`.

| Implementation | P50 | P95 | decisions/s |
| --- | ---: | ---: | ---: |
| PyTorch eager `DecisionModel` forward (student) | 2.97 ms | 3.60 ms | 324 |
| ORT CPU FP32 (student) | 2.45 ms | 2.67 ms | 407 |

Speedup vs eager on this student: **1.21×**. Not a Laya number. Not 10×.

`import moka` in a fresh process does not import torch or transformers.
Measured on this host: **0.065 s**, RSS **27 MiB** (28,184,576 bytes). Loading
`moka-tiny` on CPU EP then one `predict` peaked at **57 MiB** RSS
(VmHWM 59,600,896 bytes after the call). That is the student graph, about
1.3 MB of ONNX, not a 421M checkpoint.

Energy: RAPL unread; nvidia-smi absent. `energy.available = false`.

Snake on the student (headless, 180 steps, seed 7, 12×8): score 13, 6 shield
interventions, 233 decisions/s including inference. Not a Laya policy claim.
JSON: `benchmarks/results/snake-tiny.json`.

## Methodology

- End-to-end wall time includes prompt construction, tokenization, input
  arrays, `InferenceSession.run`, calibration and result formatting.
- Loading and warmup calls are excluded.
- P50 / P95 over the recorded sample. Throughput is `1000 / mean_ms`
  decisions per second for that call shape.
- Jobs run sequentially. `deterministic=False` for speed, `True` for the
  fidelity gate.
- Energy: RAPL `energy_uj` is the planned CPU sensor. It was **not
  readable** on this host. nvidia-smi was **not present**. The JSON records
  `energy.available = false` and a reason instead of a made-up joule.

## Comparison contract

A speedup is only a speedup against **the same checkpoint, the same
questions, the same host**:

| Implementation | What it is |
| --- | --- |
| PyTorch eager `DecisionModel` | Baseline |
| ORT CPU FP32 | Default Moka runtime |
| ORT CPU INT8 | Approximate, gated |
| ORT CUDA / TensorRT / OpenVINO | Not measured here |

If INT8 is slower than FP32 on CPU (it can be, for small graphs), that is
the result. Package-size reduction is not a speed ratio.

## Snake

Headless `moka-snake --max-speed --steps 200` logs decisions/sec and
safety interventions. Terminal painting is excluded from the rate, matching
laya-coreml's game-loop notes.
