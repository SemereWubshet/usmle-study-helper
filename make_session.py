"""Convert a Cookie-Editor JSON export into a notebooklm storage_state.json.

Manual auth path when `notebooklm login` won't cooperate:

  1. In Brave, install the "Cookie-Editor" extension.
  2. Go to https://notebooklm.google.com  (make sure you're logged in).
  3. Cookie-Editor -> Export -> "Export as JSON" (copies to clipboard).
  4. Paste it into a file, e.g. cookies.json (in this folder).
  5. Run:  python3 make_session.py cookies.json
     -> writes .notebooklm_session/storage_state.json

Stdlib only — no deps, runs on any Python 3.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

OUT = Path(".notebooklm_session/storage_state.json")

# We only need Google auth cookies. Keep google.com + notebooklm.google.com.
KEEP_DOMAIN_SUFFIXES = ("google.com",)
REQUIRED = {"SID", "__Secure-1PSIDTS"}


def _samesite(v) -> str:
    m = {"no_restriction": "None", "lax": "Lax", "strict": "Strict"}
    return m.get(str(v).lower(), "Lax")


def convert(raw: list[dict]) -> dict:
    cookies = []
    for c in raw:
        domain = c.get("domain", "")
        if not domain.lstrip(".").endswith(KEEP_DOMAIN_SUFFIXES):
            continue
        cookie = {
            "name": c["name"],
            "value": c["value"],
            "domain": domain,
            "path": c.get("path", "/"),
            "httpOnly": bool(c.get("httpOnly", False)),
            "secure": bool(c.get("secure", True)),
            "sameSite": _samesite(c.get("sameSite", "lax")),
        }
        exp = c.get("expirationDate") or c.get("expires")
        if exp:
            cookie["expires"] = float(exp)
        cookies.append(cookie)

    # Cookie-Editor exports sometimes omit the legacy `SID` cookie while keeping
    # its modern Secure twin `__Secure-1PSID`, which carries the same value.
    # Synthesize `SID` from it so the (Secure-cookie-based) session still works
    # and passes the library's minimum-cookie check.
    by_name = {c["name"]: c for c in cookies}
    if "SID" not in by_name and "__Secure-1PSID" in by_name:
        twin = by_name["__Secure-1PSID"]
        cookies.append({
            "name": "SID",
            "value": twin["value"],
            "domain": ".google.com",
            "path": "/",
            "httpOnly": False,
            "secure": False,
            "sameSite": "Lax",
        })
        print("note: synthesized 'SID' from '__Secure-1PSID' (same value).")

    return {"cookies": cookies, "origins": []}


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python3 make_session.py <cookie-editor-export.json>")
    raw = json.loads(Path(sys.argv[1]).read_text())
    if isinstance(raw, dict) and "cookies" in raw:
        raw = raw["cookies"]  # some exports wrap in an object
    state = convert(raw)

    names = {c["name"] for c in state["cookies"]}
    missing = REQUIRED - names
    if missing:
        sys.exit(
            f"ERROR: missing required cookie(s): {', '.join(sorted(missing))}.\n"
            "Make sure you exported cookies while on notebooklm.google.com and "
            "logged in."
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(state, indent=2))
    print(f"Wrote {OUT} with {len(state['cookies'])} cookies.")
    print("Required cookies present:", ", ".join(sorted(REQUIRED)))


if __name__ == "__main__":
    main()
