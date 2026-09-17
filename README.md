# 🩺 USMLE Study Helper

<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/stethoscope.svg" width="64" height="64" alt="Stethoscope" />
</p>

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
* **MedSearch (NIH Integration):** Query the official U.S. National Library of Medicine (MedlinePlus) directly inside your question review drawer for concise topic summaries, symptoms, causes, and treatments.

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
2. Double-click **`USMLE-Helper.exe`** (or `./USMLE-Helper` on Linux).
3. The engine will initialize your local database and automatically open your default browser to **[usmle.semere.dev](https://usmle.semere.dev)**.
4. Start studying!

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
pip install fastapi uvicorn pydantic pyinstaller

# Run the local engine
python launcher.py
```
* Interactive API docs will be available at: `https://usmle-local-engine.semere.dev:8000/docs` (or `http://127.0.0.1:8000/docs`).

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

### Manual Local Build (Optional)
If you want to build the executable locally on your own machine instead of using GitHub Actions:
```bash
cd src/backend
pyinstaller usmle_engine.spec --clean --noconfirm
```
PyInstaller will output the executable bundle into a local `src/backend/dist/USMLEStudyHelper/` directory on your computer (this folder is ignored by git to keep repository history clean).

---

## 🛡️ Security & Browser Sandboxing

Connecting a remote HTTPS website (`https://usmle.semere.dev`) to a local backend (`127.0.0.1`) requires strict compliance with modern browser security (Mixed Content and Private Network Access):

* **Loopback Subdomain:** `usmle-local-engine.semere.dev` resolves to `127.0.0.1`.
* **Universal TLS:** Uvicorn is configured with trusted Let's Encrypt certificates bundled with the release package, enabling HTTPS-to-HTTPS loopback with zero security warnings.
* **CORS Protection:** The FastAPI engine strictly accepts requests originating from `usmle.semere.dev` and local development ports.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
