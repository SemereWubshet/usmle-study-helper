import logging
from typing import List, Dict, Set, Tuple
from app.models.clinical_graph import (
    BuildGraphRequest,
    ClinicalGraphResponse,
    CluePath,
    GraphNode,
    GraphEdge,
    PathStep,
)
from app.services.graph_loader import get_graph_and_vocab
from app.services.graph_entity_resolver import resolve_clinical_concept
from app.services.graph_pathfinder import find_path_between_concepts
from app.services.graph_halo_builder import build_halo_neighborhood

logger = logging.getLogger(__name__)


def build_convergence_graph(request: BuildGraphRequest) -> ClinicalGraphResponse:
    """
    Coordinates entity resolution, path convergence, halo expansion, and graph construction.
    """
    graph, cui_to_name, active_name_to_cui = get_graph_and_vocab()

    # 1. Resolve Target
    tgt_matches = resolve_clinical_concept(request.target, active_name_to_cui, cui_to_name, top_k=1)
    if not tgt_matches:
        raise ValueError(f"Target concept '{request.target}' could not be resolved in the active medical graph.")

    tgt_cui, tgt_name = tgt_matches[0]

    # 2. Build paths from clues to target
    paths: List[CluePath] = []
    primary_nodes_map: Dict[str, GraphNode] = {}
    primary_edges: List[GraphEdge] = []
    seen_edge_pairs: Set[Tuple[str, str, str]] = set()

    # Register target node
    primary_nodes_map[tgt_cui] = GraphNode(
        id=tgt_cui,
        label=tgt_name,
        type="target",
        is_primary=True,
    )

    clue_cuis: Set[str] = set()
    intermediate_cuis: Set[str] = set()

    for clue_str in request.clues:
        matches = resolve_clinical_concept(clue_str, active_name_to_cui, cui_to_name, top_k=1)
        if not matches:
            paths.append(CluePath(clue=clue_str, found=False))
            continue

        c_cui, c_name = matches[0]
        clue_cuis.add(c_cui)

        # Register clue node
        primary_nodes_map[c_cui] = GraphNode(
            id=c_cui,
            label=c_name,
            type="clue",
            is_primary=True,
        )

        # Find shortest clinical path
        steps: List[PathStep] = find_path_between_concepts(c_cui, tgt_cui, graph, cui_to_name)
        if not steps:
            paths.append(
                CluePath(
                    clue=clue_str,
                    found=False,
                    resolved_id=c_cui,
                    resolved_name=c_name,
                )
            )
            continue

        paths.append(
            CluePath(
                clue=clue_str,
                found=True,
                resolved_id=c_cui,
                resolved_name=c_name,
                steps=steps,
            )
        )

        # Register intermediate steps & edges
        for step in steps:
            for node_id, node_name in [(step.from_id, step.from_name), (step.to_id, step.to_name)]:
                if node_id not in primary_nodes_map:
                    primary_nodes_map[node_id] = GraphNode(
                        id=node_id,
                        label=node_name,
                        type="intermediate",
                        is_primary=True,
                    )
                    intermediate_cuis.add(node_id)

            edge_key = (step.from_id, step.to_id, step.relation)
            if edge_key not in seen_edge_pairs:
                primary_edges.append(
                    GraphEdge(
                        source=step.from_id,
                        target=step.to_id,
                        relation=step.relation,
                        is_primary=True,
                    )
                )
                seen_edge_pairs.add(edge_key)

    # 3. Optional Halo Expansion
    halo_nodes: List[GraphNode] = []
    halo_edges: List[GraphEdge] = []
    if request.include_halo:
        core_cuis = set(primary_nodes_map.keys())
        halo_nodes, halo_edges = build_halo_neighborhood(core_cuis, graph, cui_to_name, max_halo_nodes=20)

    all_nodes = list(primary_nodes_map.values()) + halo_nodes
    all_edges = primary_edges + halo_edges

    connected_count = sum(1 for p in paths if p.found)

    return ClinicalGraphResponse(
        target_resolved={"id": tgt_cui, "name": tgt_name},
        paths=paths,
        nodes=all_nodes,
        edges=all_edges,
        stats={
            "total_clues": len(request.clues),
            "connected_clues": connected_count,
            "total_nodes": len(all_nodes),
            "total_edges": len(all_edges),
            "halo_nodes": len(halo_nodes),
        },
    )
