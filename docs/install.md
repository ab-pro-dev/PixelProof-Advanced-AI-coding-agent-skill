# PixelProof Installation Guide

This guide details the step-by-step installation instructions for PixelProof across supported platforms (spec §19 Phase 4).

---

## 1. Prerequisites

Before installing PixelProof, ensure the following tools are installed on your host machine:

- **Node.js**: Version 20 or later (Node.js 20 LTS recommended).
- **Python**: Version 3.12 or later (spec §2).
- **Git**: Version 2.0 or later.

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd PixelProof
```

### Step 2: Install Node.js Dependencies

Install required dependencies defined in `package.json`:

```bash
npm install
```

### Step 3: Install Playwright Chromium

Install the headless Chromium browser used for browser screenshot capture:

```bash
npx playwright install chromium
```

### Step 4: Build the TypeScript CLI

Compile TypeScript source files into executable JavaScript under `dist/`:

```bash
npm run build
```

### Step 5: Configure Python Environment

Create and activate an isolated Python virtual environment:

- **On Linux / macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

- **On Windows:**
  ```cmd
  python -m venv .venv
  .venv\Scripts\activate
  ```

### Step 6: Install Python Package and Dependencies

Install the `pixelproof_image` package and required image processing dependencies (Pillow, NumPy, pytest) in editable mode:

```bash
pip install -e ".[dev]"
```

---

## 3. Operating System Compatibility & Testing Status

- **Linux (x86_64 Ubuntu / Debian):** Fully verified and tested in continuous integration and local development.
- **macOS:** UNTESTED on macOS.
- **Windows:** UNTESTED on Windows.

---

## 4. Verification

After completing the installation steps, verify your runtime environment and dependencies:

run `pixelproof doctor`
