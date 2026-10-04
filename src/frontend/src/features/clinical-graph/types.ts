export type NodeType = 'clue' | 'intermediate' | 'target' | 'halo';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  is_primary: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  is_primary: boolean;
}

export interface PathStep {
  from_id: string;
  from_name: string;
  relation: string;
  to_id: string;
  to_name: string;
}

export interface CluePath {
  clue: string;
  found: boolean;
  resolved_id?: string;
  resolved_name?: string;
  steps: PathStep[];
}

export interface BuildGraphRequest {
  clues: string[];
  target: string;
  include_halo?: boolean;
}

export interface ExtractCluesRequest {
  vignette: string;
  correct_answer: string;
  api_key?: string;
}

export interface ClueExtractionResponse {
  clues: string[];
  model_used: string;
  status: 'success' | 'fallback' | 'failed';
  raw_count: number;
}

export interface ClinicalGraphResponse {
  target_resolved: {
    id: string;
    name: string;
  };
  paths: CluePath[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total_clues: number;
    connected_clues: number;
    total_nodes: number;
    total_edges: number;
    halo_nodes: number;
  };
}
