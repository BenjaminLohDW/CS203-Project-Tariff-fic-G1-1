#!/usr/bin/env python3
import re
import csv
import sys
from pathlib import Path
from typing import List, Dict

# Patterns for structure
chapter_pat = re.compile(r'^Chapter\s+(\d+)\s*$')
heading_pat = re.compile(r'^\d{2}\.\d{2}\s*$')      # e.g., 01.01
subhead_pat = re.compile(r'^\d{4}\.\d{2}\s*$')      # e.g., 0101.21

TABLE_TOKENS = {"Heading", "H.S. Code", "H.S.", "Code"}
SEP_LINE = re.compile(r'^_+$')  # _________________

def is_table_token(line: str) -> bool:
    return line.strip() in TABLE_TOKENS

def is_separator(line: str) -> bool:
    return bool(SEP_LINE.match(line.strip()))

def clean_desc_line(line: str) -> str:
    # Remove leading dash markers like "-", "--", and spaces/colons
    s = line.strip()
    s = re.sub(r'^[\-–—]+\s*', '', s)  # strip leading -, --, —
    s = s.strip(' :')
    return s.strip()

def parse_chapter_txt(txt_path: str) -> List[Dict]:
    lines = [ln.rstrip() for ln in Path(txt_path).read_text(encoding='utf-8', errors='ignore').splitlines()]
    # Normalize NBSP and weird spaces
    lines = [ln.replace('\u00A0', ' ').strip() for ln in lines]

    chapter_num = None
    chapter_title = ""
    i = 0

    # 1) Find chapter and title, skip Note section and table headers
    while i < len(lines):
        line = lines[i]
        m = chapter_pat.match(line)
        if m:
            chapter_num = int(m.group(1))
            # Next non-empty, non-token line is the title
            j = i + 1
            while j < len(lines):
                t = lines[j].strip()
                if t and not is_table_token(t) and not SEP_LINE.match(t) and t.lower() != 'note.':
                    chapter_title = t
                    break
                j += 1
            i = j
            break
        i += 1

    # Fallbacks
    if chapter_num is None:
        chapter_num = 0
    if not chapter_title:
        chapter_title = f"Chapter {chapter_num:02d}"

    rows = []
    current_heading_code = ""
    current_heading_title = ""

    # Helper to emit a heading-only row (with empty subheading fields)
    def emit_heading():
        if current_heading_code and current_heading_title:
            rows.append({
                "Chapter": f"{chapter_num:02d}",
                "Chapter Value": chapter_title,
                "Heading": current_heading_code,
                "Heading Value": current_heading_title,
                "Subheading": "",
                "Subheading Value": ""
            })

    # 2) Walk content and extract headings and subheadings
    # Move to first content token (either table header or a heading code)
    while i < len(lines) and not heading_pat.match(lines[i]) and not is_table_token(lines[i]) and not is_separator(lines[i]):
        i += 1

    while i < len(lines):
        line = lines[i].strip()

        # Skip table artifacts
        if not line or is_table_token(line) or is_separator(line) or line.lower() == 'note.':
            i += 1
            continue

        # New heading like "01.01"
        if heading_pat.match(line):
            # Optionally emit previous heading-only row if desired
            emit_heading()

            current_heading_code = line
            # Next non-empty, non-token, non-code line is the heading title
            j = i + 1
            heading_title = ""
            while j < len(lines):
                nxt = lines[j].strip()
                if not nxt or is_table_token(nxt) or is_separator(nxt):
                    j += 1
                    continue
                if heading_pat.match(nxt) or subhead_pat.match(nxt):
                    break
                heading_title = clean_desc_line(nxt)
                break
            current_heading_title = heading_title or ""
            # If title was not found, keep empty; we still continue scanning
            i = j
            continue

        # Subheading like "0101.21"
        if subhead_pat.match(line):
            sub_code = line
            # Collect description lines until next code/header/separator/empty heading token
            j = i + 1
            desc_parts = []
            while j < len(lines):
                nxt = lines[j].strip()
                if (not nxt or is_table_token(nxt) or is_separator(nxt) or
                    heading_pat.match(nxt) or subhead_pat.match(nxt)):
                    break
                desc_parts.append(clean_desc_line(nxt))
                j += 1
            sub_desc = ' '.join([p for p in desc_parts if p]).strip()

            rows.append({
                "Chapter": f"{chapter_num:02d}",
                "Chapter Value": chapter_title,
                "Heading": current_heading_code,
                "Heading Value": current_heading_title,
                "Subheading": sub_code,
                "Subheading Value": sub_desc
            })
            i = j
            continue

        # Any other line, advance
        i += 1

    # Emit the last heading-only row (optional, can be commented out if not needed)
    emit_heading()

    return rows

def write_csv(rows: List[Dict], out_path: str):
    fieldnames = ["Chapter", "Chapter Value", "Heading", "Heading Value", "Subheading", "Subheading Value"]
    out = Path(out_path)
    # If user passed a directory (e.g. '.'), write a default filename inside it
    if out.exists() and out.is_dir():
        out = out / "chapters_combined.csv"
    else:
        # If it looks like a directory path (ends with separator) or has no suffix, treat as directory
        if str(out_path).endswith(('/', '\\')):
            out = Path(out_path) / "chapters_combined.csv"

    # Ensure parent directory exists
    out.parent.mkdir(parents=True, exist_ok=True)

    resolved = str(out)
    with open(resolved, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    print(f"Wrote {len(rows)} rows to {resolved}")

def parse_all_txt_in_folder(folder: str) -> List[Dict]:
    folder_path = Path(folder)
    all_rows: List[Dict] = []
    for txt in sorted(folder_path.glob("*.txt")):
        try:
            rows = parse_chapter_txt(str(txt))
            all_rows.extend(rows)
            print(f"Parsed {txt} -> {len(rows)} rows")
        except Exception as e:
            print(f"Failed {txt}: {e}")
    return all_rows

if __name__ == "__main__":
    # Usage: python script.py /path/to/txt_dir [output_csv]
    if len(sys.argv) < 2:
        print("Usage: python script.py <txt_folder> [output_csv]")
        sys.exit(1)
    txt_folder = sys.argv[1]
    output_csv = sys.argv[2] if len(sys.argv) > 2 else "chapters_combined.csv"
    combined_rows = parse_all_txt_in_folder(txt_folder)
    write_csv(combined_rows, output_csv)
    print(f"Wrote {len(combined_rows)} total rows to {output_csv}")
