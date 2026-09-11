"""
Script to debloat medmcqa.db to fit comfortably under GitHub's 100MB limit.
Filters out questions without explanations and runs VACUUM.
"""

import sqlite3
import shutil
from pathlib import Path

DATASETS_DIR = Path(__file__).resolve().parent.parent / "datasets"
DB_PATH = DATASETS_DIR / "medmcqa.db"
BACKUP_PATH = DATASETS_DIR / "medmcqa.db.bak"

def main():
    if not DB_PATH.exists():
        print(f"Error: {DB_PATH} does not exist!")
        return

    size_before_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"Original file size: {size_before_mb:.2f} MB")

    # 1. Create a safe backup first
    print(f"Creating backup at {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    total_before = cursor.execute("SELECT count(*) FROM bank_questions").fetchone()[0]
    print(f"Total questions before: {total_before:,}")

    # 2. Delete questions without explanations (low yield)
    print("Deleting questions with missing or trivial explanations (<15 chars)...")
    cursor.execute("""
        DELETE FROM bank_questions 
        WHERE explanation IS NULL OR length(trim(explanation)) < 15;
    """)
    conn.commit()

    total_after = cursor.execute("SELECT count(*) FROM bank_questions").fetchone()[0]
    print(f"Total questions remaining: {total_after:,} (Removed {total_before - total_after:,})")

    # 3. VACUUM to reclaim free space on disk
    print("Running VACUUM to defragment and reclaim disk space...")
    cursor.execute("VACUUM;")
    conn.close()

    size_after_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"New file size: {size_after_mb:.2f} MB")
    print(f"Reclaimed: {size_before_mb - size_after_mb:.2f} MB")

    if size_after_mb < 95:
        print(" SUCCESS: Database is now safely under GitHub's 100MB limit!")
        # Clean up backup
        BACKUP_PATH.unlink(missing_ok=True)
    else:
        print(" Still slightly over, further optimization recommended.")

if __name__ == "__main__":
    main()
