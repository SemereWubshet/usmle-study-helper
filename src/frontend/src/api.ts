// src/api.ts
export const fetchNextQuestion = async () => {
  const res = await fetch('/api/v1/questions/next');
  if (!res.ok) throw new Error('Failed to fetch question');
  return res.json();
};

export const fetchAnalytics = async () => {
  const res = await fetch('/api/v1/analytics/overview');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
};

export const submitAttempt = async (questionId: string, selectedOption: number) => {
  const res = await fetch(`/api/v1/questions/${questionId}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selected_option: selectedOption }),
  });
  if (!res.ok) throw new Error('Failed to submit attempt');
  return res.json();
};