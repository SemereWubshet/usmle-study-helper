import networkx as nx
from typing import List, Dict
from app.models.clinical_graph import PathStep


def find_path_between_concepts(
    src_cui: str,
    tgt_cui: str,
    graph: nx.DiGraph,
    cui_to_name: Dict[str, str],
) -> List[PathStep]:
    """
    Finds a directional or bidirectional shortest path across the pre-pruned clinical graph.
    Returns ordered PathStep objects.
    """
    if src_cui == tgt_cui:
        return []

    raw_path: List[str] = []
    # 1. Try forward directed path on pre-pruned clinical graph
    try:
        raw_path = nx.shortest_path(graph, source=src_cui, target=tgt_cui)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        # 2. Try clinical reachability (undirected)
        try:
            raw_path = nx.shortest_path(graph.to_undirected(), source=src_cui, target=tgt_cui)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

    steps: List[PathStep] = []
    for i in range(len(raw_path) - 1):
        u = raw_path[i]
        v = raw_path[i + 1]
        edge_data = graph.get_edge_data(u, v) or graph.get_edge_data(v, u) or {}
        relation = edge_data.get("label", "associated_with")

        steps.append(
            PathStep(
                from_id=u,
                from_name=cui_to_name.get(u, u),
                relation=str(relation),
                to_id=v,
                to_name=cui_to_name.get(v, v),
            )
        )

    return steps
