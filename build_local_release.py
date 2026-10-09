#!/usr/bin/env python3
"""
USMLE Study Helper - Local Release Build & Packaging Script
===========================================================
This script mirrors the GitHub Actions release workflow locally:
1. Runs PyInstaller on `src/backend/usmle_engine.spec`.
2. Assembles the clean `package/USMLEStudyHelper` directory.
3. Copies certificates, datasets, and clinical knowledge graph.
4. Generates a template `api_key.txt`.
5. Optionally launches the compiled engine for testing.

Usage:
    python build_local_release.py [--run] [--clean]
    uv run python build_local_release.py [--run]
"""

import sys
import shutil
import subprocess
import argparse
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "src" / "backend"
PACKAGE_DIR = REPO_ROOT / "package"
DIST_APP_DIR = PACKAGE_DIR / "USMLEStudyHelper"


def log(msg: str):
    print(f"\033[1;34m[BUILD]\033[0m {msg}")


def log_success(msg: str):
    print(f"\033[1;32m[SUCCESS]\033[0m {msg}")


def log_warn(msg: str):
    print(f"\033[1;33m[WARN]\033[0m {msg}")


def run_command(cmd, cwd=None):
    log(f"Running: {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=cwd or REPO_ROOT)
    if result.returncode != 0:
        print(f"\033[1;31m[ERROR]\033[0m Command failed with return code {result.returncode}")
        sys.exit(result.returncode)


def main():
    parser = argparse.ArgumentParser(description="Build and package USMLE Study Helper locally.")
    parser.add_argument("--run", action="store_true", help="Launch the packaged engine immediately after build.")
    parser.add_argument("--clean", action="store_true", help="Clean up previous build artifacts before building.")
    args = parser.parse_args()

    # Step 1: Clean if requested
    if args.clean:
        log("Cleaning previous build and dist directories...")
        for p in [BACKEND_DIR / "build", BACKEND_DIR / "dist", PACKAGE_DIR]:
            if p.exists():
                shutil.rmtree(p)

    # Step 2: PyInstaller Build
    log("Building executable with PyInstaller...")
    spec_path = BACKEND_DIR / "usmle_engine.spec"
    
    # Try using uv if available, otherwise fallback to current python interpreter
    pyinstaller_cmd = ["pyinstaller", str(spec_path), "--clean", "--noconfirm"]
    if shutil.which("uv"):
        run_command(["uv", "run", *pyinstaller_cmd], cwd=BACKEND_DIR)
    else:
        run_command([sys.executable, "-m", "PyInstaller", str(spec_path), "--clean", "--noconfirm"], cwd=BACKEND_DIR)

    # Step 3: Assemble Staging Folder
    log("Assembling package directory...")
    certs_target = DIST_APP_DIR / "certs"
    datasets_target = DIST_APP_DIR / "datasets"
    graphdata_target = DIST_APP_DIR / "graphdata"
    profile_target = DIST_APP_DIR / "profile"

    for target in [certs_target, datasets_target, graphdata_target, profile_target]:
        target.mkdir(parents=True, exist_ok=True)

    # Copy PyInstaller binary & runtime files
    built_dist = BACKEND_DIR / "dist" / "USMLEStudyHelper"
    if not built_dist.exists():
        print(f"\033[1;31m[ERROR]\033[0m Expected output at {built_dist} does not exist!")
        sys.exit(1)

    log(f"Copying engine binaries from {built_dist} to {DIST_APP_DIR}...")
    shutil.copytree(built_dist, DIST_APP_DIR, dirs_exist_ok=True)

    # Ensure executable permissions on Linux/macOS
    bin_name = "USMLE-Helper.exe" if sys.platform == "win32" else "USMLE-Helper"
    exe_file = DIST_APP_DIR / bin_name
    if exe_file.exists():
        exe_file.chmod(0o755)

    # Step 4: Copy Assets (certs, datasets, graphdata)
    log("Copying SSL certificates...")
    certs_src = BACKEND_DIR / "certs"
    if certs_src.exists():
        for pem in certs_src.glob("*.pem"):
            shutil.copy2(pem, certs_target)
    else:
        log_warn(f"No certs found at {certs_src}")

    log("Copying question databases...")
    datasets_src = BACKEND_DIR / "datasets"
    if datasets_src.exists():
        for db in datasets_src.glob("*.db"):
            shutil.copy2(db, datasets_target)
    else:
        log_warn(f"No databases found at {datasets_src}")

    log("Copying knowledge graph data...")
    graphdata_src = BACKEND_DIR / "graphdata"
    if graphdata_src.exists():
        for f in graphdata_src.glob("*"):
            if f.is_file():
                shutil.copy2(f, graphdata_target)
    else:
        log_warn(f"No graphdata found at {graphdata_src}")

    # Step 5: Write api_key template if not exists
    api_key_file = DIST_APP_DIR / "api_key.txt"
    if not api_key_file.exists():
        api_key_file.write_text(
            "# (Optional) OpenRouter API Key for USMLE Study Helper AI features\n"
            "# Paste your key below (e.g. sk-or-... or OPENROUTER_API_KEY=sk-or-...):\n"
            "# OPENROUTER_API_KEY=sk-or-v1-...\n",
            encoding="utf-8"
        )

    log_success(f"Release package ready at: {DIST_APP_DIR}")
    print("\nDirectory contents:")
    for item in sorted(DIST_APP_DIR.iterdir()):
        print(f"  ├── {item.name}{'/' if item.is_dir() else ''}")

    # Step 6: Test Run if requested
    if args.run:
        log(f"Launching {exe_file}...")
        try:
            subprocess.run([str(exe_file)], cwd=DIST_APP_DIR)
        except KeyboardInterrupt:
            print("\nShutting down engine...")


if __name__ == "__main__":
    main()

