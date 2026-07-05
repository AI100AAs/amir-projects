import json
import time
import uuid
from pathlib import Path
from app.config import DATA_DIR

HISTORY_DIR = DATA_DIR / "history"
INDEX_PATH = HISTORY_DIR / "index.json"
MAX_HISTORY = 50


def _ensure_dir():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def _load_index() -> list[dict]:
    _ensure_dir()
    if INDEX_PATH.exists():
        try:
            data = json.loads(INDEX_PATH.read_text())
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return []


def _save_index(index: list[dict]):
    _ensure_dir()
    INDEX_PATH.write_text(json.dumps(index, indent=2))


def save_result(text_input: str, url_input: str, api_key_provided: bool, result_dict: dict) -> str:
    entry_id = str(uuid.uuid4())[:12]
    timestamp = time.time()
    entry = {
        "id": entry_id,
        "timestamp": timestamp,
        "date": time.strftime("%Y-%m-%d %H:%M", time.localtime(timestamp)),
        "text_preview": (text_input or url_input or "")[:120],
        "text_input": text_input or "",
        "url_input": url_input or "",
        "mode": result_dict.get("mode", "local"),
        "overall_score": result_dict.get("overall_score", 0),
        "overall_verdict": result_dict.get("overall_verdict", ""),
        "claim_count": len(result_dict.get("claims", [])),
        "has_api_key": api_key_provided,
    }
    if "model_info" in result_dict:
        entry["model_name"] = result_dict["model_info"].get("name", "")
    result_path = HISTORY_DIR / f"{entry_id}.json"
    result_path.write_text(json.dumps({"meta": entry, "result": result_dict}, indent=2))

    index = _load_index()
    index.insert(0, entry)
    if len(index) > MAX_HISTORY:
        old = index[MAX_HISTORY:]
        index = index[:MAX_HISTORY]
        for o in old:
            old_path = HISTORY_DIR / f"{o['id']}.json"
            if old_path.exists():
                old_path.unlink()
    _save_index(index)
    return entry_id


def list_history(limit: int = 10) -> list[dict]:
    return _load_index()[:limit]


def search_history(query: str, limit: int = 10) -> list[dict]:
    q = query.lower()
    all_entries = _load_index()
    matches = [
        e for e in all_entries
        if q in e.get("text_preview", "").lower()
        or q in e.get("mode", "").lower()
        or q in e.get("overall_verdict", "").lower()
        or q in e.get("model_name", "").lower()
    ]
    return matches[:limit]


def get_result(entry_id: str) -> dict | None:
    result_path = HISTORY_DIR / f"{entry_id}.json"
    if not result_path.exists():
        return None
    try:
        return json.loads(result_path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def delete_result(entry_id: str) -> bool:
    result_path = HISTORY_DIR / f"{entry_id}.json"
    found = result_path.exists()
    if found:
        result_path.unlink()
    index = _load_index()
    new_index = [e for e in index if e["id"] != entry_id]
    if len(new_index) < len(index):
        _save_index(new_index)
        return True
    return found


def clear_history():
    _ensure_dir()
    for p in HISTORY_DIR.glob("*.json"):
        p.unlink()
