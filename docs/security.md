# PixelProof Security Requirements

PixelProof operates with minimal necessary permissions and enforces defensive security boundaries across browser automation, file access, and process execution (§13, §17).

## Security Boundaries & Rules

1. **Localhost-Only Navigation (§13):**
   - Playwright capture restricts navigation to local hosts (`localhost`, `127.0.0.1`, `::1`).
   - External URL navigation is rejected by default (`url_not_allowed`), requiring explicit authorization (`allowExternal: true`, AGENT PROPOSAL).
   - Arbitrary schemes (`file://`, `data:`, `javascript:`) are strictly forbidden.

2. **Secret Protection (§13, §17):**
   - Passwords, cookies, API keys, tokens, and authorization headers are never logged or stored in comparison reports or error hints.
   - Diagnostic tools (`pixelproof doctor`) never output environment variables or machine secrets.

3. **Path Validation and Workspace Containment (§17, Decision Q3):**
   - All reference image paths must resolve within the reference manifest directory.
   - Path traversal (`../`) and symbolic links escaping the designated workspace are rejected with `path_escape` or `outside_manifest_directory`.
   - File creation refuses destructive overwrites unless `--overwrite` is explicitly supplied.

4. **`--python` Flag Trust Boundary (AGENT PROPOSAL):**
   - The `--python <cmd>` flag passes an executable path to `execFile`. Users and agents must only pass paths to verified, trusted local Python interpreters.

5. **Browser Launcher Guard (AGENT PROPOSAL):**
   - Test-injection hooks (`setDefaultBrowserLauncher`) are restricted to `process.env.NODE_ENV === "test"` and throw in production.
   - Chromium sandbox remains active; `--no-sandbox` is never enabled.

6. **Read-Only Project Inspector (§5.2, §17):**
   - `pixelproof inspect` operates strictly read-only. It inspects lockfiles and static files without executing project build scripts or arbitrary npm commands.
