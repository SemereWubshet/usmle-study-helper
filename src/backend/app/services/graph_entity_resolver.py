import re
from typing import List, Tuple, Optional, Dict

# Normalized stop-words or generic wrappers in clinical queries
_STRIP_RE = re.compile(r"^(?:complaining of|history of|finding of|signs? of|symptoms? of)\s+", re.IGNORECASE)


def resolve_clinical_concept(
    query: str,
    active_name_to_cui: Dict[str, str],
    cui_to_name: Dict[str, str],
    top_k: int = 3,
) -> List[Tuple[str, str]]:
    """
    Resolves a clinical string into valid graph concepts (cui, canonical_name).
    Tries exact match first, then stripped query, then substring search.
    """
    clean_q = query.lower().strip()
    clean_q = _STRIP_RE.sub("", clean_q).strip()

    if not clean_q:
        return []

    results: List[Tuple[str, str]] = []
    seen_cuis = set()

    # 1. Exact match
    if clean_q in active_name_to_cui:
        cui = active_name_to_cui[clean_q]
        name = cui_to_name.get(cui, clean_q)
        results.append((cui, name))
        seen_cuis.add(cui)

    # 2. Substring search if not enough matches
    if len(results) < top_k:
        for term, cui in active_name_to_cui.items():
            if clean_q in term and cui not in seen_cuis:
                name = cui_to_name.get(cui, term)
                results.append((cui, name))
                seen_cuis.add(cui)
                if len(results) >= top_k:
                    break

    # 3. Reverse token match (e.g. "chest pain" -> terms starting with "pain, chest")
    if len(results) < top_k:
        tokens = [t for t in clean_q.split() if len(t) > 2]
        if len(tokens) >= 2:
            rev_q = f"{tokens[-1]}, {tokens[0]}"
            for term, cui in active_name_to_cui.items():
                if rev_q in term and cui not in seen_cuis:
                    name = cui_to_name.get(cui, term)
                    results.append((cui, name))
                    seen_cuis.add(cui)
                    if len(results) >= top_k:
                        break

    return results
