import html
import json
import urllib.parse
import urllib.request
from functools import lru_cache
from typing import Any, Dict, List
from app.core.config import DEFAULT_HTTP_HEADERS

RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST"


@lru_cache(maxsize=256)
def fetch_rxnorm_drug(term: str) -> List[Dict[str, Any]]:
    """
    Queries NLM RxNorm for normalized clinical drug concepts,
    active ingredients, brand/generic synonyms, and available dosage strengths.
    """
    clean_term = term.strip()
    encoded = urllib.parse.quote(clean_term)
    url = f"{RXNORM_BASE_URL}/drugs.json?name={encoded}"

    req = urllib.request.Request(
        url,
        headers=DEFAULT_HTTP_HEADERS
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[RxNorm] Error fetching '{term}': {e}")
        return []

    concept_groups = data.get("drugGroup", {}).get("conceptGroup", [])
    
    # Collect generic clinical drugs (SCD) and branded clinical drugs (SBD)
    generics = []
    brands = []
    alt_titles = set()
    primary_rxcui = None

    for group in concept_groups:
        tty = group.get("tty")
        for prop in group.get("conceptProperties", []):
            if not primary_rxcui and prop.get("rxcui"):
                primary_rxcui = prop.get("rxcui")
            name = prop.get("name")
            synonym = prop.get("synonym")
            if synonym:
                alt_titles.add(synonym)
            if tty == "SCD":
                generics.append(name)
            elif tty == "SBD":
                brands.append(name)

    if not generics and not brands and not alt_titles:
        return []

    sections = []
    if generics:
        list_items = "".join(f"<li>{html.escape(item)}</li>" for item in generics[:8])
        clean_generics = f"<ul class='list-disc pl-4 space-y-1 my-1'>{list_items}</ul>"
        sections.append({
            "heading": "Generic Clinical Formulations & Strengths",
            "body": clean_generics,
            "clean_text": "\n• " + "\n• ".join(generics[:8]),
        })
    if brands:
        list_items = "".join(f"<li>{html.escape(item)}</li>" for item in brands[:8])
        clean_brands = f"<ul class='list-disc pl-4 space-y-1 my-1'>{list_items}</ul>"
        sections.append({
            "heading": "Branded Equivalents",
            "body": clean_brands,
            "clean_text": "\n• " + "\n• ".join(brands[:8]),
        })

    summary = f"Normalized NLM RxNorm concepts for '{clean_term.title()}'. Found {len(generics)} generic formulations and {len(brands)} branded drug equivalents."

    target_url = (
        f"https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm={primary_rxcui}"
        if primary_rxcui
        else f"https://mor.nlm.nih.gov/RxNav/search?searchBy=String&searchTerm={encoded}"
    )

    return [{
        "title": clean_term.title(),
        "url": target_url,
        "summary": summary,
        "alt_titles": list(alt_titles)[:5],
        "sections": sections,
        "source": "rxnorm",
        "source_label": "NLM RxNorm",
        "badge": "Clinical Drug Standard",
    }]

