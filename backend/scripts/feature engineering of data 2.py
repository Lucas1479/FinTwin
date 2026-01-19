import pandas as pd
import json
import os
import re
import numpy as np

# =============================================================================
# FinTwin Product Data Pipeline (v2.1)
# =============================================================================
# Supports CSV (MIS Fund) and XLSX (KiwiSaver) input files
# Run from /backend directory: python "scripts/feature engineering of data 2.py"
# =============================================================================

# Input/Output configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INPUT_FILES = [
    {"file": os.path.join(BASE_DIR, "31-December-2022-Disclose-Register-MIS-fund-update 1(in).csv"), "category_hint": "Fund", "format": "csv"},
    {"file": os.path.join(BASE_DIR, "Disclose-Register-KiwiSaver-fund-updates-for-31-December-2022.xlsx"), "category_hint": "KiwiSaver", "format": "xlsx"},
]
OUTPUT_FILE = os.path.join(BASE_DIR, "products_final.json")
# Global metadata for this batch (disclose register snapshot date)
DISCLOSE_AS_OF_DATE = "2022-12-31"
DATA_SOURCE = "Disclose Register (FMA)"


def safe_float(val, default=0):
    """Safely parse float, handle NaN (JSON doesn't support NaN)"""
    if pd.isna(val) or val is None or val == '':
        return default
    try:
        f = float(val)
        return round(f, 2) if not np.isnan(f) else default
    except:
        return default


def nullable_float(val):
    """Returns None for NaN (for optional fields like benchmark)"""
    if pd.isna(val) or val is None or val == '':
        return None
    try:
        f = float(val)
        return round(f, 2) if not np.isnan(f) else None
    except:
        return None


def get_alloc(row, col_name):
    """Safely get allocation float value"""
    val = row.get(col_name, 0)
    return float(val) if pd.notna(val) else 0.0


def infer_risk_from_allocation(equities_pct):
    """
    Infer Risk Reward Indicator (1-7) from equity allocation percentage.
    This is used when the source data lacks an explicit Risk Indicator.
    
    Based on the principle that higher equity exposure = higher volatility = higher risk.
    """
    if equities_pct < 15:
        return 1  # Defensive (Cash/Bond heavy)
    elif equities_pct < 30:
        return 2  # Conservative
    elif equities_pct < 45:
        return 3  # Moderate Conservative
    elif equities_pct < 60:
        return 4  # Balanced
    elif equities_pct < 75:
        return 5  # Growth
    elif equities_pct < 90:
        return 6  # High Growth
    else:
        return 7  # Aggressive


def infer_strategy_from_name(fund_name):
    """
    Parse strategy keywords from Fund Name.
    KiwiSaver products typically embed their strategy in the name.
    
    Returns: (strategy, risk_score) or (None, None) if not found
    
    Priority order matters - check more specific terms first!
    """
    if not fund_name:
        return None, None
    
    name_upper = fund_name.upper()
    
    # Handle GlidePath / Lifecycle funds (age-based)
    # e.g., "GLIDEPATH AGE 25" = young = aggressive, "GLIDEPATH AGE 75" = near retirement = conservative
    glidepath_match = re.search(r'(GLIDEPATH|LIFECYCLE|STEPPING\s*STONES?)\s*(?:AGE\s*)?(\d+)', name_upper)
    if glidepath_match:
        age = int(glidepath_match.group(2))
        if age <= 35:
            return 'Aggressive', 6
        elif age <= 45:
            return 'Growth', 5
        elif age <= 55:
            return 'Balanced', 4
        elif age <= 65:
            return 'Conservative', 3
        else:
            return 'Defensive', 2
    
    # Order matters: check more specific terms first
    if 'HIGH GROWTH' in name_upper or 'AGGRESSIVE' in name_upper:
        return 'Aggressive', 6
    elif 'GROWTH' in name_upper and 'HIGH' not in name_upper:
        return 'Growth', 5
    elif 'BALANCED' in name_upper or 'MODERATE' in name_upper:
        return 'Balanced', 4
    elif 'CONSERVATIVE' in name_upper:
        return 'Conservative', 3
    elif 'DEFENSIVE' in name_upper or 'PRESERVATION' in name_upper:
        return 'Conservative', 2
    elif 'CASH' in name_upper:
        return 'Defensive', 1
    elif 'DEFAULT' in name_upper:
        # Default KiwiSaver funds are typically Balanced
        return 'Balanced', 4
    elif 'EQUITY' in name_upper:
        # Pure equity funds are typically aggressive
        return 'Aggressive', 6
    else:
        return None, None


