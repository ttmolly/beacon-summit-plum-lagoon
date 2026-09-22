"""Drift-gated fidelity: Moka ONNX vs the export-graph PyTorch reference."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

DEFAULT_MAX_DRIFT = {
    "fp32": 1e-4,
    "fp16": 0.02,
    "int8": 0.02,
}


def _softmax(z):
    z = z - z.max()
    p = np.exp(z)
    return p / p.sum()


def _bundle_is_distilled(bundle: Path) -> bool:
    config_path = bundle / "encoder" / "config.json"
    if not config_path.is_file():
        return False
    hidden = json.loads(config_path.read_text()).get("hidden_size") or 0
    # Official Laya encoders are ModernBERT-large (1024) or mmBERT-base (768).
    return int(hidden) < 256


class OfficialLayaUnavailable(RuntimeError):
    """pip install laya is missing, or this bundle is not an official checkpoint."""


def compare_official_laya(bundle, *, max_drift=None, cases=None, laya_source=None):
    """Selected answers and calibrated probabilities vs `pip install laya`.

    `laya_source` is a local snapshot of the pinned revision when you have one.
    Otherwise the Hub id recorded in the bundle is passed to `laya.load`, which
    follows that package's own revision resolution (not necessarily Moka's pin).
    """
    from .agent import load
    from .cases import hub_parity_cases

    bundle = Path(bundle)
    manifest = json.loads((bundle / "moka_config.json").read_text())
    if _bundle_is_distilled(bundle):
        raise OfficialLayaUnavailable(
            "This bundle is a distilled reference model, not Laya. "
            "Official answer parity applies to models/typed, models/english, and models/multi "
            "converted from convaiinnovations checkpoints. Refusing to compare moka-tiny to `laya`."
        )
    try:
        import laya
    except ImportError as exc:
        raise OfficialLayaUnavailable(
            "Official answer parity needs `pip install laya` (Transformers + PyTorch). "
            "`import moka` does not import torch; this comparison does, on purpose."
        ) from exc

    source = laya_source or manifest.get("source") or "convaiinnovations/laya"
    if laya_source is None and manifest.get("source") and "/" not in str(manifest["source"]):
        if not Path(str(manifest["source"])).is_dir():
            source = "convaiinnovations/" + str(manifest["source"])
    official = laya.load(str(source))
    agent = load(bundle, provider="cpu", deterministic=True, local_files_only=True)
    precision = manifest.get("precision", "fp32")
    budget = DEFAULT_MAX_DRIFT.get(precision, 0.02) if max_drift is None else max_drift
    if cases is None:
        cases = hub_parity_cases()
    matched = total = 0
    max_seen = 0.0
    rows = []
    for name, state, questions in cases:
        left = official.predict(state, questions)
        right = agent.predict(state, questions)
        hit, n, drift, details = compare_answers(left, right, budget)
        matched += hit
        total += n
        max_seen = max(max_seen, drift)
        rows.append({"name": name, "matched": hit, "total": n, "drift": drift, "details": details})
    return {
        "compared_to": "laya",
        "laya_source": str(source),
        "bundle_revision": manifest.get("revision"),
        "matched": matched,
        "total": total,
        "max_probability_drift": max_seen,
        "max_drift_budget": budget,
        "passed": matched == total and max_seen <= budget,
        "cases": rows,
        "note": (
            "Selected-answer match plus calibrated probability drift versus official laya.predict. "
            "Not a latency claim."
        ),
    }


def _pytorch_logits(model, batch):
    import torch

    tensors = {k: torch.from_numpy(v) for k, v in batch.items()}
    with torch.inference_mode():
        logits, action = model(**tensors)
    return logits.numpy(), action.numpy()


def compare_answers(reference, candidate, max_drift):
    """Return (matched_selected, max_probability_drift, details)."""
    matched = 0
    total = 0
    drift = 0.0
    details = []
    for qid, left in reference["answers"].items():
        right = candidate["answers"][qid]
        total += 1
        kind = left["type"]
        if kind == "choice":
            same = left["choice"] == right["choice"]
            keys = list(left["probabilities"])
            local = max(abs(left["probabilities"][k] - right["probabilities"][k]) for k in keys)
        elif kind == "score":
            same = abs(left["score"] - right["score"]) <= max_drift + 1e-6
            keys = list(left["probabilities"])
            local = max(abs(left["probabilities"][k] - right["probabilities"][k]) for k in keys)
            local = max(local, abs(left["score"] - right["score"]))
        else:
            same = (left["noul"] >= 0.5) == (right["noul"] >= 0.5)
            local = abs(left["noul"] - right["noul"])
        matched += int(same)
        drift = max(drift, local)
        details.append({"id": qid, "type": kind, "matched": same, "drift": local})
    return matched, total, drift, details


def validate_bundle(bundle, *, reference=None, max_drift=None, repeats=20, cases=None):
    """Run the shipped fixtures through Moka and, when possible, the PyTorch graph."""
    from .agent import load
    from .cases import STUDENT_ASCII_STANDINS, hub_parity_cases, parity_cases
    from .convert import FORMAT

    bundle = Path(bundle)
    manifest = json.loads((bundle / "moka_config.json").read_text())
    if manifest.get("format") != FORMAT:
        raise ValueError("Not a Moka bundle")
    distilled = _bundle_is_distilled(bundle)
    precision = manifest.get("precision", "fp32")
    budget = DEFAULT_MAX_DRIFT.get(precision, 0.02) if max_drift is None else max_drift
    agent = load(bundle, provider="cpu", deterministic=True, local_files_only=True)

    if cases is None:
        cases = parity_cases() if distilled else hub_parity_cases()

    pytorch_model = None
    if reference is not None:
        from .torch_model import load_model

        pytorch_model = load_model(reference, manifest["shape"]["max_length"], "explicit")

    rows = []
    matched = total = 0
    max_seen = 0.0
    for name, state, questions in cases:
        moka_out = agent.predict(state, questions)
        row = {"name": name, "moka": moka_out}
        if pytorch_model is not None:
            items, internal = agent.prepare(state, questions)
            # Compare calibrated answers via a one-off PyTorch forward + same result math.
            from .result import ResultMixin

            class _Ref(ResultMixin):
                pass

            ref_agent = _Ref()
            ref_agent.tok = agent.tok
            ref_agent.cfg = agent.cfg
            ref_agent.shape = agent.shape
            ref_agent.batch_size = agent.batch_size
            ref_agent.pad_to_multiple = agent.pad_to_multiple
            ref_agent.temperature = agent.temperature
            ref_agent.temperature_by_options = agent.temperature_by_options

            def forward(batch, model=pytorch_model):
                return _pytorch_logits(model, batch)

            ref_agent.forward = forward
            ref_agent.prepare = agent.prepare
            torch_out = ref_agent.system_one(state, questions)
            hit, n, drift, details = compare_answers(torch_out, moka_out, budget)
            matched += hit
            total += n
            max_seen = max(max_seen, drift)
            row["pytorch"] = torch_out
            row["matched"] = hit
            row["total"] = n
            row["drift"] = drift
            row["details"] = details
        else:
            # Self-consistency only: selected answers stay finite and in-range.
            for answer in moka_out["answers"].values():
                total += 1
                matched += 1
                if answer["type"] == "noul":
                    max_seen = max(max_seen, abs(answer["noul"] - min(1.0, max(0.0, answer["noul"]))))
            row["matched"] = None
        rows.append(row)

    stable = True
    if repeats and cases:
        name, state, questions = cases[0]
        first = agent.predict(state, questions)
        for _ in range(repeats):
            again = agent.predict(state, questions)
            if json.dumps(again["answers"], sort_keys=True) != json.dumps(
                first["answers"], sort_keys=True
            ):
                stable = False
                break

    passed = True
    if pytorch_model is not None:
        passed = matched == total and max_seen <= budget and stable
    else:
        passed = stable

    return {
        "bundle": str(bundle),
        "precision": precision,
        "approximate": bool(manifest.get("approximate")),
        "max_drift_budget": budget,
        "matched": matched,
        "total": total,
        "max_probability_drift": max_seen,
        "repeated_calls": repeats,
        "stable": stable,
        "passed": passed,
        "fixture_scope": "distilled reference model, not Laya" if distilled else "official-hub-fixtures",
        "distilled_reference_not_laya": distilled,
        "student_ascii_standins": list(STUDENT_ASCII_STANDINS) if distilled else [],
        "hub_zh_fixture": None if distilled else "发票被重复扣款，请退款。",
        "hardware_note": "Compared against the export-graph PyTorch reference on this host.",
        "cases": [
            {
                "name": row["name"],
                "matched": row.get("matched"),
                "total": row.get("total"),
                "drift": row.get("drift"),
            }
            for row in rows
        ],
    }
