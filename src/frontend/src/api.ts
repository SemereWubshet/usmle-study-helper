export interface SessionPayload {
  qbank: string;
  block_size: number;
  subjects?: string[];
  exam_type?: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  subject?: string | null;
  explanation?: string | null;
  correct_text?: string | null;
  exam_type?: string | null;
  metamap_phrases?: string[] | null;
  opa?: string;
  opb?: string;
  opc?: string;
  opd?: string;
}

export interface AttemptOut {
  question_id: string;
  selected_option: number;
  correct_option: number;
  is_correct: boolean;
  explanation?: string | null;
}



// In local development with Vite dev proxy, API_BASE_URL defaults to empty string ('')
// In production (Vercel / custom domain), VITE_API_BASE_URL points to the local HTTPS loopback (e.g. 'https://usmle-local-engine.semere.dev:8000')
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface EngineHealth {
  status: string;
  version: string;
  engine: string;
}

export const checkEngineHealth = async (customBaseUrl?: string): Promise<EngineHealth> => {
  const base = (customBaseUrl !== undefined ? customBaseUrl : API_BASE_URL).replace(/\/$/, '');
  const url = `${base}/api/v1/health`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    // Short timeout so the UI gate does not hang indefinitely if engine is offline
    signal: AbortSignal.timeout(3500)
  });
  if (!res.ok) throw new Error(`Engine returned status ${res.status}`);
  return res.json();
};

// Intercepts API fetch errors when the engine shuts down and notifies the UI gate
const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const res = await fetch(input, init);
    return res;
  } catch (err) {
    window.dispatchEvent(new CustomEvent('engine-disconnected'));
    throw err;
  }
};

export const fetchDashboardStats = async () => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/analytics/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
};

export interface SubjectItem {
  subject: string;
  count: number;
}

export const fetchAvailableSubjects = async (qbank: string, examType?: string): Promise<SubjectItem[]> => {
  const params = new URLSearchParams({ qbank });
  if (examType) params.append('exam_type', examType);
  const res = await safeFetch(`${API_BASE_URL}/api/v1/subjects?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch subjects');
  return res.json();
};

export const createSession = async (payload: SessionPayload) => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate session');
  return res.json();
};

export const fetchQuestion = async (questionId: string) => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/questions/${questionId}`);
  if (!res.ok) throw new Error('Failed to fetch question');
  return res.json();
};

export const submitSessionAttempt = async (
  sessionId: number, 
  questionId: string, 
  selectedOption: number, 
  timeSpent: number
) => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: questionId,
      selected_option: selectedOption,
      time_spent_seconds: timeSpent,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit attempt');
  return res.json();
};

export const completeSession = async (sessionId: number) => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to mark session complete');
  return res.json();
};

export const fetchSessionReview = async (sessionId: number) => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/review`);
  if (!res.ok) throw new Error('Failed to fetch session review data');
  return res.json();
};

export const retrySession = async (sessionId: number) => {
  const res = await safeFetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/retry`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to retry session');
  return res.json();
};

// --- MedlinePlus / MedSearch Encyclopedia Models & API ---
export type MedSearchProvider = 'medlineplus' | 'statpearls' | 'openfda' | 'rxnorm'

export interface EncyclopediaSection {
  heading: string;
  body: string;
  clean_text: string;
}

export interface EncyclopediaEntry {
  title: string;
  url: string;
  summary: string;
  alt_titles: string[];
  sections: EncyclopediaSection[];
  source?: string;
  source_label?: string;
  badge?: string | null;
}

export const fetchEncyclopedia = async (term: string, source: MedSearchProvider = 'medlineplus'): Promise<EncyclopediaEntry[]> => {
  if (!term || term.trim().length < 2) return [];
  const res = await safeFetch(`${API_BASE_URL}/api/v1/encyclopedia?term=${encodeURIComponent(term.trim())}&source=${encodeURIComponent(source)}`);
  if (!res.ok) throw new Error(`Encyclopedia lookup failed with status ${res.status}`);
  return res.json();
};