def map_risk_to_strategy(risk_score):
    """
    Strategy Mapping based on Risk Score (FinTwin Mapping Table)
    Risk Indicator (1-7) is a mandatory calculation based on 5-year volatility.
    We rely on this number as the source of truth for AI matching logic, rather than fund name.
    
    | Risk Level | Strategy     | Asset Mix (Growth) | Typical Goal Horizon      |
    |------------|--------------|--------------------| --------------------------|
    | 1          | Defensive    | 0% - 10%           | < 2 Years                 |
    | 2 - 3      | Conservative | 10% - 35%          | 2 - 5 Years               |
    | 4          | Balanced     | ~50%               | 5 - 10 Years (Default)    |
    | 5          | Growth       | ~80%               | 10+ Years                 |
    | 6 - 7      | Aggressive   | 90% - 100%         | 15+ Years (Young investors)|
    """
    if risk_score == 1:
        return 'Defensive'
    elif risk_score in [2, 3]:
        return 'Conservative'
    elif risk_score == 4:
        return 'Balanced'
    elif risk_score == 5:
        return 'Growth'
    elif risk_score >= 6:
        return 'Aggressive'
    else:
        return 'Balanced'  # Fallback


def clean_name(name):
    """Convert ALL CAPS name to Title Case, preserving common acronyms"""
    if not name:
        return ""
    
    # If name is already mixed case (not just fully upper), assume it's fine
    # But many sources provide ALL CAPS, so we force Title Case for consistency if it looks like ALL CAPS
    if name.isupper():
        name = name.title()
    
    # Fix common acronyms and brand names that .title() breaks
    # Note: Keys are the .title() version, Values are the correct version
    corrections = {
        'Us ': 'US ', 'Nz ': 'NZ ', 'Uk ': 'UK ', 'Usa ': 'USA ', 
        'Etf': 'ETF', 'Pie': 'PIE', 'Lpf': 'LPF', 'Amp': 'AMP', 
        'Anz': 'ANZ', 'Bnz': 'BNZ', 'Asb': 'ASB', 'Gmi': 'GMI',
        'Esg': 'ESG', 'Sri': 'SRI', 'S&p': 'S&P', 'Msci': 'MSCI',
        'Gdp': 'GDP'
    }
    
    for wrong, right in corrections.items():
        name = name.replace(wrong, right)
        
    return name


def normalize_columns(df):
    """
    Normalize column names to handle differences between CSV and XLSX formats.
    - Strip leading/trailing whitespace
    - Convert to Title Case for consistency
    """
    # First, strip whitespace
    df.columns = df.columns.str.strip()
    
    # Create a mapping for known column variations
    column_mapping = {
        # Risk (only in MIS CSV)
        'Risk Reward Indicator Code': 'Risk Reward Indicator Code',
        
        # Core fields - handle case variations
        'Fund Number': 'Fund Number',
        'Fund Name': 'Fund Name',
        'Fund Description': 'Fund Description',
        'Scheme Name': 'Scheme Name',
        'Scheme Type': 'Scheme Type',
        
        # Fees
        'Total Annual Fund Fees': 'Total Annual Fund Fees',
        'Total performance-based fees (%)': 'Total Performance-based Fees (%)',
        'Other management and administration charges': 'Other Management And Administration Charges',
        
        # Returns
        'Past year return(%) net charges and tax': 'Past Year Return(%) Net Charges And Tax',
        'Market index past year return (%)': 'Market Index Past Year Return (%)',
        
        # Asset Allocation
        'Actual investment mix: Cash and cash equivalents': 'Actual investment mix: Cash and cash equivalents',
        'Actual investment mix: New Zealand fixed interest': 'Actual investment mix: New Zealand fixed interest',
        'Actual investment mix: International fixed interest': 'Actual investment mix: International fixed interest',
        'Actual investment mix: Australasian equities': 'Actual investment mix: Australasian equities',
        'Actual investment mix: International equities': 'Actual investment mix: International equities',
        'Actual investment mix: Listed Properties': 'Actual investment mix: Listed Properties',
        'Actual investment mix: Unlisted Properties': 'Actual investment mix: Unlisted Properties',
        'Actual investment mix: Commodities': 'Actual investment mix: Commodities',
        'Actual investment mix: Other': 'Actual investment mix: Other',
    }
    
    # Apply case-insensitive column renaming
    current_cols = {c.lower(): c for c in df.columns}
    rename_dict = {}
    
    for standard_name in column_mapping.values():
        lower_name = standard_name.lower()
        if lower_name in current_cols:
            actual_col = current_cols[lower_name]
            if actual_col != standard_name:
                rename_dict[actual_col] = standard_name
    
    if rename_dict:
        df = df.rename(columns=rename_dict)
    
    return df


