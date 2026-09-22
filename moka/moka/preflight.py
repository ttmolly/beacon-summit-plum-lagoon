"""Refuse official Hub conversion when this machine cannot hold the weights.

A resource limit is a stop, not a reason to write a smaller model under
models/typed, models/english, or models/multi. The check runs before any
snapshot download and before PyTorch allocates the FP32 module.
"""

from __future__ import annotations

import json
import os
import shutil
import struct
from pathlib import Path

# File sizes and parameter counts read from the Hub tree API
# (convaiinnovations/* , main, 2026-09-23). Stored weights are FP16.
# Revisions are the ones laya-coreml pins; configs at those revisions were
# downloaded (encoder + rl_agent only, not the safetensors).
OFFICIAL = {
    "laya": {
        "repo": "convaiinnovations/laya",
        "revision": "c5d78730f3493e4fe16d61507ef4b78eef7318cf",
        "params": 421_293_830,
        "safetensors_bytes": 842_609_210,
        "stored_dtype": "F16",
        "encoder": "answerdotai/ModernBERT-large",
        "hidden_size": 1024,
        "layers": 28,
        "max_len": 512,
        "bundle_name": "english",
    },
    "laya-typed-decisions": {
        "repo": "convaiinnovations/laya-typed-decisions",
        "revision": "f9ab0b228f0fc0f14d873dbc99038f135c2da1b2",
        "params": 421_293_830,
        "safetensors_bytes": 842_609_220,
        "stored_dtype": "F16",
        "encoder": "answerdotai/ModernBERT-large",
        "hidden_size": 1024,
        "layers": 28,
        "max_len": 1024,
        "bundle_name": "typed",
    },
    "laya-multilingual": {
        "repo": "convaiinnovations/laya-multilingual",
        "revision": "052592a15d198d9ad47da779604259b10b47b7aa",
        "params": 321_908_998,
        "safetensors_bytes": 643_835_514,
        "stored_dtype": "F16",
        "encoder": "jhu-clsp/mmBERT-base",
        "hidden_size": 768,
        "layers": 22,
        "max_len": 1024,
        "bundle_name": "multi",
    },
}

# models/<name> is reserved for that official checkpoint's safetensors byte size.
RESERVED_BUNDLE_NAMES = {spec["bundle_name"]: key for key, spec in OFFICIAL.items()}

# Refusal threshold, not a measured peak RSS. This host cannot allocate the
# first FP32 copy without inviting the OOM killer (overcommit, no swap), so
# peak was not measured. Three weight-sized copies: Torch module, ONNX proto,
# exporter scratch, plus a fixed runtime reserve for libtorch itself.
RUNTIME_RESERVE_BYTES = 2 * 1024**3


class InsufficientResources(RuntimeError):
    """Raised before download or tensor allocation."""


class ReservedBundleName(RuntimeError):
    """models/typed|english|multi must be the official checkpoint, not a stand-in."""


def short_name(source) -> str:
    text = str(source).strip().rstrip("/")
    return text.removeprefix("convaiinnovations/")


def official_spec(source):
    return OFFICIAL.get(short_name(source))


def required_ram_bytes(params: int) -> int:
    return params * 4 * 3 + RUNTIME_RESERVE_BYTES


def required_disk_bytes(safetensors_bytes: int, params: int) -> int:
    # Source file stays on disk, FP32 ONNX is about params*4, plus 1 GiB scratch.
    return int(safetensors_bytes) + params * 4 + 1024**3


def mem_available_bytes() -> int | None:
    try:
        with open("/proc/meminfo") as handle:
            info = {}
            for line in handle:
                key, _, rest = line.partition(":")
                info[key] = int(rest.split()[0]) * 1024
    except OSError:
        return None
    return info.get("MemAvailable")


def meminfo_bytes() -> dict:
    out = {"MemTotal": None, "MemAvailable": None, "SwapTotal": None}
    try:
        with open("/proc/meminfo") as handle:
            for line in handle:
                key, _, rest = line.partition(":")
                if key in out:
                    out[key] = int(rest.split()[0]) * 1024
    except OSError:
        pass
    return out


def _gib(n) -> str:
    if n is None:
        return "unknown"
    return f"{n / 1024**3:.2f} GiB"


def safetensors_summary(path: Path) -> tuple[int, str]:
    """Parameter count and a dtype name from the header only. Does not map tensors."""
    with Path(path).open("rb") as stream:
        raw = stream.read(8)
        if len(raw) != 8:
            raise ValueError(f"{path} is not a safetensors file")
        (nbytes,) = struct.unpack("<Q", raw)
        header = json.loads(stream.read(nbytes))
    params = 0
    dtype = "unknown"
    for key, meta in header.items():
        if key == "__metadata__":
            continue
        shape = meta.get("shape") or []
        count = 1
        for dim in shape:
            count *= int(dim)
        params += count
        dtype = str(meta.get("dtype", dtype))
    return params, dtype


