import html
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from functools import lru_cache
from app.core.config import DEFAULT_HTTP_HEADERS

MEDLINEPLUS_API_URL = "https://wsearch.nlm.nih.gov/ws/query"



def clean_xml_text(raw_text: str | None) -> str:
    """Removes HTML/XML tags and normalizes whitespace."""
    if not raw_text:
        return ""
    unescaped = html.unescape(raw_text)
    no_tags = re.sub(r"<[^>]+>", "", unescaped)
    return re.sub(r"\s+", " ", no_tags).strip()


def parse_summary_sections(raw_html: str) -> list[dict]:
    """Splits full-summary by <h3> tags so questions and answers are structured."""
    if not raw_html or "<h3>" not in raw_html:
        return []
    chunks = re.split(r"(<h3>.*?</h3>)", raw_html, flags=re.DOTALL)
    sections = []
    for i in range(1, len(chunks), 2):
        heading = re.sub(r"</?h3>", "", chunks[i]).strip()
        body = chunks[i + 1].strip() if i + 1 < len(chunks) else ""
        sections.append({
            "heading": heading,
            "body": body,
            "clean_text": clean_xml_text(body),
        })
    return sections


@lru_cache(maxsize=512)
def fetch_medlineplus_topic(term: str) -> list[dict]:
    """Queries MedlinePlus for topic details with LRU caching."""
    params = {
        "db": "healthTopics",
        "term": term.strip(),
        "retmax": "1",
        "rettype": "topic",
    }
    url = f"{MEDLINEPLUS_API_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers=DEFAULT_HTTP_HEADERS,
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            raw_xml = resp.read()
    except Exception as e:
        print(f"[MedlinePlus] Error fetching '{term}': {e}")
        return []

    try:
        root = ET.fromstring(raw_xml)
    except Exception as e:
        print(f"[MedlinePlus] Error parsing XML for '{term}': {e}")
        return []

    results = []
    for doc in root.findall(".//document"):
        item = {
            "title": "",
            "summary": "",
            "url": doc.get("url", ""),
            "alt_titles": [],
            "sections": [],
            "source": "medlineplus",
            "source_label": "NIH MedlinePlus",
            "badge": "NIH Overview",
        }
        ht = doc.find(".//health-topic")
        if ht is not None:
            item["title"] = ht.get("title", "")
            item["url"] = ht.get("url", item["url"])
            also_called = ht.find("also-called")
            if also_called is not None and also_called.text:
                item["alt_titles"].append(clean_xml_text(also_called.text))

            fs = ht.find("full-summary")
            if fs is not None and fs.text:
                item["sections"] = parse_summary_sections(fs.text)
                item["summary"] = clean_xml_text(fs.text)

        # Fallback to <content> tags if health-topic attributes were absent
        for content in doc.findall("content"):
            name = content.get("name")
            text = content.text or ""
            if name == "title" and not item["title"]:
                item["title"] = clean_xml_text(text)
            elif name in ("FullSummary", "snippet") and not item["summary"]:
                item["summary"] = clean_xml_text(text)
                if not item["sections"] and "<h3>" in text:
                    item["sections"] = parse_summary_sections(text)
            elif name == "altTitle":
                cleaned_alt = clean_xml_text(text)
                if cleaned_alt and cleaned_alt not in item["alt_titles"]:
                    item["alt_titles"].append(cleaned_alt)

        if item["title"]:
            results.append(item)
    return results

