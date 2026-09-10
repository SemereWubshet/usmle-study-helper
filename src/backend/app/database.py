import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROFILE_DB = BASE_DIR / "profile" / "stats.db"
MEDMCQA_DB = BASE_DIR / "datasets" / "medmcqa.db"
MEDQA_USMLE_DB = BASE_DIR / "datasets" / "medqa_usmle.db"

def init_profile_db():
    """Ensures the console save file exists with the relational session schema."""
    PROFILE_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(PROFILE_DB)
    
    # 1. The Session Container (Updated Schema)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qbank TEXT DEFAULT 'medqa_usmle',
            scope TEXT DEFAULT 'All',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_completed BOOLEAN DEFAULT 0
        );
    ''')
    
    # 2. The Granular Attempt Data
    conn.execute('''
        CREATE TABLE IF NOT EXISTS session_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            selected_option INTEGER NOT NULL,
            is_correct BOOLEAN NOT NULL,
            time_spent_seconds INTEGER NOT NULL,
            answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES study_sessions(id)
        );
    ''')

    # 3. Session Questions Link Table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS session_questions (
            session_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            correct_option INTEGER NOT NULL,
            FOREIGN KEY (session_id) REFERENCES study_sessions(id)
        );
    ''')
    
    conn.commit()
    conn.close()

def get_db():
    """Yields a SQLite connection with the profile and all cartridges attached."""
    init_profile_db()
    
    conn = sqlite3.connect(PROFILE_DB)
    conn.row_factory = sqlite3.Row
    
    # Attach all available Q-Banks with distinct aliases
    conn.execute(f"ATTACH DATABASE '{MEDMCQA_DB}' AS medmcqa;")
    conn.execute(f"ATTACH DATABASE '{MEDQA_USMLE_DB}' AS medqa_usmle;")
    
    try:
        yield conn
    finally:
        conn.close()