def process_single_file(file_path, category_hint, file_format):
    """Process a single CSV/XLSX file and return list of product records"""
    records = []
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}, skipping...")
        return records
    
    try:
        if file_format == 'xlsx':
            df = pd.read_excel(file_path, engine='openpyxl')
        else:
            df = pd.read_csv(file_path, low_memory=False)
        print(f"Loaded {len(df)} rows from {file_path}")
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return records
    
    # Normalize column names
    df = normalize_columns(df)
    
    # Check if Risk Indicator exists
    has_risk_column = 'Risk Reward Indicator Code' in df.columns
    print(f"   Risk Indicator column present: {has_risk_column}")
    
    # For files with Risk column, filter by it; otherwise, filter by Fees only
    if has_risk_column:
        df_clean = df.dropna(subset=['Total Annual Fund Fees', 'Risk Reward Indicator Code']).copy()
    else:
        df_clean = df.dropna(subset=['Total Annual Fund Fees']).copy()
    
    print(f"   Filtered to {len(df_clean)} rows with valid Fees data.")
    
    for _, row in df_clean.iterrows():
        try:
            # --- A. Basic Identity ---
            name = clean_name(str(row.get('Fund Name', '')).strip())
            provider = str(row.get('Scheme Name', '')).strip()
            code = str(row.get('Fund Number', '')).strip()
            description = str(row.get('Fund Description', '')).strip()
            
            if not name:
                continue  # Skip rows without a name
            
            # --- B. Categorization & Type Inference ---
            # Use category_hint from file config
            if category_hint == 'KiwiSaver':
                category = 'KiwiSaver'
            else:
                raw_scheme_type = str(row.get('Scheme Type', '')).upper()
                if 'KIWISAVER' in raw_scheme_type or 'KIWISAVER' in name.upper():
                    category = 'KiwiSaver'
                else:
                    category = 'Fund'
            
            # Type (Functional): Active/Index/ETF
            fund_type = 'Active'  # Default
            name_upper = name.upper()
            
            if any(x in name_upper for x in ['INDEX', 'PASSIVE', 'TRACKING', 'ETF', 'SMARTSHARES']):
                fund_type = 'Index'
                if 'ETF' in name_upper or 'SMARTSHARES' in name_upper:
                    fund_type = 'ETF'
            
            # --- C. Asset Allocation (needed for risk inference) ---
            cash = get_alloc(row, 'Actual investment mix: Cash and cash equivalents')
            nz_fixed = get_alloc(row, 'Actual investment mix: New Zealand fixed interest')
            int_fixed = get_alloc(row, 'Actual investment mix: International fixed interest')
            aus_eq = get_alloc(row, 'Actual investment mix: Australasian equities')
            int_eq = get_alloc(row, 'Actual investment mix: International equities')
            list_prop = get_alloc(row, 'Actual investment mix: Listed Properties')
            unlist_prop = get_alloc(row, 'Actual investment mix: Unlisted Properties')
            commodities = get_alloc(row, 'Actual investment mix: Commodities')
            other = get_alloc(row, 'Actual investment mix: Other')
            
            total_equities = aus_eq + int_eq
            
            # --- D. Risk Score & Strategy ---
            # Priority: 1) Explicit Risk Column, 2) Fund Name parsing, 3) Asset allocation inference
            if has_risk_column and pd.notna(row.get('Risk Reward Indicator Code')):
                risk_score = int(row.get('Risk Reward Indicator Code', 4))
                strategy = map_risk_to_strategy(risk_score)
            else:
                # Try to parse strategy from Fund Name first (common for KiwiSaver)
                parsed_strategy, parsed_risk = infer_strategy_from_name(name)
                
                if parsed_strategy:
                    strategy = parsed_strategy
                    risk_score = parsed_risk
                else:
                    # Fallback: Infer from equity allocation
                    risk_score = infer_risk_from_allocation(total_equities)
                    strategy = map_risk_to_strategy(risk_score)
            
            # --- E. Metrics (Risk, Fees, Returns) ---
            metrics = {
                'riskScore': risk_score,
                'fees': {
                    'total': safe_float(row.get('Total Annual Fund Fees')),
                    'performance': safe_float(row.get('Total Performance-based Fees (%)')),
                    'admin': safe_float(row.get('Other Management And Administration Charges'))
                },
                'returns': {
                    'y1': nullable_float(row.get('Past Year Return(%) Net Charges And Tax')),
                    'y5': nullable_float(row.get('Average 5 Yrs Return Net')),
                    'benchmark_y1': nullable_float(row.get('Market Index Past Year Return (%)'))
                }
            }
            
            # --- F. Asset Allocation Object ---
            allocation = {
                'cash': round(cash, 2),
                'bonds': round(nz_fixed + int_fixed, 2),
                'equities': round(total_equities, 2),
                'property': round(list_prop + unlist_prop, 2),
                'other': round(commodities + other, 2),
                'details': {
                    'nzFixedInterest': round(nz_fixed, 2),
                    'intlFixedInterest': round(int_fixed, 2),
                    'australasianEquities': round(aus_eq, 2),
                    'intlEquities': round(int_eq, 2),
                    'unlistedProperty': round(unlist_prop, 2)
                }
            }
            
            # --- G. Top 5 Holdings ---
            top_holdings = []
            for i in range(1, 6):
                # Try different column name formats
                h_name = row.get(f'Top 10 Investments {i}: Name')
                h_pct = row.get(f'Top 10 Investments {i}: Percentage Of Fund Net Assets')
                
                # Try alternate format (lowercase 'of fund net assets')
                if pd.isna(h_pct):
                    h_pct = row.get(f'Top 10 Investments {i}: Percentage of fund net assets')
                
                if pd.notna(h_name) and pd.notna(h_pct):
                    top_holdings.append({
                        'name': str(h_name).strip(),
                        'percent': round(float(h_pct), 2),
                        'type': str(row.get(f'Top 10 Investments {i}: Type', '')),
                        'country': str(row.get(f'Top 10 Investments {i}: Country', ''))
                    })
            
            # --- H. Construct Final Object ---
            product_doc = {
                'name': name,
                'code': code,
                'provider': provider,
                'description': description,
                'category': category,
                'type': fund_type,
                'strategy': strategy,
                'metrics': metrics,
                'allocation': allocation,
                'topHoldings': top_holdings,
                # Metadata for transparency on staleness/source
                'asOfDate': DISCLOSE_AS_OF_DATE,
                'topHoldingsAsOf': DISCLOSE_AS_OF_DATE,
                'dataSource': DATA_SOURCE,
                'documents': []
            }
            
            records.append(product_doc)
        
        except Exception as err:
            print(f"   Skipping row {row.get('Fund Name', 'Unknown')}: {err}")
            continue
    
    return records


