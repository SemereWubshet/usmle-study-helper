import argparse
import json
import sqlite3
import uuid
from pathlib import Path
from datasets import load_dataset

def create_table(cursor):
    """Creates the standardized superset schema for all Q-Bank cartridges."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bank_questions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            opa TEXT,
            opb TEXT,
            opc TEXT,
            opd TEXT,
            correct_option INTEGER,
            correct_text TEXT,
            explanation TEXT,
            subject TEXT,
            topic TEXT,
            exam_type TEXT,
            metamap_phrases TEXT,
            split_name TEXT
        );
    """)

def ingest_medmcqa(output_dir: Path, limit: int = None):
    db_path = output_dir / "medmcqa.db"
    print(f"\n--- Ingesting MedMCQA into {db_path} ---")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    create_table(cursor)
    
    # Loading without a specific split returns a DatasetDict containing all splits
    ds_dict = load_dataset("openlifescienceai/medmcqa")
    records = []
    
    for split_name, ds in ds_dict.items():
        if limit:
            ds = ds.select(range(min(limit, len(ds))))
            
        print(f"Processing split: {split_name} ({len(ds)} rows)")
        for row in ds:
            # Filter out combination choices to strictly match USMLE format
            if str(row.get("choice_type", "single")).lower() == "multi":
                continue

            q_id = str(row.get("id") or uuid.uuid4())
            question = str(row.get("question", ""))
            opa = str(row.get("opa", ""))
            opb = str(row.get("opb", ""))
            opc = str(row.get("opc", ""))
            opd = str(row.get("opd", ""))
            
            # Normalize 1-indexed string/ints to 0-indexed integers
            cop_raw = row.get("cop")
            correct_option = 0
            if str(cop_raw) in ["1", "2", "3", "4"]:
                correct_option = int(cop_raw) - 1
                
            # Dynamically fetch the text of the correct answer
            options_list = [opa, opb, opc, opd]
            correct_text = options_list[correct_option] if 0 <= correct_option < 4 else ""
            
            explanation = str(row.get("exp")) if row.get("exp") else None
            subject = str(row.get("subject_name")) if row.get("subject_name") else None
            topic = str(row.get("topic_name")) if row.get("topic_name") else None
            exam_type = "AIIMS & NEET PG"
            metamap_phrases = None
            
            records.append((
                q_id, question, opa, opb, opc, opd, correct_option, correct_text,
                explanation, subject, topic, exam_type, metamap_phrases, split_name
            ))
            
    print("Writing to database...")
    cursor.executemany(
        "INSERT OR REPLACE INTO bank_questions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
        records
    )
    # Index by subject and split for fast filtering in the app
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_subject ON bank_questions(subject);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_split ON bank_questions(split_name);")
    conn.commit()
    conn.close()
    print("MedMCQA ingestion complete.")

def ingest_medqa_usmle(output_dir: Path, limit: int = None):
    db_path = output_dir / "medqa_usmle.db"
    print(f"\n--- Ingesting MedQA-USMLE into {db_path} ---")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    create_table(cursor)
    
    ds_dict = load_dataset("ssswwwxxx/medqa-usmle-4-options")
    records = []
    
    for split_name, ds in ds_dict.items():
        if limit:
            ds = ds.select(range(min(limit, len(ds))))
            
        print(f"Processing split: {split_name} ({len(ds)} rows)")
        for row in ds:
            q_id = str(uuid.uuid4())
            question = str(row.get("question", ""))
            
            # Map the A-D dictionary to flat columns
            options = row.get("options", {})
            opa = str(options.get("A", ""))
            opb = str(options.get("B", ""))
            opc = str(options.get("C", ""))
            opd = str(options.get("D", ""))
            
            # Normalize A-D answer keys to 0-3 indices
            ans_idx = str(row.get("answer_idx", "")).strip().upper()
            mapping = {"A": 0, "B": 1, "C": 2, "D": 3}
            correct_option = mapping.get(ans_idx, 0)
            correct_text = str(row.get("answer", ""))
            
            # Nullify unused fields
            explanation = None
            subject = None
            topic = None
            
            meta_raw = str(row.get("meta_info", "")).strip().lower()
            exam_mapping = {
                "step1": "USMLE Step 1",
                "step2&3": "USMLE Step 2 and Step 3",
                "step2 and step3": "USMLE Step 2 and Step 3"
            }
            exam_type = exam_mapping.get(meta_raw, str(row.get("meta_info")) if row.get("meta_info") else None)
            
            # Stringify JSON metadata safely
            mm_phrases = row.get("metamap_phrases")
            metamap_phrases = json.dumps(mm_phrases) if mm_phrases else None
            
            records.append((
                q_id, question, opa, opb, opc, opd, correct_option, correct_text,
                explanation, subject, topic, exam_type, metamap_phrases, split_name
            ))
            
    print("Writing to database...")
    cursor.executemany(
        "INSERT OR REPLACE INTO bank_questions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
        records
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_split ON bank_questions(split_name);")
    conn.commit()
    conn.close()
    print("MedQA-USMLE ingestion complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed standardized SQLite cartridges for MedMCQA and MedQA-USMLE.")
    parser.add_argument("--limit", type=int, default=None, help="Limit row count per split (for rapid testing)")
    args = parser.parse_args()
    
    # Resolve the /datasets folder relative to this script's location
    project_root = Path(__file__).resolve().parent.parent
    output_dir = project_root / "datasets"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    ingest_medmcqa(output_dir, args.limit)
    ingest_medqa_usmle(output_dir, args.limit)
    
    print("\nAll cartridges seeded successfully!")