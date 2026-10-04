#!/usr/bin/env python3
"""
Prunes raw DRKnows knowledge graph and CUI vocabulary into a single, compact,
high-yield USMLE clinical knowledge graph package.
"""

import os
import sys
import pickle
import pandas as pd
import networkx as nx
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "drknows_data"
OUTPUT_DIR = BASE_DIR.parent / "src" / "backend" / "graphdata"

RAW_GRAPH_PATH = RAW_DATA_DIR / "drknows_graph.pkl"
RAW_VOCAB_PATH = RAW_DATA_DIR / "cui_vocab.pkl"
RELATIONS_PATH = RAW_DATA_DIR / "relations.csv"
OUTPUT_PACKAGE_PATH = OUTPUT_DIR / "usmle_clinical_graph.pkl"

# Filtering Constraints
BANNED_RELATIONS = {
    'temporal context of',
    'has temporal context',
    'has subject relationship context',
    'subject relationship context of',
    'associated finding of',
}

BANNED_NODE_SUBSTRINGS = {
    'body system',
    'clinical investigation',
    'laboratory procedure',
    'evaluation procedure',
    'procedure by site',
    'entire body',
    'general finding',
    'context-dependent',
    'qualifier value',
}

GENERIC_ROOT_NAMES = {
    'procedure (procedure)',
    'functional observable',
    'clinical investigation',
    'laboratory procedure',
    'evaluation procedure',
    'observable entity',
    'finding by site',
    'regime/therapy',
    'action (qualifier value)',
    'physical entity',
    'organism attribute',
}

def main():
    print("=" * 60)
    print("🚀 USMLE Clinical Graph Pruning & Packaging")
    print("=" * 60)

    # 1. Load Relations
    print(f"1. Loading curated relations from {RELATIONS_PATH.name}...")
    df_relations = pd.read_csv(RELATIONS_PATH)
    all_relations = set(df_relations['Relation'].astype(str))
    allowed_relations = all_relations - BANNED_RELATIONS
    print(f"   Total relations: {len(all_relations)} -> Approved: {len(allowed_relations)}")

    # 2. Load CUI Vocabulary
    print(f"\n2. Loading CUI vocabulary from {RAW_VOCAB_PATH.name}...")
    with open(RAW_VOCAB_PATH, "rb") as f:
        cui_vocab = pickle.load(f)
    print(f"   Raw CUI vocabulary entries: {len(cui_vocab):,}")

    # Build primary names map
    cui_to_name = {}
    cui_to_synonyms = {}
    for cui, entries in cui_vocab.items():
        primary_name = ""
        synonyms = set()
        if isinstance(entries, list) and len(entries) > 0:
            first = entries[0]
            primary_name = first[1].strip() if len(first) > 1 else str(first).strip()
            for item in entries:
                if len(item) > 1 and item[1].strip():
                    synonyms.add(item[1].strip())
        elif isinstance(entries, str):
            primary_name = entries.strip()
            synonyms.add(primary_name)

        if primary_name:
            cui_to_name[cui] = primary_name
            cui_to_synonyms[cui] = synonyms

    # 3. Load Raw DRKnows Graph
    print(f"\n3. Loading raw DRKnows graph from {RAW_GRAPH_PATH.name}...")
    with open(RAW_GRAPH_PATH, "rb") as f:
        raw_G = pickle.load(f)
    print(f"   Initial graph: {raw_G.number_of_nodes():,} nodes, {raw_G.number_of_edges():,} edges")

    # 4. Prune Edges (Keep only approved relations)
    print("\n4. Filtering edges against approved clinical relations...")
    edges_to_remove = []
    for u, v, data in raw_G.edges(data=True):
        rel = str(data.get('label', ''))
        if rel not in allowed_relations:
            edges_to_remove.append((u, v))

    raw_G.remove_edges_from(edges_to_remove)
    print(f"   Removed {len(edges_to_remove):,} non-clinical/banned edges.")
    print(f"   Edges remaining: {raw_G.number_of_edges():,}")

    # 5. Prune Nodes (Generic roots, banned substrings)
    print("\n5. Identifying and pruning generic taxonomy nodes...")
    nodes_to_remove = set()
    for node in raw_G.nodes():
        name = cui_to_name.get(node, "").lower().strip()
        if not name:
            nodes_to_remove.add(node)
            continue
        if name in GENERIC_ROOT_NAMES:
            nodes_to_remove.add(node)
            continue
        for banned_sub in BANNED_NODE_SUBSTRINGS:
            if banned_sub in name:
                nodes_to_remove.add(node)
                break

    raw_G.remove_nodes_from(nodes_to_remove)
    print(f"   Removed {len(nodes_to_remove):,} generic/taxonomy nodes.")
    print(f"   Nodes remaining: {raw_G.number_of_nodes():,}")

    # 6. Remove Isolated Nodes (degree == 0)
    print("\n6. Removing disconnected singletons...")
    isolates = list(nx.isolates(raw_G))
    raw_G.remove_nodes_from(isolates)
    print(f"   Removed {len(isolates):,} isolated leaves.")
    print(f"   Active clinical graph: {raw_G.number_of_nodes():,} nodes, {raw_G.number_of_edges():,} edges")

    # 7. Embed Clean Attributes & Search Index
    print("\n7. Embedding canonical names and building active search index...")
    active_nodes = set(raw_G.nodes())
    clean_cui_to_name = {}
    clean_name_to_cui = {}

    for cui in active_nodes:
        name = cui_to_name.get(cui, cui)
        raw_G.nodes[cui]['name'] = name
        clean_cui_to_name[cui] = name

        # Lowercase primary
        clean_name_to_cui[name.lower().strip()] = cui

        # Synonyms
        for syn in cui_to_synonyms.get(cui, []):
            syn_lower = syn.lower().strip()
            if syn_lower and syn_lower not in clean_name_to_cui:
                clean_name_to_cui[syn_lower] = cui

    print(f"   Indexed {len(clean_name_to_cui):,} clinical search terms.")

    # 8. Package & Save Unified Asset
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    package = {
        "graph": raw_G,
        "cui_to_name": clean_cui_to_name,
        "name_to_cui": clean_name_to_cui,
        "version": "1.0-pruned",
        "stats": {
            "node_count": raw_G.number_of_nodes(),
            "edge_count": raw_G.number_of_edges(),
            "search_terms": len(clean_name_to_cui),
        }
    }

    print(f"\n8. Saving unified package to {OUTPUT_PACKAGE_PATH}...")
    with open(OUTPUT_PACKAGE_PATH, "wb") as f:
        pickle.dump(package, f, protocol=pickle.HIGHEST_PROTOCOL)

    out_size_mb = os.path.getsize(OUTPUT_PACKAGE_PATH) / (1024 * 1024)
    print(f"✅ Success! Saved {OUTPUT_PACKAGE_PATH.name} ({out_size_mb:.2f} MB)")
    print("=" * 60)

if __name__ == "__main__":
    main()
