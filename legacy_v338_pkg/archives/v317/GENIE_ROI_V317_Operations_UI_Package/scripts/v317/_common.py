import csv, json, pathlib, re

def load_json(path: str):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))

def normalize_header(h: str) -> str:
    return (h or "").strip()

def detect_field_map(headers, aliases):
    header_set = {normalize_header(h): h for h in headers}
    mapping = {}
    for canonical, al in aliases.items():
        for cand in al:
            cand_n = normalize_header(cand)
            if cand_n in header_set:
                mapping[canonical] = header_set[cand_n]
                break
    return mapping

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
        # remove currency symbols, spaces, commas, etc.
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
