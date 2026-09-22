# Conversion notes

The export loads **original Laya checkpoints** into FP32 PyTorch modules, strictly
checks all state-dict keys, and writes an ONNX graph plus a self-contained bundle.
The published checkpoint files themselves contain predominantly FP16 tensors;
FP32 here describes the export/reference computation, not higher-precision source
weights. No training or pruning is performed on Hub weights.

The runtime uses the checkpoint's tokenizer, prompt layout, option markers,
question-type embedding, decision head, action head, and calibration temperatures.
Choice, score, noul, structured criteria, token accounting, and zero generated
tokens follow the upstream API. The encoder is bidirectional: every question
still runs its own encoder sequence. There is no shared-state hidden-state cache.

## Why ONNX Runtime, not eager PyTorch

laya-coreml exists because Core ML + ANE is a *different compiler* from the
training stack. Moka's job on Linux is the same: a compiled inference graph
that does not import Transformers at run time.

- **CPU Execution Provider** is the baseline everyone can run. Graph fusion,
  memory planning and a C++ kernel library are the actual acceleration vs.
  PyTorch eager on a CPU host.
- **CUDA EP** is the NVIDIA analogue of Core ML CPU+GPU. Opt-in.
- **TensorRT EP** is the analogue of an ANE rewrite: it can be faster and it
  can change numerics. Opt-in, fidelity-gated, never a silent default.
- **OpenVINO EP** is a genuine candidate on Intel CPUs. It is not the default
  because it is not portable (AMD, ARM, most CI images) and was **not
  measured** on the conversion host — `onnxruntime-openvino` was not installed
  there. If it does not beat CPU EP on a given Xeon, say so; do not ship it as
  a default on faith.
- **INT8 dynamic quantization** (ONNX Runtime `quantize_dynamic`, QInt8
  weights, FP32 activations) is the W8 analogue. Approximate. Labelled in
  `moka_config.json` as `"approximate": true`. A bundle that misses the 0.02
  drift gate is not a default.

FP16 ONNX on **CPU** is often slower than FP32 (incomplete CPU FP16 kernels).
FP16 is therefore not the CPU default. It remains available for CUDA hosts.

## Validated conversion choices

- `torch` CPU wheel 2.14, `onnxruntime` 1.23, `numpy` 2.2, Python 3.10 on the
  conversion host. Pin what you actually ran in `moka_config.json`.
- Export-only `DecisionModel` with **explicit** matmul/softmax attention.
  SDPA is retained as `--attention sdpa` for experiments: it can emit
  FlashAttention-style ops that CPU EP cannot run.
- ONNX opset 17. Dynamic batch and dynamic sequence axes are the default.
  Unlike Core ML `RangeDim` + GPU, ORT dynamic axes on CPU were numerically
  stable on the tiny-graph gate (see tests). Inputs exceeding `max_length` or
  `max_options` raise; they are not silently truncated.
- Sequence padding is to a multiple of 16. Padding tokens are masked and must
  not change valid logits (unit-tested).
- Dummy ONNX inputs are traced at a short length (32) with dynamic axes so a
  512/1024 export does not require a 1024-token trace on a 4 GiB box.

## Failures retained for reproducibility

These are observations on this machine, not claims about every ORT version.

1. **Full Hub conversion did not run here, and it was not faked.**
   `laya` and `laya-typed-decisions` are 421,293,830 params, FP16 safetensors
   of 842,609,210 and 842,609,220 bytes. `laya-multilingual` is 321,908,998
   params, 643,835,514 bytes. The refusal threshold is 3× the FP32 weight
   bytes plus 2 GiB (6.71 GiB and 5.60 GiB MemAvailable). This host had
   ~3.2 GiB available and no swap. `moka convert` exits 2 before the
   download. CI still proves the export graph on `moka-tiny`, which is a
   distilled reference model, not Laya, and is not written to `models/typed`
   or `models/english`.
2. **RAPL energy counters were unreadable** (`intel-rapl` sysfs absent or
   permission denied). nvidia-smi is absent. Energy per decision is therefore
   **not reported**, with the reason attached to the benchmark JSON, instead
   of a guessed joule figure.
3. **OpenVINO was not installed.** No Intel-vs-CPU-EP number is claimed.
4. **TensorRT was not installed.** No TensorRT speedup is claimed. The
   provider is still refused as an `auto` choice so a future CUDA box cannot
   silently switch numerics.
5. **INT8** is exported by the CLI and labelled approximate. On `moka-tiny`
   it is expected to pass or fail the 0.02 gate; whichever happens is recorded
   in `docs/FIDELITY.md`. A failed INT8 does not ship as default, the way
   laya-coreml refused 6-bit/4-bit.
6. **SDPA export** is not the default. If CPU EP rejects an SDPA graph, that
   is a conversion failure, not an inference fallback to PyTorch.

## Bundle contract

```
output/
  model.onnx
  tokenizer/tokenizer.json
  tokenizer/tokenizer_config.json
  encoder/config.json
  rl_agent_config.json
  moka_config.json      # format, revision, sha256, shape, versions
  checksums.json
```

`moka_config.json` records the upstream revision the bundle was converted
from. A caller never needs the training checkout.
