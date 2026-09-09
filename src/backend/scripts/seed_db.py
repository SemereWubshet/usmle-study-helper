import sqlite3
from pathlib import Path
from datasets import load_dataset

# Resolve path so usmle.db is created inside the backend datasets directory
DB_PATH = Path(__file__).resolve().parent.parent / "datasets" / "usmle.db"


def seed_database():
    print("⏳ Downloading medmcqa dataset from Hugging Face...")
    # Load 'train' split (or 'validation' split if you want a fast test with ~4k rows first)
    dataset = load_dataset("openlifescienceai/medmcqa", split="train")

    print("🔄 Converting to pandas and filtering...")
    df = dataset.to_pandas()

    # Keep clean single-choice questions with valid options
    df = df[df["choice_type"] == "single"].copy()
    df = df.dropna(subset=["question", "opa", "opb", "opc", "opd", "cop"])

    # Rename to match our clean internal schema
    df = df.rename(
        columns={
            "exp": "explanation",
            "subject_name": "subject",
            "cop": "correct_option",
        }
    )

    # Select only the columns we care about
    columns_to_keep = [
        "id",
        "question",
        "opa",
        "opb",
        "opc",
        "opd",
        "correct_option",
        "explanation",
        "subject",
    ]
    df = df[columns_to_keep]

    print(f"📦 Writing {len(df):,} questions to SQLite at {DB_PATH}...")
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Bank Questions table
    df.to_sql("bank_questions", conn, if_exists="replace", index=False)

    # 2. Add an index for faster queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_questions_id ON bank_questions(id);")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_questions_subject ON bank_questions(subject);"
    )

    # 3. User History table (records attempts)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_history (
            attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            selected_option INTEGER NOT NULL,
            is_correct BOOLEAN NOT NULL,
            answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES bank_questions(id)
        );
        """
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_qid ON user_history(question_id);"
    )

    conn.commit()
    conn.close()
    print(" Database seeded successfully!")


if __name__ == "__main__":
    seed_database()