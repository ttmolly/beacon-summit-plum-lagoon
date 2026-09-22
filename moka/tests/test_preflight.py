"""Official checkpoints are not swapped for a smaller model when RAM is short."""

import json
from pathlib import Path

import pytest

from moka.bench import import_footprint
from moka.cases import LAYA_MLX_ZH_REFUND, hub_parity_cases, parity_cases
from moka.fidelity import OfficialLayaUnavailable, compare_official_laya
from moka.preflight import (
    OFFICIAL,
    InsufficientResources,
    ReservedBundleName,
    guard_convert,
    mem_available_bytes,
    required_ram_bytes,
)
from moka.tokenizer import Tokenizer

ROOT = Path(__file__).resolve().parents[1]
TINY = ROOT / "artifacts" / "moka-tiny"
TINY_SOURCE = ROOT / "artifacts" / "tiny-source"


def test_low_memory_refuses_official_before_any_directory(tmp_path, monkeypatch):
    monkeypatch.setattr("moka.preflight.mem_available_bytes", lambda: 512 * 1024**2)
    dest = tmp_path / "models" / "typed"
    with pytest.raises(InsufficientResources, match="No weights were downloaded"):
        guard_convert("laya-typed-decisions", dest)
    assert not dest.exists()
    assert not (tmp_path / "models").exists()


def test_reserved_name_rejects_distilled_source(tmp_path):
    dest = tmp_path / "english"
    with pytest.raises(ReservedBundleName, match="reserved"):
        guard_convert(TINY_SOURCE, dest)
    assert not dest.exists()


def test_this_host_refuses_when_it_is_actually_short(tmp_path):
    need = required_ram_bytes(OFFICIAL["laya"]["params"])
    have = mem_available_bytes()
    if have is not None and have >= need:
        pytest.skip("this runner has enough MemAvailable to convert 421M")
    dest = tmp_path / "typed"
    with pytest.raises(InsufficientResources, match="laya-typed-decisions"):
        guard_convert("convaiinnovations/laya-typed-decisions", dest)
    assert not dest.exists()


def test_hub_zh_fixture_is_the_laya_mlx_string_not_ascii():
    zh = next(case for case in hub_parity_cases() if case[0] == "zh")
    assert zh[1]["message"] == LAYA_MLX_ZH_REFUND
    student = next(case for case in parity_cases() if case[0] == "zh")
    assert LAYA_MLX_ZH_REFUND not in json.dumps(student[1])
    assert student[1]["message"].isascii()


def test_student_tokenizer_cannot_represent_the_chinese_fixture():
    tok = Tokenizer(TINY / "tokenizer")
    ids = tok(LAYA_MLX_ZH_REFUND)["input_ids"]
    unk = tok.backend.token_to_id("[UNK]")
    assert ids
    assert all(token_id == unk for token_id in ids)


def test_import_moka_does_not_import_torch():
    report = import_footprint()
    assert report["torch_imported"] is False
    assert report["transformers_imported"] is False
    assert report["import_moka_s"] < 5
    assert report["rss_bytes"] > 0


def test_laya_compare_refuses_distilled_bundle():
    with pytest.raises(OfficialLayaUnavailable, match="not Laya"):
        compare_official_laya(TINY)


def test_cli_convert_exits_2_on_this_host_without_writing(tmp_path):
    need = required_ram_bytes(OFFICIAL["laya-typed-decisions"]["params"])
    if mem_available_bytes() >= need:
        pytest.skip("runner can convert; not a refusal host")
    from moka.cli import main

    dest = tmp_path / "typed"
    code = main(["convert", "laya-typed-decisions", str(dest)])
    assert code == 2
    assert not dest.exists()
