"""
Download and Extract Anki Deck (.apkg -> collection.anki2)
===========================================================

This script downloads an Anki deck (.apkg file) from a provided URL,
unzips it to extract the raw SQLite database (collection.anki2),
and inspects the internal tables to verify the card count.

Usage:
1. Paste your download link into `ANKI_DECK_URL` below.
2. Run: python lab/scripts/download_and_extract_anki.py
"""

import os
import sys
import time
import zipfile
import sqlite3
import urllib.request
from pathlib import Path

# ==============================================================================
# CONFIGURATION - PASTE YOUR URL HERE
# ==============================================================================
# Paste your direct download link, Archive.org link, Google Drive link, etc.
ANKI_DECK_URL = "PASTE_YOUR_DOWNLOAD_LINK_HERE"

# Where raw downloads and extracted SQLite files should be placed
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "anki_raw"
OUTPUT_FILE_NAME = "deck.apkg"
# ==============================================================================


def format_size(bytes_val: int) -> str:
    """Format bytes into human-readable size."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} TB"


def download_with_progress(url: str, dest_path: Path):
    """Download a file with real-time progress reporting."""
    print(f"\n🌐 Connecting to:\n   {url}\n")
    print(f"📁 Saving to: {dest_path}")

    start_time = time.time()

    def report_hook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        elapsed = time.time() - start_time
        speed = downloaded / elapsed if elapsed > 0 else 0

        if total_size > 0:
            percent = min(100.0, (downloaded / total_size) * 100)
            bar_len = 30
            filled_len = int(bar_len * percent // 100)
            bar = "█" * filled_len + "░" * (bar_len - filled_len)
            print(
                f"\r[{bar}] {percent:5.1f}% | {format_size(downloaded)} / {format_size(total_size)} "
                f"({format_size(speed)}/s)",
                end="",
                flush=True
            )
        else:
            print(f"\rDownloading: {format_size(downloaded)} ({format_size(speed)}/s)", end="", flush=True)

    # Set custom user agent to avoid 403 blocks on some hosts
    opener = urllib.request.build_opener()
    opener.addheaders = [("User-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) USMLE-Study-Helper/1.0")]
    urllib.request.install_opener(opener)

    urllib.request.urlretrieve(url, dest_path, reporthook=report_hook)
    print("\n✅ Download completed successfully!")


def extract_anki_database(apkg_path: Path, extract_dir: Path) -> Path:
    """Unzip the .apkg file and locate the SQLite database file."""
    print(f"\n📦 Inspecting archive: {apkg_path.name}")
    if not zipfile.is_zipfile(apkg_path):
        raise ValueError(f"Error: {apkg_path} is not a valid zip/apkg archive. Check if the URL redirected to an HTML page.")

    with zipfile.ZipFile(apkg_path, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        print(f"   Archive contains {len(file_list)} files.")

        # Anki databases are named collection.anki2 or collection.anki21
        db_candidates = [f for f in file_list if f in ('collection.anki2', 'collection.anki21')]
        if not db_candidates:
            # Fallback check for any .anki2 or .db file inside
            db_candidates = [f for f in file_list if f.endswith('.anki2') or f.endswith('.anki21') or f.endswith('.db')]

        if not db_candidates:
            raise FileNotFoundError("Could not find collection.anki2 database inside the .apkg archive.")

        target_db = 'collection.anki2' if 'collection.anki2' in db_candidates else db_candidates[0]
        print(f"   Extracting SQLite database: '{target_db}'...")
        zip_ref.extract(target_db, extract_dir)
        extracted_db_path = extract_dir / target_db
        print(f"✅ Extracted database to: {extracted_db_path} ({format_size(extracted_db_path.stat().st_size)})")
        return extracted_db_path


def inspect_anki_database(db_path: Path):
    """Run sanity checks and print summary statistics from the SQLite database."""
    print(f"\n🔍 Inspecting raw Anki SQLite database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check available tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"   Tables found: {', '.join(tables)}")

        # Count notes (where the actual question text/fields live)
        if 'notes' in tables:
            cursor.execute("SELECT COUNT(*) FROM notes;")
            note_count = cursor.fetchone()[0]
            print(f"   📝 Total Notes (Cards/Concepts): {note_count:,}")

            # Preview sample note
            cursor.execute("SELECT id, tags, flds FROM notes LIMIT 1;")
            sample = cursor.fetchone()
            if sample:
                sample_id, sample_tags, sample_flds = sample
                fields = sample_flds.split('\x1f')
                print("\n   --- Sample Note Preview ---")
                print(f"   ID: {sample_id}")
                print(f"   Tags: {sample_tags[:100]}..." if len(sample_tags) > 100 else f"   Tags: {sample_tags}")
                print(f"   Number of fields: {len(fields)}")
                clean_preview = fields[0].replace('\n', ' ')[:140]
                print(f"   Field 1 (Front/Text preview): {clean_preview}...")

        # Count cards (scheduling/study cards generated from notes)
        if 'cards' in tables:
            cursor.execute("SELECT COUNT(*) FROM cards;")
            card_count = cursor.fetchone()[0]
            print(f"   🎴 Total Flashcards: {card_count:,}")

    finally:
        conn.close()

    print("\n✨ Database is intact and ready for clean ingestion into our app's format!")


def main():
    print("=" * 65)
    print("  Anki Deck Ingestion: Downloader & Database Extractor")
    print("=" * 65)

    if ANKI_DECK_URL == "PASTE_YOUR_DOWNLOAD_LINK_HERE" or not ANKI_DECK_URL.strip():
        print("\n⚠️  PLEASE CONFIGURE YOUR URL FIRST!")
        print("   Open this script in your editor:")
        print(f"   {Path(__file__).resolve()}")
        print("\n   Change line 25:")
        print('   ANKI_DECK_URL = "https://your-link-here.apkg"')
        print("\n   Then run this script again.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    apkg_target = OUTPUT_DIR / OUTPUT_FILE_NAME

    # 1. Download
    download_with_progress(ANKI_DECK_URL.strip(), apkg_target)

    # 2. Extract collection.anki2
    db_file = extract_anki_database(apkg_target, OUTPUT_DIR)

    # 3. Sanity inspection
    inspect_anki_database(db_file)

    print("\n🎉 All done! The SQLite database is saved at:")
    print(f"   {db_file}")


if __name__ == "__main__":
    main()