def _refusal_message(spec, *, have_ram, have_disk, need_ram, need_disk, destination) -> str:
    info = meminfo_bytes()
    return (
        f"Refusing to convert {spec['repo']} -> {destination}.\n"
        "This machine cannot hold the official checkpoint. "
        "No weights were downloaded and no bundle was written.\n"
        f"  revision:  {spec['revision']}\n"
        f"  weights:   {spec['safetensors_bytes']:,} bytes {spec['stored_dtype']} "
        f"({spec['params']:,} params, {spec['encoder']}, "
        f"hidden {spec['hidden_size']}, {spec['layers']} layers, max_len {spec['max_len']})\n"
        f"  need:      {_gib(need_ram)} MemAvailable, {_gib(need_disk)} free disk\n"
        f"  have:      {_gib(have_ram)} MemAvailable, {_gib(have_disk)} free disk, "
        f"{_gib(info.get('SwapTotal'))} swap, {os.cpu_count() or 1} cores, "
        f"{_gib(info.get('MemTotal'))} MemTotal\n"
        "The RAM figure is a refusal threshold (3x FP32 weight bytes + 2 GiB runtime), "
        "not a measured peak. Peak RSS was not measured because the first FP32 copy "
        f"alone is {_gib(spec['params'] * 4)} and overcommit will OOM-kill rather than fail cleanly.\n"
        "Use a machine with at least 8 GiB MemAvailable for a 421M export "
        "(16 GiB physical RAM recommended) and 20 GiB free disk to convert all three. "
        "Commands: docs/RELEASE.md."
    )


def guard_convert(source, output) -> None:
    """Raise before download/load if the destination name is a substitute or RAM/disk is short.

    Unknown local checkpoints are checked from their safetensors header.
    Unknown Hub ids are not size-checked here (the caller may still download them).
    """
    destination = Path(output)
    reserved_key = RESERVED_BUNDLE_NAMES.get(destination.name)
    spec = official_spec(source)
    local = Path(source)
    is_local = local.is_dir()

    if reserved_key is not None:
        expected = OFFICIAL[reserved_key]
        if spec is not None and spec is not expected and short_name(source) != reserved_key:
            raise ReservedBundleName(
                f"Refusing to write {destination.name}/ from {source}. "
                f"That directory name is reserved for {expected['repo']} "
                f"({expected['safetensors_bytes']:,} byte safetensors)."
            )
        if spec is None and is_local:
            weights = local / "model.safetensors"
            size = weights.stat().st_size if weights.is_file() else -1
            if size != expected["safetensors_bytes"]:
                raise ReservedBundleName(
                    f"Refusing to write {destination.name}/ from {source}. "
                    f"{destination.name}/ is reserved for {expected['repo']} "
                    f"({expected['safetensors_bytes']:,} byte safetensors, "
                    f"{expected['params']:,} params). This file is {size:,} bytes. "
                    "A smaller or different checkpoint is not a substitute."
                )
        elif spec is None and not is_local:
            raise ReservedBundleName(
                f"Refusing to write {destination.name}/ from {source}. "
                f"That name is reserved for {expected['repo']}."
            )

    if spec is None and is_local:
        weights = local / "model.safetensors"
        if weights.is_file():
            params, dtype = safetensors_summary(weights)
            spec = {
                "repo": str(local),
                "revision": "(local)",
                "params": params,
                "safetensors_bytes": weights.stat().st_size,
                "stored_dtype": dtype,
                "encoder": "local",
                "hidden_size": "?",
                "layers": "?",
                "max_len": "?",
            }
    if spec is None:
        return

    need_ram = required_ram_bytes(spec["params"])
    need_disk = required_disk_bytes(spec["safetensors_bytes"], spec["params"])
    have_ram = mem_available_bytes()
    probe = destination.parent
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    have_disk = shutil.disk_usage(probe if probe.exists() else Path.cwd()).free
    short_ram = have_ram is not None and have_ram < need_ram
    short_disk = have_disk < need_disk
    if short_ram or short_disk:
        raise InsufficientResources(
            _refusal_message(
                spec,
                have_ram=have_ram,
                have_disk=have_disk,
                need_ram=need_ram,
                need_disk=need_disk,
                destination=destination,
            )
        )
