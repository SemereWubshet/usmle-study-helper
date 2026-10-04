import { API_BASE_URL } from '@/api';
import type {
  ExtractCluesRequest,
  ClueExtractionResponse,
  BuildGraphRequest,
  ClinicalGraphResponse,
} from './types';

export async function extractClues(req: ExtractCluesRequest): Promise<ClueExtractionResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinical-graph/extract-clues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Extraction failed with HTTP ${res.status}`);
  }

  return res.json();
}

export async function buildConvergenceGraph(req: BuildGraphRequest): Promise<ClinicalGraphResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinical-graph/build-graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clues: req.clues,
      target: req.target,
      include_halo: req.include_halo ?? true,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Graph generation failed with HTTP ${res.status}`);
  }

  return res.json();
}
