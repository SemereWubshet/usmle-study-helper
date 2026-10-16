export interface UserGoals {
  passingThreshold: number; // e.g. 60 (%)
  excellenceThreshold: number; // e.g. 80 (%)
  targetSeconds: number; // e.g. 90 (seconds)
}

const STORAGE_KEY = 'usmle_user_goals';

export const DEFAULT_GOALS: UserGoals = {
  passingThreshold: 60,
  excellenceThreshold: 80,
  targetSeconds: 90,
};

export function getStoredGoals(): UserGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GOALS;
    const parsed = JSON.parse(raw);
    return {
      passingThreshold: Number(parsed.passingThreshold) || 60,
      excellenceThreshold: Number(parsed.excellenceThreshold) || 80,
      targetSeconds: Number(parsed.targetSeconds) || 90,
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveStoredGoals(goals: UserGoals): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    window.dispatchEvent(new CustomEvent('usmle_goals_changed', { detail: goals }));
  } catch {
    // ignore
  }
}

