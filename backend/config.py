"""Loads and validates config.yaml."""
from dataclasses import dataclass, field
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"

VALID_DIFFICULTIES = {"beginner", "intermediate", "advanced"}


@dataclass
class Config:
    model: str = "claude-sonnet-4-6"
    max_tokens: int = 8192
    subject_focus: str = "general engineering"
    branch: str = "general"
    semester: int = 3
    difficulty: str = "intermediate"
    socratic: bool = True
    system_prompt_extra: str = ""


def load_config(path: Path = CONFIG_PATH) -> Config:
    data = {}
    if path.exists():
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    cfg = Config(**{k: v for k, v in data.items() if k in Config.__dataclass_fields__})
    if cfg.difficulty not in VALID_DIFFICULTIES:
        raise ValueError(
            f"config.yaml: difficulty must be one of {sorted(VALID_DIFFICULTIES)}, got {cfg.difficulty!r}"
        )
    return cfg


config = load_config()
