import networkx as nx
from typing import List, Set, Tuple, Dict
from app.models.clinical_graph import GraphNode, GraphEdge


def build_halo_neighborhood(
    core_cuis: Set[str],
    graph: nx.DiGraph,
    cui_to_name: Dict[str, str],
    max_halo_nodes: int = 24,
) -> Tuple[List[GraphNode], List[GraphEdge]]:
    """
    Extracts 1-hop contextual neighbors around primary nodes on the pre-pruned clinical graph.
    """
    halo_nodes: List[GraphNode] = []
    halo_edges: List[GraphEdge] = []
    seen_nodes: Set[str] = set(core_cuis)

    for core in core_cuis:
        if core not in graph:
            continue

        neighbors = list(graph.successors(core)) + list(graph.predecessors(core))
        for nbr in neighbors:
            if nbr in seen_nodes:
                continue

            name = cui_to_name.get(nbr, "").strip()
            if not name or len(name) < 3:
                continue

            edge_data = graph.get_edge_data(core, nbr) or graph.get_edge_data(nbr, core) or {}
            rel = str(edge_data.get("label", "associated_with"))

            halo_nodes.append(
                GraphNode(
                    id=nbr,
                    label=name,
                    type="halo",
                    is_primary=False,
                )
            )
            halo_edges.append(
                GraphEdge(
                    source=core,
                    target=nbr,
                    relation=rel,
                    is_primary=False,
                )
            )
            seen_nodes.add(nbr)

            if len(halo_nodes) >= max_halo_nodes:
                return halo_nodes, halo_edges

    return halo_nodes, halo_edges
