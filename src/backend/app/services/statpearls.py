import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from functools import lru_cache
from typing import Any, Dict, List
from app.core.config import DEFAULT_HTTP_HEADERS

NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def _clean_text(raw_text: str | None) -> str:
    if not raw_text:
        return ""
    unescaped = html.unescape(raw_text)
    no_tags = re.sub(r"<[^>]+>", "", unescaped)
    return re.sub(r"\s+", " ", no_tags).strip()


@lru_cache(maxsize=256)
def fetch_statpearls_topic(term: str) -> List[Dict[str, Any]]:
    """
    Queries NCBI Bookshelf for StatPearls peer-reviewed clinical review articles.
    Returns structured chapters with pathophysiology, clinical presentation, and management.
    """
    clean_term = term.strip()
    # Search StatPearls book specifically
    query = f"StatPearls[book] AND {clean_term}[title]"
    search_url = f"{NCBI_EUTILS_BASE}/esearch.fcgi?db=books&term={urllib.parse.quote(query)}&retmode=json&retmax=3"

    req = urllib.request.Request(
        search_url,
        headers=DEFAULT_HTTP_HEADERS
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[StatPearls] Search error for '{term}': {e}")
        return []

    id_list = data.get("esearchresult", {}).get("idlist", [])
    if not id_list:
        # Fallback without title restriction
        fallback_query = f"StatPearls[book] AND {clean_term}"
        fallback_url = f"{NCBI_EUTILS_BASE}/esearch.fcgi?db=books&term={urllib.parse.quote(fallback_query)}&retmode=json&retmax=3"
        try:
            req_fb = urllib.request.Request(fallback_url, headers=DEFAULT_HTTP_HEADERS)
            with urllib.request.urlopen(req_fb, timeout=4) as resp:
                fb_data = json.loads(resp.read().decode("utf-8"))
                id_list = fb_data.get("esearchresult", {}).get("idlist", [])
        except Exception:
            return []

    if not id_list:
        return []

    # Fetch summaries for up to 3 matched chapters in a single batch request
    target_ids = id_list[:3]
    joined_ids = ",".join(target_ids)
    sum_url = f"{NCBI_EUTILS_BASE}/esummary.fcgi?db=books&id={joined_ids}&retmode=json"
    try:
        req_sum = urllib.request.Request(sum_url, headers=DEFAULT_HTTP_HEADERS)
        with urllib.request.urlopen(req_sum, timeout=5) as resp:
            sum_data = json.loads(resp.read().decode("utf-8"))
            result_map = sum_data.get("result", {})
    except Exception as e:
        print(f"[StatPearls] Summary error for ids {joined_ids}: {e}")
        return []

    results = []
    for chapter_id in target_ids:
        item = result_map.get(chapter_id, {})
        if not item:
            continue

        title = _clean_text(item.get("title") or clean_term.title())
        chapter_acc = item.get("chapteraccessionid") or item.get("id") or chapter_id
        nbk_id = item.get("bookaccessionid") or "NBK430685"

        url = f"https://www.ncbi.nlm.nih.gov/books/{chapter_acc}/" if str(chapter_acc).startswith("NBK") else f"https://www.ncbi.nlm.nih.gov/books/{nbk_id}/"

        # Fetch snippet text via efetch xml for this chapter
        fetch_url = f"{NCBI_EUTILS_BASE}/efetch.fcgi?db=books&id={chapter_id}&retmode=xml"
        sections = []
        summary_text = ""

        try:
            req_fetch = urllib.request.Request(fetch_url, headers=DEFAULT_HTTP_HEADERS)
            with urllib.request.urlopen(req_fetch, timeout=5) as resp:
                xml_data = resp.read()
                root = ET.fromstring(xml_data)

                # Extract sections with titles
                for sec in root.findall(".//sec"):
                    sec_title_el = sec.find("title")
                    sec_title = _clean_text(sec_title_el.text) if sec_title_el is not None and sec_title_el.text else "Clinical Overview"
                    paragraphs = [_clean_text(p.text) for p in sec.findall(".//p") if p.text]
                    if paragraphs:
                        full_p = "\n\n".join(paragraphs[:3])
                        if not summary_text:
                            summary_text = full_p[:350] + "..." if len(full_p) > 350 else full_p
                        sections.append({
                            "heading": sec_title,
                            "body": full_p,
                            "clean_text": full_p,
                        })
        except Exception as e:
            print(f"[StatPearls] eFetch text error for {chapter_id}: {e}")

        if not summary_text:
            summary_text = f"Comprehensive peer-reviewed StatPearls clinical review chapter on {title} covering etiology, epidemiology, pathophysiology, evaluation, and management."

        results.append({
            "title": title,
            "url": url,
            "summary": summary_text,
            "alt_titles": [f"NCBI Bookshelf: {chapter_acc}"],
            "sections": sections[:4],
            "source": "statpearls",
            "source_label": "NCBI StatPearls",
            "badge": "Peer-Reviewed Clinical Review",
        })

    return results

