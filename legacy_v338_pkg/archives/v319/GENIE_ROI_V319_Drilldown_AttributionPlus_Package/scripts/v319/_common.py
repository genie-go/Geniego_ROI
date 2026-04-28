import csv, json, pathlib, re

def load_json(path: str):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))

def save_json(path: str, obj):
    pathlib.Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def read_csv_dicts(csv_path: str):
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        headers = r.fieldnames or []
        rows = [row for row in r]
    return headers, rows

_NUM_RE = re.compile(r"[^0-9.\-]")

def safe_float(x) -> float:
    try:
        if x is None:
            return 0.0
        s = str(x).strip()
        if s == "":
            return 0.0
        s = s.replace(",", "")
        s = _NUM_RE.sub("", s)
        if s in ("", "-", "."):
            return 0.0
        return float(s)
    except Exception:
        return 0.0

def safe_int(x) -> int:
    try:
        return int(round(safe_float(x)))
    except Exception:
        return 0

def infer_currency_from_filename(name: str):
    u = name.upper()
    for cur in ("KRW","USD","JPY","EUR"):
        if cur in u:
            return cur
    return None
