# Port fidelity and limits

Written in the same register as laya-coreml's engineering-limits notes:
what matched, what was not attempted, and what must not be cited as a win.

## Gate

A bundle ships as a default only if:

1. Selected answers match the PyTorch export-graph reference on **every**
   fixture question (choice argmax, noul true/false, score within budget).
2. Maximum calibrated probability drift ≤ the budget for that precision
   (FP32 `1e-4`, FP16/INT8 `0.02`).
3. Repeated identical API calls (`deterministic=True`, 20+ repeats) return
   bit-identical printed answers.

These are **conversion-fidelity** fixtures, not proof of general task
accuracy on AG News, typed-decisions, or anything else. That evaluation
belongs to upstream Laya.

The fixture set is the laya-coreml / laya-mlx parity suite (email triage
state, multilingual refund strings, empty/long/structured/mask cases),
adapted where the compact student tokenizer cannot represent CJK scripts.
When running against a real Hub checkpoint, use the unmodified multilingual
strings.

## Official Hub checkpoints — not converted on this host

This machine is an Intel Xeon Platinum 8481C, 2 cores, MemTotal 3.84 GiB,
MemAvailable about 3.2 GiB, **0 swap**, `vm.overcommit_memory=1` (the OOM
killer, not a clean allocation failure). No NVIDIA GPU.

| Bundle | Source | Weights on disk | FP32 params | Refusal threshold | Result |
| --- | --- | --- | --- | --- | --- |
| `models/typed` | `convaiinnovations/laya-typed-decisions` @ `f9ab0b228f0fc0f14d873dbc99038f135c2da1b2` | 842,609,220 bytes FP16 | 421,293,830 | 6.71 GiB MemAvailable | **not converted** |
| `models/english` | `convaiinnovations/laya` @ `c5d78730f3493e4fe16d61507ef4b78eef7318cf` | 842,609,210 bytes FP16 | 421,293,830 | 6.71 GiB MemAvailable | **not converted** |
| `models/multi` | `convaiinnovations/laya-multilingual` @ `052592a15d198d9ad47da779604259b10b47b7aa` | 643,835,514 bytes FP16 | 321,908,998 | 5.60 GiB MemAvailable | **not converted** |

`moka convert` exits 2 before downloading safetensors and before importing
torch. Nothing was written under those directory names. A smaller checkpoint
is not accepted as a substitute for `typed`, `english`, or `multi`.

Official answer parity (`moka validate <bundle> --laya <pinned-snapshot>`)
was **not run**. It needs `pip install laya` and the bundles above. The
comparison is selected answers plus calibrated probabilities against
`laya.predict`, in addition to the export-graph PyTorch reference.

Hub fixtures keep the laya-mlx Chinese line `发票被重复扣款，请退款。`.
The distilled suite's `zh` / `ja` / `hi` / `ru` / `de` / `fr` / `es` rows are
ASCII stand-ins. They are not Hub results, and they are not dropped from the
Hub set in silence. The student tokenizer maps that Chinese line to `[UNK]`
only.

Configs at the pinned revisions were downloaded (a few KB each). Temperatures
in those `rl_agent_config.json` files sit inside `[0.5, 5.0]`.

## Distilled reference model, not Laya

`moka-tiny` is a hidden-64, 4-layer student used so CI and the browser studio
can execute the same export graph. It is not `convaiinnovations/laya`, not
typed-decisions, and not multilingual. Do not quote these rows as Laya parity
or as a Linux speedup over official Laya.

| Artifact | Selected answers | Max calibrated drift | Repeated calls | Shipped as a Laya default |
| --- | --- | --- | --- | --- |
| `moka-tiny` FP32 ONNX vs its own PyTorch export graph | **43/43** | **0.0** | 20, stable | **no** — distilled reference only |
| `moka-tiny` INT8 dynamic quant | **41/43** | 0.0098 (inside 0.02) | 10, stable | **no** — answer-match failed |

## Other paths not present here

| Artifact | Selected answers | Max calibrated drift | Repeated calls | Shipped as default |
| --- | --- | --- | --- | --- |
| CUDA / TensorRT / OpenVINO | **not present** | — | — | no |

If a later machine converts a Hub checkpoint and the gate fails, the JSON
must keep `"passed": false` and that configuration must not be advertised
as the default. Quietly omitting a failed row is the thing this document
exists to prevent.

## Known limits, stated

- **The requested 10× vs PyTorch was not a target we could even attempt on
  421M here.** On `moka-tiny`, speedup vs the same graph in eager PyTorch is
  whatever `benchmarks/results/latency-tiny.json` says. A 2-core CPU with a
  64-wide student is not ANE.
- Dynamic-axis ONNX on CPU did **not** reproduce Core ML's RangeDim GPU
  failure. That is a different compiler. It is not evidence that CUDA EP
  dynamic axes are safe; CUDA was not tested.
- The Snake demo's compact prompt already injects planner features ("Safe.
  Best route to food."). A student that reads those strings will play; that
  is a runtime demo, not a claim that Moka discovered a new Snake policy.
- Calibration clamp `[0.5, 5.0]` is inherited from upstream v0.3.5. Moka
  does not invent a new temperature.

## What "accelerated" means on Linux, after measurement

If ORT CPU is within noise of PyTorch eager on a given checkpoint, say so.
laya-coreml reported that the ordinary SDPA Core ML export did not beat
compiled MLX, and that the requested 10× ANE win was not achieved. Moka
will not invent a 10× on a Xeon that did not run the 421M graph.