def get_mock_term_deposits():
    """Generate mock Term Deposit products (CSV lacks them)"""
    return [
        {
            'name': '1-Year Term Deposit',
            'code': 'TD-001',
            'provider': 'ANZ',
            'category': 'TermDeposit',
            'type': 'FixedTerm',
            'strategy': 'Defensive',
            'metrics': {'riskScore': 1, 'fees': {'total': 0}, 'returns': {'y1': 5.8, 'y5': 4.5}},
            'allocation': {'cash': 100, 'bonds': 0, 'equities': 0, 'property': 0, 'other': 0},
            'termDepositDetails': {'termLengthMonths': 12, 'interestRate': 5.8, 'minDeposit': 1000, 'payoutFrequency': 'At Maturity'}
        },
        {
            'name': '6-Month Term Deposit',
            'code': 'TD-002',
            'provider': 'ASB',
            'category': 'TermDeposit',
            'type': 'FixedTerm',
            'strategy': 'Defensive',
            'metrics': {'riskScore': 1, 'fees': {'total': 0}, 'returns': {'y1': 5.6, 'y5': 4.2}},
            'allocation': {'cash': 100, 'bonds': 0, 'equities': 0, 'property': 0, 'other': 0},
            'termDepositDetails': {'termLengthMonths': 6, 'interestRate': 5.6, 'minDeposit': 1000, 'payoutFrequency': 'At Maturity'}
        },
        {
            'name': '3-Month Term Deposit',
            'code': 'TD-003',
            'provider': 'Westpac',
            'category': 'TermDeposit',
            'type': 'FixedTerm',
            'strategy': 'Defensive',
            'metrics': {'riskScore': 1, 'fees': {'total': 0}, 'returns': {'y1': 5.2, 'y5': 4.0}},
            'allocation': {'cash': 100, 'bonds': 0, 'equities': 0, 'property': 0, 'other': 0},
            'termDepositDetails': {'termLengthMonths': 3, 'interestRate': 5.2, 'minDeposit': 1000, 'payoutFrequency': 'At Maturity'}
        }
    ]


