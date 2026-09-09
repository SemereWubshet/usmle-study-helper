import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "datasets" / "usmle.db"


def get_db():
    """Yields a SQLite connection with dict-like row access."""
    # print(f"📦 Connecting to SQLite at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


if __name__ == "__main__":
    # Test the database connection by printing table names
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("✅ Connected to SQLite. Tables in the database:")
        for table in tables:
            print(f" - {table['name']}")