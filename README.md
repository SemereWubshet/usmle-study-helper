<p align="center">
  <a href="https://usmle.semere.dev">
    <img src="src/frontend/public/usmle.svg" width="72" height="72" alt="USMLE Study Helper Logo" />
  </a>
</p>

<h1 align="center">USMLE Study Helper</h1>

<p align="center">
  <strong>A high-yield, privacy-first USMLE study engine.</strong><br>
  Modern hosted web dashboard with a local-first, zero-cloud desktop backend.
</p>

<p align="center">
  <a href="https://usmle.semere.dev"><img src="https://img.shields.io/badge/Web%20App-usmle.semere.dev-6366f1?style=for-the-badge" alt="Live Site" /></a>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Architecture-Local--First-emerald?style=for-the-badge" alt="Local First" />
  <img src="https://img.shields.io/badge/OS-Windows%20%7C%20Linux-orange?style=for-the-badge" alt="Platforms" />
</p>

---

## 💡 Overview & Philosophy

**USMLE Study Helper** is built specifically for medical students who want a fast, focused question review environment with **100% data ownership**:

* **Hosted Web UI ([usmle.semere.dev](https://usmle.semere.dev)):** Always up-to-date, modern React interface with dark mode, strike-through options, block timers, and high-yield analytics.
* **Portable Desktop Engine:** Runs quietly on your local computer via a standalone executable. Your study history, performance metrics, and question attempts **never leave your laptop**.
* **Zero Telemetry / Zero Cloud Storage:** You own your SQLite database in a simple portable folder. Backing up your entire study history is as easy as copying one folder to a USB drive.
* **MedSearch (Multi-Source Medical Reference):** Instant, embedded clinical search drawer during review sessions with 4 integrated clinical providers:
  * **openFDA:** Official FDA drug labeling, black box warnings, clinical pharmacology, indications, and direct DailyMed package insert links.
  * **StatPearls:** Peer-reviewed clinical review articles covering pathophysiology, presentation, and high-yield USMLE management.
  * **MedlinePlus:** Consumer-friendly disease summaries, symptoms, causes, and treatments from the National Institutes of Health.
  * **RxNorm:** Normalized clinical drug concepts, generic formulations, strengths, and branded equivalents from the National Library of Medicine.
* **MedGraph (Clinical Knowledge Constellation):** An interactive, dynamic pathophysiology visualizer that traces reasoning pathways from patient vignette clues to candidate diagnoses:
  * **DR.KNOWS Biomedical Ontology:** Grounded in a high-yield pruned knowledge graph linking UMLS / SNOMED CT clinical concepts with precise medical relations (`causes`, `manifestation of`, `associated with`, `treats`).
  * **Bidirectional Pathfinding:** Fast bidirectional Dijkstra algorithms that discover multi-hop causal chains connecting patient findings to target conditions.
  * **Interactive Context Halos:** Surrounding differential nodes that students can click to add as additional findings or explore connected pathologies.
* **Engine Version Intelligence:** An unobtrusive, non-blocking notification in the web app that notifies students when a newer local engine release is available on GitHub.

---

## 🔒 100% Local AI & API Key Privacy

For students using AI features (such as clinical clue extraction via OpenRouter) or pathophysiological knowledge graph convergence:

* **Your API Key Never Leaves Your Computer:** We do not operate intermediate proxy servers or telemetry databases. Requests to OpenRouter are dispatched directly from your local desktop engine (`127.0.0.1`) to the AI provider.
* **Zero-Touch Local File Configuration:** You do not need to enter your API key into a website form if you prefer not to. You can simply create a file named `api_key.txt` inside your `USMLEStudyHelper` folder containing your key (or set `OPENROUTER_API_KEY=sk-or-...`). The desktop engine automatically loads it on launch.
* **Source & Repo Safety:** `api_key.txt` and `.env` files are permanently git-ignored by default to prevent accidental commits or credential leaks.

---

## 🏛️ Architecture: The Hybrid Model

```
+-------------------------------------------------------------+
|                      User's Web Browser                     |
|                                                             |
|  1. Opens: https://usmle.semere.dev (Hosted on Vercel)      |
|  2. UI loads into browser memory                            |
|                                                             |
|  3. Secure Loopback REST Calls (TLS):                       |
|     Fetch -> https://usmle-local-engine.semere.dev:8000/api | 
+------------------------------+------------------------------+
                               |
                               | (HTTPS loopback to localhost)
                               v
+-------------------------------------------------------------+
|                     User's Local Computer                   |
|                                                             |
|  USMLEStudyHelper/ (Portable Directory)                     |
|  ├── USMLE-Helper.exe       # Standalone FastAPI Engine     |
|  ├── certs/                 # Loopback SSL certificates     |
|  ├── datasets/              # USMLE Step 1 & Step 2 Banks   |
|  ├── graphdata/             # DRKnows Knowledge Graph       |
|  ├── api_key.txt            # (Optional) Local API key      |
|  └── profile/               # stats.db (Personal progress)  |
+-------------------------------------------------------------+
```

### Why this design?
1. **Instant UI Updates:** We can polish the design, add keyboard shortcuts, or add new charts on Vercel without requiring students to reinstall desktop apps.
2. **Medical Student Privacy:** No account creation required. No cloud database storing your weak subjects or scores.
3. **Offline Readiness:** The engine and datasets live entirely on your machine.

---

## 🚀 Quick Start for Students

### 1. Download the Engine
Grab the latest release for your operating system from [Releases](https://github.com/SemereWubshet/usmle-study-helper/releases):
* **Windows:** `USMLEStudyHelper-Windows.zip`
* **Linux:** `USMLEStudyHelper-Linux.tar.gz`

### 2. Extract & Run
1. Unzip the folder anywhere you like (e.g. `Desktop`, `Documents`, or `C:\Users\<Name>\USMLEStudyHelper`).
2. *(Optional)* Paste your OpenRouter key into an `api_key.txt` file in that folder if using AI graph features.
3. Double-click **`USMLE-Helper.exe`** (or `./USMLE-Helper` on Linux).
4. The engine will initialize your local database and automatically open your default browser to **[usmle.semere.dev](https://usmle.semere.dev)**.
5. Start studying!

> **Note:** To back up your study data, simply copy the `profile/` folder inside your `USMLEStudyHelper` directory.

---

## 🛠️ Developer Setup & Local Development

### Prerequisites
* **Node.js:** v18+
* **Python:** v3.10+
* **Package Managers:** `npm` and `pip` (or `uv`)

### 1. Clone Repository
```bash
git clone https://github.com/SemereWubshet/usmle-study-helper.git
cd usmle-study-helper
```

### 2. Backend Setup
```bash
cd src/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic pyinstaller networkx httpx
```

### 3. Frontend Setup
In a separate terminal:
```bash
cd src/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
* Visit `http://localhost:5173` to test locally. The Vite dev server proxies requests to `127.0.0.1:8000`.

---

## 📦 Building Standalone Releases

Automated releases for Windows and Linux are compiled and packaged on every tagged release (`v*`) via GitHub Actions and published directly to [GitHub Releases](https://github.com/SemereWubshet/usmle-study-helper/releases).

---

## 🛡️ Security & Browser Sandboxing

Connecting a remote HTTPS website (`https://usmle.semere.dev`) to a local backend (`127.0.0.1`) requires strict compliance with modern browser security (Mixed Content and Private Network Access):

* **Loopback Subdomain:** `usmle-local-engine.semere.dev` resolves to `127.0.0.1`.
* **Universal TLS:** Uvicorn is configured with trusted Let's Encrypt certificates bundled with the release package, enabling HTTPS-to-HTTPS loopback with zero security warnings.
* **CORS Protection:** The FastAPI engine strictly accepts requests originating from `usmle.semere.dev` and local development ports.

---

## 📚 Acknowledgments & Citations

* **DR.KNOWS:** Medical knowledge graph ontologies, vocabularies, and clinical relationship networks adapted from the [DR.KNOWS](https://github.com/drknows/drknows) biomedical project.
* **National Library of Medicine & openFDA:** Sourced clinical drug labels, RxNorm concepts, and MedlinePlus topics.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
