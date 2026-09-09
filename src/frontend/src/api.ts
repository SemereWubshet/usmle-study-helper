export const fetchDashboardStats = async () => {
  const res = await fetch('/api/v1/analytics/dashboard');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
};

export const createSession = async (qbankName = "medmcqa", targetCount = 40) => {
  const res = await fetch('/api/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qbank_name: qbankName, target_count: targetCount }),
  });
  if (!res.ok) throw new Error('Failed to create session');
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