def main():
    print("=" * 60)
    print(">>> FinTwin Product Data Pipeline v2.1")
    print(">>> Supports CSV (MIS Funds) + XLSX (KiwiSaver)")
    print("=" * 60)
    
    all_records = []
    file_stats = {}
    
    # Process each input file
    for file_config in INPUT_FILES:
        file_path = file_config["file"]
        category_hint = file_config["category_hint"]
        file_format = file_config.get("format", "csv")
        
        print(f"\nProcessing: {file_path} (hint: {category_hint}, format: {file_format})")
        records = process_single_file(file_path, category_hint, file_format)
        file_stats[file_path] = len(records)
        all_records.extend(records)
    
    # Add mock Term Deposits
    print(f"\nInjecting Mock Term Deposits...")
    mock_tds = get_mock_term_deposits()
    all_records.extend(mock_tds)
    file_stats["Mock TermDeposits"] = len(mock_tds)
    
    # --- De-duplication Logic ---
    print(f"\nDe-duplicating records based on Provider + Name...")
    unique_map = {}
    duplicates_count = 0
    
    for r in all_records:
        # Create a unique key
        key = f"{str(r['provider']).strip()}::{str(r['name']).strip()}".upper()
        
        if key not in unique_map:
            unique_map[key] = r
        else:
            duplicates_count += 1
            # Conflict resolution: Prefer KiwiSaver over Fund
            existing = unique_map[key]
            if r['category'] == 'KiwiSaver' and existing['category'] == 'Fund':
                unique_map[key] = r  # Upgrade to KiwiSaver
    
    all_records = list(unique_map.values())
    print(f"   Found {duplicates_count} duplicates.")
    print(f"   Final unique count: {len(all_records)}")

    # Statistics Summary
    print(f"\n" + "=" * 60)
    print(f"Data Summary")
    print("=" * 60)
    
    # Per-file stats
    print(f"\nBy Source File:")
    for file_name, count in file_stats.items():
        print(f"   {file_name}: {count} records")
    
    # Category/Strategy/Type breakdown
    category_counts = {}
    strategy_counts = {}
    type_counts = {}
    for r in all_records:
        category_counts[r['category']] = category_counts.get(r['category'], 0) + 1
        strategy_counts[r['strategy']] = strategy_counts.get(r['strategy'], 0) + 1
        type_counts[r['type']] = type_counts.get(r['type'], 0) + 1
    
    print(f"\nBy Category: {category_counts}")
    print(f"By Strategy: {strategy_counts}")
    print(f"By Type: {type_counts}")
    
    # Export
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)
    
    print(f"\n" + "=" * 60)
    print(f"Success! Exported {len(all_records)} products to {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
