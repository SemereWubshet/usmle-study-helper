import json
import urllib.parse
import urllib.request
from functools import lru_cache
from typing import Any, Dict, List
from app.core.config import DEFAULT_HTTP_HEADERS

OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"


def _clean_fda_text(val: Any) -> str:
    """Extracts and flattens list or string text from openFDA responses."""
    if isinstance(val, list):
        return "\n\n".join(str(item).strip() for item in val if str(item).strip())
    return str(val).strip() if val else ""


@lru_cache(maxsize=256)
def fetch_openfda_drug(term: str) -> List[Dict[str, Any]]:
    """
    Queries openFDA for official drug labeling, black box warnings,
    indications, contraindications, and adverse reactions.
    """
    clean_term = term.strip().lower()
    # Search both generic name and brand name
    query_term = urllib.parse.quote(clean_term)
    search_query = f"(openfda.generic_name:{query_term}+openfda.brand_name:{query_term})"
    url = f"{OPENFDA_LABEL_URL}?search={search_query}&limit=2"

    req = urllib.request.Request(
        url,
        headers=DEFAULT_HTTP_HEADERS
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        # Fallback to general search if openfda fields match fails
        fallback_url = f"{OPENFDA_LABEL_URL}?search={query_term}&limit=1"
        try:
            req_fallback = urllib.request.Request(
                fallback_url,
                headers=DEFAULT_HTTP_HEADERS
            )
            with urllib.request.urlopen(req_fallback, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception:
            return []

    results = data.get("results", [])
    formatted_entries = []

    for item in results:
        openfda = item.get("openfda", {})
        brand_names = openfda.get("brand_name", [])
        generic_names = openfda.get("generic_name", [])

        title = (
            generic_names[0].title() if generic_names else 
            (brand_names[0].title() if brand_names else clean_term.title())
        )
        
        # Check for Warning (High Yield for USMLE Pharmacology!)
        boxed_warning = _clean_fda_text(item.get("boxed_warning"))
        indications = _clean_fda_text(item.get("indications_and_usage"))
        contraindications = _clean_fda_text(item.get("contraindications"))
        adverse_reactions = _clean_fda_text(item.get("adverse_reactions"))
        mechanism = _clean_fda_text(item.get("mechanism_of_action") or item.get("clinical_pharmacology"))

        summary = indications[:350] + "..." if len(indications) > 350 else (indications or "Official FDA prescribing label.")

        sections = []
        if boxed_warning:
            sections.append({
                "heading": "⚠️ Black Boxed Warning (High Yield)",
                "body": boxed_warning,
                "clean_text": boxed_warning,
            })
        if indications:
            sections.append({
                "heading": "Indications & Usage",
                "body": indications,
                "clean_text": indications,
            })
        if contraindications:
            sections.append({
                "heading": "Contraindications",
                "body": contraindications,
                "clean_text": contraindications,
            })
        if adverse_reactions:
            sections.append({
                "heading": "Adverse Reactions & Side Effects",
                "body": adverse_reactions,
                "clean_text": adverse_reactions,
            })
        if mechanism:
            sections.append({
                "heading": "Mechanism of Action & Clinical Pharmacology",
                "body": mechanism,
                "clean_text": mechanism,
            })

        alt_titles = [b.title() for b in brand_names if b.title() != title][:4]

        # Prioritize exact package insert on DailyMed via SPL Set ID if provided in openfda metadata
        spl_set_ids = openfda.get("spl_set_id", [])
        if spl_set_ids and isinstance(spl_set_ids, list):
            doc_url = f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={spl_set_ids[0]}"
        elif item.get("id"):
            doc_url = f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={item.get('id')}"
        else:
            doc_url = f"https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query={urllib.parse.quote(clean_term)}"

        formatted_entries.append({
            "title": title,
            "url": doc_url,
            "summary": summary,
            "alt_titles": alt_titles,
            "sections": sections,
            "source": "openfda",
            "source_label": "FDA Drug Label",
            "badge": "Boxed Warning" if boxed_warning else "FDA Approved",
        })

    return formatted_entries

