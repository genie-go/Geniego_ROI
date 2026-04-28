import csv, json, pathlib

def load_mappers(path: str):
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

def read_csv_rows(csv_path: str):
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        headers = r.fieldnames or []
        rows = [row for row in r]
    return headers, rows

def safe_float(x) -> float:
    try:
        if x is None: return 0.0
        s = str(x).replace(",","").strip()
        if s == "": return 0.0
        return float(s)
    except Exception:
        return 0.0

def safe_int(x) -> int:
    try:
        if x is None: return 0
        s = str(x).replace(",","").strip()
        if s == "": return 0
        return int(float(s))
    except Exception:
        return 0
