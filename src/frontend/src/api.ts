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
}

export const fetchDashboardStats = async () => {
  const res = await fetch('/api/v1/analytics/dashboard');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
};

export const createSession = async (payload: SessionPayload) => {
  const res = await fetch('/api/v1/sessions/', {
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
  const res = await fetch(`/api/v1/questions/${questionId}`);
  if (!res.ok) throw new Error('Failed to fetch question');
  return res.json();
};

export const submitSessionAttempt = async (
  sessionId: number, 
  questionId: string, 
  selectedOption: number, 
  timeSpent: number
) => {
  const res = await fetch(`/api/v1/sessions/${sessionId}/attempt`, {
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