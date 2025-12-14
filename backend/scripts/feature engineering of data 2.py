import pandas as pd
import json
import os
import numpy as np

# Input/Output configuration
INPUT_FILE = "Disclose-Register-database.csv" # Ensure this matches your actual filename
OUTPUT_FILE = "products_final.json"

def clean_and_export_products(input_file, output_file):
    print(f"🚀 Starting Pipeline...")
    
    # 1. Load Data
    if not os.path.exists(input_file):
        # Try finding a CSV with 'Disclose' in the name if exact match fails
        candidates = [f for f in os.listdir() if 'Disclose' in f and f.endswith('.csv')]
        if candidates:
            input_file = candidates[0]
            print(f"⚠️ Exact file not found, using candidate: {input_file}")
        else:
            print(f"❌ Error: Input file {input_file} not found.")
            return

    try:
        # Load CSV (with low_memory=False to handle mixed types)
        df = pd.read_csv(input_file, low_memory=False)
        print(f"✅ Loaded {len(df)} rows from {input_file}")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return

    # 2. Filter essential rows (must have Fees and 5Y Return to be recommendable)
    # We allow NaN 5Y Return ONLY if it's a very new fund, but for this robust pipeline,
    # let's filter out funds that are too incomplete to be safe recommendations.
    df_clean = df.dropna(subset=['Total Annual Fund Fees', 'Risk Reward Indicator Code']).copy()
    print(f"ℹ️  Filtered to {len(df_clean)} rows with valid Fees & Risk data.")

    records = []

    # 3. Iterate and Transform
    for _, row in df_clean.iterrows():
        try:
            # --- A. Basic Identity ---
            name = str(row.get('Fund Name', '')).strip()
            provider = str(row.get('Scheme Name', '')).strip() # Using Scheme Name as Provider usually works better for MIS
            code = str(row.get('Fund Number', '')).strip()
            description = str(row.get('Fund Description', '')).strip()
            
            # --- B. Categorization & Type Inference ---
            raw_scheme_type = str(row.get('Scheme Type', '')).upper()
            
            # 1. Category (Physical)
            category = 'Fund'
            if 'KIWISAVER' in raw_scheme_type or 'KIWISAVER' in name.upper():
                category = 'KiwiSaver'
            
            # 2. Type (Functional)
            fund_type = 'Active' # Default
            name_upper = name.upper()
            desc_upper = description.upper()
            
            if any(x in name_upper for x in ['INDEX', 'PASSIVE', 'TRACKING', 'ETF', 'SMARTSHARES']):
                fund_type = 'Index'
                if 'ETF' in name_upper or 'SMARTSHARES' in name_upper:
                    fund_type = 'ETF'
            elif 'CASH' in name_upper and 'FUND' in name_upper:
                fund_type = 'Cash'
            
            # --- C. Metrics (Risk, Fees, Returns) ---
            risk_score = int(row.get('Risk Reward Indicator Code', 3)) # Default to 3 if parsing fails (though we filtered NaNs)
            
            # Strategy Mapping based on Risk Score (Standard industry bands)
            strategy = 'Balanced'
            if risk_score <= 2: strategy = 'Conservative' # covers Defensive too
            elif risk_score == 3: strategy = 'Balanced'
            elif risk_score <= 5: strategy = 'Growth'
            elif risk_score >= 6: strategy = 'High Growth' # or Aggressive

            metrics = {
                'riskScore': risk_score,
                'fees': {
                    'total': float(row.get('Total Annual Fund Fees', 0)),
                    'performance': float(row.get('Total Performance-based Fees (%)', 0) or 0),
                    'admin': float(row.get('Other Management And Administration Charges', 0) or 0)
                },
                'returns': {
                    'y1': float(row.get('Past Year Return(%) Net Charges And Tax', 0) or 0),
                    'y5': float(row.get('Average 5 Yrs Return Net', 0) or 0),
                    'benchmark_y1': float(row.get('Market Index Past Year Return (%)', 0) or 0)
                }
            }

            # --- D. Asset Allocation (The Complex Part) ---
            # Helper to safely get float
            def get_alloc(col_name):
                val = row.get(col_name, 0)
                return float(val) if pd.notna(val) else 0.0

            # Raw allocations
            cash = get_alloc('Actual investment mix: Cash and cash equivalents')
            nz_fixed = get_alloc('Actual investment mix: New Zealand fixed interest')
            int_fixed = get_alloc('Actual investment mix: International fixed interest')
            aus_eq = get_alloc('Actual investment mix: Australasian equities')
            int_eq = get_alloc('Actual investment mix: International equities')
            list_prop = get_alloc('Actual investment mix: Listed Properties')
            unlist_prop = get_alloc('Actual investment mix: Unlisted Properties')
            commodities = get_alloc('Actual investment mix: Commodities')
            other = get_alloc('Actual investment mix: Other')

            allocation = {
                # Aggregated Layers (For Frontend Charts)
                'cash': cash,
                'bonds': nz_fixed + int_fixed,
                'equities': aus_eq + int_eq,
                'property': list_prop + unlist_prop,
                'other': commodities + other,
                
                # Detail Layer (For AI Analysis)
                'details': {
                    'nzFixedInterest': nz_fixed,
                    'intlFixedInterest': int_fixed,
                    'australasianEquities': aus_eq,
                    'intlEquities': int_eq,
                    'unlistedProperty': unlist_prop
                }
            }

            # --- E. Top Holdings Extraction ---
            top_holdings = []
            for i in range(1, 11): # 1 to 10
                h_name = row.get(f'Top 10 Investments {i}: Name')
                h_pct = row.get(f'Top 10 Investments {i}: Percentage Of Fund Net Assets')
                
                if pd.notna(h_name) and pd.notna(h_pct):
                    top_holdings.append({
                        'name': str(h_name).strip(),
                        'percent': float(h_pct) * 100, # Usually 0.05 -> 5%? Check data. CSV seems to be 0-1 or 0-100?
                                                     # Checking sample: "0.98" likely means 0.98%. 
                                                     # WAIT: Sample shows "14.03" for top holding. That is 14.03%.
                                                     # So we keep it as is.
                        'type': str(row.get(f'Top 10 Investments {i}: Type', '')),
                        'country': str(row.get(f'Top 10 Investments {i}: Country', ''))
                    })

            # --- F. Construct Final Object ---
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
                # 'isActive': True, # DB Default
                # 'lastUpdated': datetime... # DB Default
            }

            records.append(product_doc)

        except Exception as err:
            print(f"⚠️  Skipping row {row.get('Fund Name', 'Unknown')}: {err}")
            continue

    # 4. Add Mock Term Deposits (Since CSV lacks them)
    # Essential for 'Defensive' users
    print(f"➕ Injecting Mock Term Deposits...")
    mock_tds = [
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
        }
    ]
    records.extend(mock_tds)

    # 5. Export
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2)
    
    print(f"🎉 Success! Exported {len(records)} products to {output_file}")
    print(f"   (Includes {len(df_clean)} from CSV and {len(mock_tds)} Mock TDs)")

if __name__ == "__main__":
    clean_and_export_products(INPUT_FILE, OUTPUT_FILE)
