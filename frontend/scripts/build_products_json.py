import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

# ---------- Config you may tweak ----------
AS_OF = "2022-12"
SOURCE_NOTE = "Disclosure Register MIS (snapshot)"

# Make paths stable no matter where you run the script from
ROOT = Path(__file__).resolve().parents[1]  # -> frontend/

# Prefer your current file name, but allow fallback if needed
INPUT_DEFAULT = ROOT / "data" / "raw" / "kiwisaver_2022_12.csv"
INPUT_FALLBACK = ROOT / "data" / "raw" / "kiwisaver_2022.csv"
OUTPUT_DEFAULT = ROOT / "src" / "data" / "products.json"

# Column name aliases (edit these if your CSV headers differ)
COL = {
    "provider": [
        "Provider",
        "Manager",
        "Fund Manager",
        "Fund Manager Name",
        "Scheme provider",
        "Scheme Name",
        "Transitioning Scheme Name",
        "Transitioning Kiwi Saver Scheme Name",
    ],
    "name": [
        "Fund Name",
        "Name",
        "Fund",
        "Investment option",
        "Investment Option Name",
        "Fund Option Name",
    ],
    "category": [
        "Category",
        "Type",
        "Product Type",
        "KiwiSaver Category",
        "Fund Type",
    ],
    "riskLevel": [
        "Risk",
        "Risk Level",
        "Risk profile",
        "Risk Profile",
        "Risk Category",
    ],
    "fees": [
        "Fees",
        "Total Fees",
        "Fee",
        "Total fee",
        "Total Annual Fees",
        "Total fees (%)",
        "Total Fee (%)",
    ],
    "return_5y": [
        "5Y Return",
        "5y return",
        "Return 5y",
        "5 Year Return",
        "5-year return",
        "5yr return",
        "5 year return (%)",
    ],
    "return_1y": [
        "1Y Return",
        "1y return",
        "Return 1y",
        "1 Year Return",
        "1-year return",
        "1yr return",
        "1 year return (%)",
    ],
    "fund_number": ["Fund Number", "Fund No", "Fund ID", "FND"],
    "offer_number": ["Offer Number", "Offer No", "Offer ID", "OFR"],
}

RISK_NORMALISE = {
    "conservative": "Conservative",
    "balanced": "Balanced",
    "growth": "Growth",
    "aggressive": "Aggressive",
}

CATEGORY_NORMALISE = {
    "kiwisaver": "KiwiSaver",
    "term deposit": "TermDeposit",
    "termdeposit": "TermDeposit",
    "managed fund": "ManagedFund",
    "managedfund": "ManagedFund",
}

EMPTY_TOKENS = {"n/a", "na", "none", "null", "-", ""}


def norm_unicode(s: str) -> str:
    # Avoid weird invisible characters / full-width punctuation differences
    return unicodedata.normalize("NFKC", s)


def norm_ws(s: str) -> str:
    # Collapse whitespace, trim
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_text(v):
    """Normalise common empty tokens used in financial exports."""
    if v is None:
        return None
    s = norm_ws(norm_unicode(str(v)))
    if s.lower() in EMPTY_TOKENS:
        return None
    return s


def pick(row, aliases, required=True):
    """Pick the first non-empty value from a list of possible header names."""
    for a in aliases:
        if a in row:
            val = clean_text(row.get(a))
            if val is not None:
                return val
    if required:
        raise KeyError(
            f"Missing required column/value. Tried: {aliases}. "
            f"Available cols (sample): {list(row.keys())[:30]} ..."
        )
    return None


def to_number(value):
    value = clean_text(value)
    if value is None:
        return None
    # accept "1.05%", "1.05", "0.0105"
    s = value.replace(",", "").replace("%", "")
    try:
        return float(s)
    except:
        return None


def slugify(s):
    s = clean_text(s) or "unknown"
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unknown"


def normalise_risk(raw):
    raw = clean_text(raw)
    if raw is None:
        return ""
    low = raw.lower()
    for k, v in RISK_NORMALISE.items():
        if k in low:
            return v
    return raw


def normalise_category(raw):
    raw = clean_text(raw)
    if raw is None:
        return "KiwiSaver"
    key = raw.lower()
    return CATEGORY_NORMALISE.get(key, raw)


def detect_input_path(cli_arg):
    """Resolve input path from CLI or defaults."""
    if cli_arg:
        p = Path(cli_arg)
        if not p.is_absolute():
            p = ROOT / p
        return p

    if INPUT_DEFAULT.exists():
        return INPUT_DEFAULT
    if INPUT_FALLBACK.exists():
        return INPUT_FALLBACK
    return INPUT_DEFAULT  # will fail later with clear error


def completeness_score(p: dict) -> int:
    """Prefer records with more useful fields to avoid 'N/A/—' cards."""
    score = 0
    if clean_text(p.get("provider")):
        score += 2
    if clean_text(p.get("name")):
        score += 3
    if clean_text(p.get("riskLevel")):
        score += 1
    if p.get("fees") is not None:
        score += 2
    r = p.get("returns") or {}
    if r.get("1y") is not None:
        score += 1
    if r.get("5y") is not None:
        score += 2
    return score


def parse_args(argv):
    """
    Supports:
      python scripts/build_products_json.py
      python scripts/build_products_json.py data/raw/xxx.csv
      python scripts/build_products_json.py data/raw/xxx.csv src/data/products.json
      python scripts/build_products_json.py --limit 200
      python scripts/build_products_json.py data/raw/xxx.csv --limit 200
    """
    args = list(argv)
    limit = None

    if "--limit" in args:
        idx = args.index("--limit")
        try:
            limit = int(args[idx + 1])
        except:
            raise ValueError("Invalid --limit value. Example: --limit 200")
        # remove --limit and value
        del args[idx: idx + 2]

    input_arg = args[0] if len(args) >= 1 else None
    output_arg = args[1] if len(args) >= 2 else None
    return input_arg, output_arg, limit


def main():
    input_arg, output_arg, limit = parse_args(sys.argv[1:])

    input_path = detect_input_path(input_arg)
    output_path = Path(output_arg) if output_arg else OUTPUT_DEFAULT
    if not output_path.is_absolute():
        output_path = ROOT / output_path

    print("[DEBUG] ROOT        =", ROOT)
    print("[DEBUG] input_path  =", input_path)
    print("[DEBUG] exists      =", input_path.exists())
    print("[DEBUG] size(bytes) =", input_path.stat().st_size if input_path.exists() else None)
    print("[DEBUG] output_path =", output_path)
    print("[DEBUG] limit       =", limit)

    if not input_path.exists():
        print(f"[ERROR] Input not found: {input_path}")
        sys.exit(1)

    original_rows = 0
    skipped = 0
    merged = 0
    skip_reasons = {}

    # key -> best product
    best = {}

    with input_path.open("r", encoding="utf-8-sig", newline="") as f:
        # Try to sniff delimiter
        sample = f.read(4096)
        f.seek(0)
        delimiter = ","
        try:
            dialect = csv.Sniffer().sniff(sample)
            delimiter = dialect.delimiter or ","
        except:
            delimiter = ","

        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []
        print(f"[DEBUG] delimiter  = {repr(delimiter)}")
        print(f"[DEBUG] headers({len(headers)}) =", headers[:30], "..." if len(headers) > 30 else "")

        for i, row in enumerate(reader, start=1):
            original_rows += 1
            if limit is not None and (len(best) >= limit):
                # stop early to keep MVP output small
                break

            try:
                name = pick(row, COL["name"], required=True)

                provider = pick(row, COL["provider"], required=False)
                if provider is None:
                    provider = pick(row, ["Transitioning Scheme Name", "Scheme Name"], required=False) or "Unknown Provider"

                category = normalise_category(pick(row, COL["category"], required=False))
                riskLevel = normalise_risk(pick(row, COL["riskLevel"], required=False))

                fees = to_number(pick(row, COL["fees"], required=False))
                r5 = to_number(pick(row, COL["return_5y"], required=False))
                r1 = to_number(pick(row, COL["return_1y"], required=False))

                fund_no = pick(row, COL["fund_number"], required=False)
                offer_no = pick(row, COL["offer_number"], required=False)

                # Canonical key to merge near-duplicates:
                # same provider + same fund name (+ category)
                key_provider = norm_ws(provider).lower()
                key_name = norm_ws(name).lower()
                key_cat = (category or "KiwiSaver").lower()
                key = (key_provider, key_name, key_cat)

                # Stable id: prefer official numbers, else provider+name
                if fund_no or offer_no:
                    pid = slugify(f"{provider}-{fund_no or ''}-{offer_no or ''}-{name}")
                else:
                    pid = slugify(f"{provider}-{name}")

                product = {
                    "id": pid,
                    "category": category or "KiwiSaver",
                    "provider": provider,
                    "providerLogo": "",
                    "name": name,
                    "riskLevel": riskLevel,
                    "riskScore": None,
                    "fees": fees,
                    "returns": {"1y": r1, "5y": r5},
                    "description": "",
                    "topHoldings": [],
                    "asOf": AS_OF,
                    "source": SOURCE_NOTE,
                    "raw": {"fundNumber": fund_no, "offerNumber": offer_no},
                }

                if key not in best:
                    best[key] = product
                else:
                    # keep the more "complete" one
                    old = best[key]
                    if completeness_score(product) > completeness_score(old):
                        best[key] = product
                    merged += 1

            except Exception as e:
                skipped += 1
                reason = str(e)
                skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
                if skipped <= 5:
                    print(f"[WARN] Skipped row {i}: {e}")
                continue

    # Output list (sorted for stable diff + nicer UI predictability)
    products = list(best.values())
    products.sort(key=lambda p: (p.get("provider", ""), p.get("name", "")))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(products, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[OK] Read rows (scanned): {original_rows}")
    print(f"[OK] Built products:      {len(products)}")
    print(f"[OK] Merged duplicates:   {merged}")
    print(f"[OK] Skipped rows:        {skipped}")
    print(f"[OK] Output:             {output_path}")

    if skipped > 0:
        print("[DEBUG] Top skip reasons (up to 5):")
        for r, c in sorted(skip_reasons.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  - ({c}x) {r[:180]}")


if __name__ == "__main__":
    main()
