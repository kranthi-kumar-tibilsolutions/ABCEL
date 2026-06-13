#!/usr/bin/env python3
# preprocess/sentiment_extract.py
# Extracts open-text columns from the ABG Vibes Excel file
# Run after extract.py — reads same Excel, finds text columns
# Output: data/open_text_raw.json (passed to POST /api/sentiment/classify)

import pandas as pd
import json
import sys
import os


def extract_open_text(excel_path, output_dir='../data'):
    xl = pd.ExcelFile(excel_path)

    # Try to find the main data sheet
    data_sheet = None
    for sheet in xl.sheet_names:
        df_test = xl.parse(sheet)
        if len(df_test) > 500 and len(df_test.columns) > 10:
            data_sheet = sheet
            break

    if not data_sheet:
        print("Could not find main data sheet")
        sys.exit(1)

    df = xl.parse(data_sheet)

    # Skip first 2 metadata rows (WTW Vibes format)
    df = df.iloc[2:].reset_index(drop=True)

    # Identify open-text columns — look for OT prefix
    text_cols = [c for c in df.columns if str(c).strip().startswith('OT')]

    if not text_cols:
        # Fall back: find columns with string values averaging > 20 chars
        text_cols = [
            c for c in df.columns
            if df[c].dtype == object and
            df[c].dropna().apply(lambda x: len(str(x))).mean() > 20
        ]

    print(f"Found {len(text_cols)} open-text columns: {[str(c).strip() for c in text_cols]}")

    # Column references (leading space is intentional in WTW Vibes columns)
    def find_col(cq_code):
        for col in df.columns:
            import re
            if re.search(rf'\b{cq_code}\b', str(col), re.IGNORECASE):
                return col
        return None

    col_biz      = find_col('CQ9')
    col_dept     = find_col('CQ2')
    col_location = find_col('CQ43')
    col_tenure   = find_col('CQ29')
    col_job      = find_col('CQ27')

    records = []
    for _, row in df.iterrows():
        for col in text_cols:
            text = str(row.get(col, '')).strip()
            if text and text != 'nan' and len(text) > 5:
                records.append({
                    "id":           f"R{len(records)+1:05d}",
                    "text":         text,
                    "column":       str(col).strip(),
                    "business_unit": str(row.get(col_biz,   'Unknown')) if col_biz   else 'Unknown',
                    "department":   str(row.get(col_dept,   'Unknown')) if col_dept  else 'Unknown',
                    "location":     str(row.get(col_location,'Unknown'))if col_location else 'Unknown',
                    "tenure":       str(row.get(col_tenure, 'Unknown')) if col_tenure else 'Unknown',
                    "job_level":    str(row.get(col_job,    'Unknown')) if col_job    else 'Unknown',
                    "month":        "Jan '26",
                    "is_active":    True
                })

    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, 'open_text_raw.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Extracted {len(records)} open-text responses → {out_path}")
    print("Now call POST /api/sentiment/classify with this data to run sentiment analysis.")
    return records


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python sentiment_extract.py <excel_path> [output_dir]")
        sys.exit(1)
    excel_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '../data'
    extract_open_text(excel_path, output_dir)
