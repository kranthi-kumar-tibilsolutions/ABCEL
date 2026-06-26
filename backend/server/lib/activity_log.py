import json
import time
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent.parent / "data" / "activity.log"


def log_event(record: dict) -> None:
    """Appends one JSON line to the activity log. Best-effort — never raises."""
    try:
        line = json.dumps({"ts": time.time(), **record})
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass
