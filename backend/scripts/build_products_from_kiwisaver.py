import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

# ---------- Config ----------
AS_OF = "2022-12"
SOURCE_NOTE = "Disclosure Register MIS (snapshot)"

# Backend root (this file is expected at backend/scripts/)
ROOT = Path(__file__).resolve().parents[1]  # -> backend/

# CSV input / JSON output locations (relative to backend/)
INPUT_DEFAULT = ROOT / "data" / "raw" / "kiwisaver_2022_12.csv"
INPUT_FALLBACK = ROOT / "data" / "raw" / "kiwisaver_2022.csv"
OUTPUT_DEFAULT = ROOT / "data" / "processed" / "products.json"

# Column aliases (adapted from frontend script)
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
        "Past Year Return(%) Net Charges And Tax",
        "Past Year Return (%) Net Charges And Tax",
        "Past Year Return (%) Net Of Charges Gross Of Tax",
        "Annual Return Year 1",
    ],
    "fund_number": ["Fund Number", "Fund No", "Fund ID", "FND"],
    "offer_number": ["Offer Number", "Offer No", "Offer ID", "OFR"],
    "description": ["Fund Description"],
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
    return unicodedata.normalize("NFKC", s)


def norm_ws(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_text(v):
    if v is None:
        return None
    s = norm_ws(norm_unicode(str(v)))
    if s.lower() in EMPTY_TOKENS:
        return None
    return s


def pick(row, aliases, required=True):
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
    s = value.replace(",", "").replace("%", "")
    try:
        return float(s)
    except Exception:
        return None


def slugify(s):
    s = clean_text(s) or "unknown"
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unknown"


def sane_return(value, window="1y"):
    """
    Clamp obviously unrealistic return values.

    - Single-year returns: keep roughly within [-80%, +80%]
    - Multi-year (5Y) annualised: keep within [-50%, +40%]
    Values outside these bands are treated as missing and will
    be ignored in the UI (fallback to the other horizon if available).
    """
    if value is None:
        return None

    try:
        v = float(value)
    except (TypeError, ValueError):
        return None

    if window == "1y":
        if v < -80 or v > 80:
            return None
    else:
        if v < -50 or v > 40:
            return None

    return v


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
    if cli_arg:
        p = Path(cli_arg)
        if not p.is_absolute():
            p = ROOT / p
        return p

    if INPUT_DEFAULT.exists():
        return INPUT_DEFAULT
    if INPUT_FALLBACK.exists():
        return INPUT_FALLBACK
    return INPUT_DEFAULT


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
      python backend/scripts/build_products_from_kiwisaver.py
      python backend/scripts/build_products_from_kiwisaver.py data/raw/xxx.csv
      python backend/scripts/build_products_from_kiwisaver.py data/raw/xxx.csv data/processed/products.json
      python backend/scripts/build_products_from_kiwisaver.py --limit 200
    """
    args = list(argv)
    limit = None

    if "--limit" in args:
        idx = args.index("--limit")
        try:
            limit = int(args[idx + 1])
        except Exception:
            raise ValueError("Invalid --limit value. Example: --limit 200") from None
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

    best = {}

    with input_path.open("r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        delimiter = ","
        try:
            dialect = csv.Sniffer().sniff(sample)
            delimiter = dialect.delimiter or ","
        except Exception:
            delimiter = ","

        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []
        print(f"[DEBUG] delimiter  = {repr(delimiter)}")
        print(
            f"[DEBUG] headers({len(headers)}) =",
            headers[:30],
            "..." if len(headers) > 30 else "",
        )

        for i, row in enumerate(reader, start=1):
            original_rows += 1
            if limit is not None and (len(best) >= limit):
                break

            try:
                name = pick(row, COL["name"], required=True)

                provider = pick(row, COL["provider"], required=False)
                if provider is None:
                    provider = (
                        pick(
                            row,
                            ["Transitioning Scheme Name", "Scheme Name"],
                            required=False,
                        )
                        or "Unknown Provider"
                    )

                category = normalise_category(pick(row, COL["category"], required=False))
                riskLevel = normalise_risk(pick(row, COL["riskLevel"], required=False))

                fees = to_number(pick(row, COL["fees"], required=False))

                # 1-year return: prefer explicit past-year cols, fall back to Annual Return Year 1
                r1_raw = to_number(pick(row, COL["return_1y"], required=False))

                # 5-year return:
                #  - first try explicit 5Y aliases
                #  - if missing, approximate as average of Annual Return Year 1–5
                r5_raw = to_number(pick(row, COL["return_5y"], required=False))
                if r5_raw is None:
                    year_cols = [
                        f"Annual Return Year {idx}"
                        for idx in range(1, 6)
                        if f"Annual Return Year {idx}" in row
                    ]
                    values = [to_number(row[col]) for col in year_cols]
                    values = [v for v in values if v is not None]
                    if values:
                        r5_raw = sum(values) / len(values)

                # Apply sanity filters so we don't surface crazy values like 2015%.
                r1 = sane_return(r1_raw, window="1y")
                r5 = sane_return(r5_raw, window="5y")

                fund_no = pick(row, COL["fund_number"], required=False)
                offer_no = pick(row, COL["offer_number"], required=False)
                description = pick(row, COL["description"], required=False)

                key_provider = norm_ws(provider).lower()
                key_name = norm_ws(name).lower()
                key_cat = (category or "KiwiSaver").lower()
                key = (key_provider, key_name, key_cat)

                if fund_no or offer_no:
                    pid = slugify(f"{provider}-{fund_no or ''}-{offer_no or ''}-{name}")
                else:
                    pid = slugify(f"{provider}-{name}")

                # Basic "AI-style" heuristic: map textual risk + returns to a 1–7 score
                base_risk = {
                    "Conservative": 2,
                    "Balanced": 3,
                    "Growth": 5,
                    "Aggressive": 6,
                }.get(riskLevel, 4)
                bonus = 0
                if isinstance(r5, float) and r5 >= 10:
                    bonus += 1
                if isinstance(r5, float) and r5 <= 2:
                    bonus -= 1
                riskScore = min(7, max(1, base_risk + bonus))

                product = {
                    "id": pid,
                    "category": category or "KiwiSaver",
                    "provider": provider,
                    "providerLogo": "",
                    "name": name,
                    "riskLevel": riskLevel,
                    "riskScore": riskScore,
                    "fees": fees,
                    "returns": {"1y": r1, "5y": r5},
                    "description": description or "",
                    "topHoldings": [],
                    "asOf": AS_OF,
                    "source": SOURCE_NOTE,
                    "raw": {"fundNumber": fund_no, "offerNumber": offer_no},
                }

                if key not in best:
                    best[key] = product
                else:
                    old = best[key]
                    if completeness_score(product) > completeness_score(old):
                        best[key] = product
                    merged += 1

            except Exception as e:  # noqa: BLE001
                skipped += 1
                reason = str(e)
                skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
                if skipped <= 5:
                    print(f"[WARN] Skipped row {i}: {e}")
                continue

    products = list(best.values())
    products.sort(key=lambda p: (p.get("provider", ""), p.get("name", "")))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(products, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"[OK] Read rows (scanned): {original_rows}")
    print(f"[OK] Built products:      {len(products)}")
    print(f"[OK] Merged duplicates:   {merged}")
    print(f"[OK] Skipped rows:        {skipped}")
    print(f"[OK] Output:              {output_path}")

    if skipped > 0:
        print("[DEBUG] Top skip reasons (up to 5):")
        for r, c in sorted(skip_reasons.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  - ({c}x) {r[:180]}")


if __name__ == "__main__":
    main()



