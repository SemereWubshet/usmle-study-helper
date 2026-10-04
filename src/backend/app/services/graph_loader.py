import pickle
import logging
import networkx as nx
from typing import Tuple, Dict, Any, Optional
from threading import Lock
from app.core.config import USMLE_CLINICAL_GRAPH_PATH

logger = logging.getLogger(__name__)

_graph_lock = Lock()
_clinical_graph: Optional[nx.DiGraph] = None
_cui_to_name: Optional[Dict[str, str]] = None
_active_name_to_cui: Optional[Dict[str, str]] = None


def get_graph_and_vocab() -> Tuple[nx.DiGraph, Dict[str, str], Dict[str, str]]:
    """
    Thread-safe singleton for the pre-pruned USMLE clinical graph package.
    Returns:
        (graph, cui_to_name, active_name_to_cui)
    """
    global _clinical_graph, _cui_to_name, _active_name_to_cui

    if _clinical_graph is not None and _cui_to_name is not None and _active_name_to_cui is not None:
        return _clinical_graph, _cui_to_name, _active_name_to_cui

    with _graph_lock:
        if _clinical_graph is not None and _cui_to_name is not None and _active_name_to_cui is not None:
            return _clinical_graph, _cui_to_name, _active_name_to_cui

        logger.info("Loading unified pruned clinical graph from %s...", USMLE_CLINICAL_GRAPH_PATH)
        if not USMLE_CLINICAL_GRAPH_PATH.exists():
            raise FileNotFoundError(f"Pruned clinical graph package not found at {USMLE_CLINICAL_GRAPH_PATH}")

        with open(USMLE_CLINICAL_GRAPH_PATH, "rb") as f:
            package = pickle.load(f)

        _clinical_graph = package["graph"]
        _cui_to_name = package["cui_to_name"]
        _active_name_to_cui = package["name_to_cui"]

        logger.info(
            "Unified Clinical Graph ready: %d nodes, %d edges, %d indexed search terms",
            _clinical_graph.number_of_nodes(),
            _clinical_graph.number_of_edges(),
            len(_active_name_to_cui),
        )

        return _clinical_graph, _cui_to_name, _active_name_to_cui
