#!/usr/bin/env python3
# pip install pymupdf
import os, sys, fitz

def pdf_to_txt_dir(pdf_dir, out_dir=None):
    pdf_dir = os.path.abspath(pdf_dir)
    out_dir = os.path.abspath(out_dir or pdf_dir)
    os.makedirs(out_dir, exist_ok=True)
    count = 0

    for name in os.listdir(pdf_dir):
        if not name.lower().endswith(".pdf"):
            continue
        pdf_path = os.path.join(pdf_dir, name)
        base = os.path.splitext(name)[0]
        txt_path = os.path.join(out_dir, f"{base}.txt")

        try:
            doc = fitz.open(pdf_path)
            text = []
            for page in doc:
                text.append(page.get_text())
            doc.close()
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write("\n".join(text))
            count += 1
            print(f"Wrote: {txt_path}")
        except Exception as e:
            print(f"Failed: {pdf_path} -> {e}", file=sys.stderr)

    print(f"Done. {count} files written to {out_dir}")

if __name__ == "__main__":
    # Usage: python script.py /path/to/pdfs [/path/to/output]
    if len(sys.argv) < 2:
        print("Usage: python script.py <pdf_dir> [out_dir]")
        sys.exit(1)
    pdf_to_txt_dir(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
