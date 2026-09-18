export const PASSING_ACCURACY_THRESHOLD = 60; // Standard USMLE passing score (default: 60%)
export const EXCELLENT_ACCURACY_THRESHOLD = 80; // High-yield mastery threshold (default: 80%)
export const TARGET_SECONDS_PER_QUESTION = 90; // Standard USMLE time allotment per question (default: 90s)

export interface StoredAttempt {
  questionId: string;
  questionIndex: number; // 0-based
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  timeSpent: number;
  explanation?: string | null;
  subject?: string | null;
  questionText?: string;
  options?: string[];
  correctText?: string | null;
}

export interface SessionCustomConfig {
  passingThreshold: number;
  excellenceThreshold: number;
  targetSeconds: number;
}

