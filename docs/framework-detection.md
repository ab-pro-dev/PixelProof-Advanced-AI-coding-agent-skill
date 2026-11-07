# Frontend Framework & Project Detection

PixelProof includes a passive, read-only project inspection engine (`pixelproof inspect --project DIR`, §5.2, §10). It evaluates target codebases before any code is written or modified.

## What `inspect` Detects Today

1. **Framework Clues:**
   - Detects frameworks from `package.json` dependencies: React, Next.js, Vue, Nuxt, Svelte/SvelteKit, Angular, Astro, Vite, etc.
   - Detects `Plain HTML/CSS/JS` when `index.html` is present in root without `package.json`.
   - Reports uncertainty if no known framework signature is found.

2. **Package Manager:**
   - Identifies package managers from lockfiles: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn), `bun.lockb` (bun).

3. **Scripts & Build Commands:**
   - Reads available npm scripts (`dev`, `build`, `start`, `test`) from `package.json` to inform the agent how the project is run.

4. **Styling Systems:**
   - Inspects dependencies for styling libraries: Tailwind CSS, Sass, Less, Styled Components, Emotion, Bootstrap, Vanilla Extract.

5. **Fonts & Assets:**
   - Counts existing font files (`.woff`, `.woff2`, `.ttf`, `.otf`) and image files (`.png`, `.jpg`, `.svg`).
   - Identifies asset directories (`public/`, `assets/`, `static/`).

6. **Git Working Tree Status:**
   - Verifies whether the target directory is inside a Git repository.
   - Detects uncommitted user modifications to preserve existing work (§17).

## What is NOT BUILT YET

- **Automated Route Tree Detection:** Routing conventions vary widely across frameworks; route discovery is NOT BUILT YET (reports uncertainty in `inspect` output).
- **Design Token Extraction:** Automatic extraction of color variables, font families, and spacing tokens is NOT BUILT YET.
- **Interactive Framework Scaffolding:** NOT BUILT YET.
