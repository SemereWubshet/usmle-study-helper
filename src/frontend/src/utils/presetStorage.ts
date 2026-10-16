export interface SessionPreset {
  selectedQbank: string; // e.g. "medqa_usmle" or "medmcqa"
  examTarget: string; // e.g. "USMLE Step 1" or "USMLE Step 2 and Step 3"
  selectedSubjects: string[]; // e.g. ['All Subjects'] or specific subjects
  blockCount: number; // e.g. 40
  examDurationMinutes: number; // e.g. 60
  paceTargetSeconds: number; // e.g. 90
}

const PRESET_STORAGE_KEY = 'usmle_session_preset';

export const DEFAULT_PRESET: SessionPreset = {
  selectedQbank: 'medqa_usmle',
  examTarget: 'USMLE Step 1',
  selectedSubjects: ['All Subjects'],
  blockCount: 40,
  examDurationMinutes: 60,
  paceTargetSeconds: 90,
};

export function getStoredPreset(): SessionPreset {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return DEFAULT_PRESET;
    const parsed = JSON.parse(raw);
    return {
      selectedQbank: parsed.selectedQbank || 'medqa_usmle',
      examTarget: parsed.examTarget || 'USMLE Step 1',
      selectedSubjects: Array.isArray(parsed.selectedSubjects) && parsed.selectedSubjects.length > 0
        ? parsed.selectedSubjects
        : ['All Subjects'],
      blockCount: Number(parsed.blockCount) || 40,
      examDurationMinutes: Number(parsed.examDurationMinutes) || 60,
      paceTargetSeconds: Number(parsed.paceTargetSeconds) || 90,
    };
  } catch {
    return DEFAULT_PRESET;
  }
}

export function saveStoredPreset(preset: SessionPreset): void {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent('usmle_preset_changed', { detail: preset }));
  } catch {
    // ignore
  }
}

