// PixelProof Documentation & Interactive Simulator
document.addEventListener('DOMContentLoaded', () => {
  // 1. Terminal Tabs & Copy Logic
  const terminalTabs = document.querySelectorAll('.terminal-tab');
  const terminalCode = document.getElementById('terminal-code-text');
  const copyBtn = document.getElementById('copy-terminal-btn');

  const commands = {
    install: 'npm install -g pixelproof-ui',
    skill: 'pixelproof install-skill',
    doctor: 'pixelproof doctor',
    npx: 'npx pixelproof-ui doctor'
  };

  terminalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      terminalTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.cmd;
      if (commands[target]) {
        terminalCode.textContent = commands[target];
      }
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = terminalCode.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied';
        copyBtn.style.color = '#10b981';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.color = '';
        }, 2000);
      });
    });
  }

  // 2. Interactive Visual Verification Simulator
  const demoTabs = document.querySelectorAll('.demo-tab-btn');
  const actualCard = document.getElementById('actual-mock-card');
  const diffOverlay = document.getElementById('diff-overlay-container');
  const gridOverlay = document.getElementById('grid-overlay-container');
  const metricMae = document.getElementById('metric-mae');
  const metricPixels = document.getElementById('metric-pixels');
  const metricStatus = document.getElementById('metric-status');

  const demoModes = {
    split: () => {
      actualCard.className = 'mock-ui mock-actual';
      diffOverlay.style.display = 'none';
      gridOverlay.style.display = 'none';
      metricMae.textContent = '0.0384';
      metricMae.className = 'metric-val val-red';
      metricPixels.textContent = '420 px';
      metricPixels.className = 'metric-val val-red';
      metricStatus.textContent = 'Layout Shift Detected';
      metricStatus.className = 'metric-val val-red';
    },
    diff: () => {
      actualCard.className = 'mock-ui mock-actual';
      diffOverlay.style.display = 'flex';
      gridOverlay.style.display = 'none';
      metricMae.textContent = '0.0384';
      metricMae.className = 'metric-val val-red';
      metricPixels.textContent = '420 px (Solid Red)';
      metricPixels.className = 'metric-val val-red';
      metricStatus.textContent = 'Diff Overlay Active';
      metricStatus.className = 'metric-val val-red';
    },
    grid: () => {
      actualCard.className = 'mock-ui mock-actual';
      diffOverlay.style.display = 'none';
      gridOverlay.style.display = 'grid';
      metricMae.textContent = 'Region (0,1)';
      metricMae.className = 'metric-val val-red';
      metricPixels.textContent = 'Rank #1 (P = 0.84)';
      metricPixels.className = 'metric-val val-red';
      metricStatus.textContent = 'Top Priority: Header';
      metricStatus.className = 'metric-val val-red';
    },
    verified: () => {
      actualCard.className = 'mock-ui'; // exact match
      diffOverlay.style.display = 'none';
      gridOverlay.style.display = 'none';
      metricMae.textContent = '0.0000';
      metricMae.className = 'metric-val val-green';
      metricPixels.textContent = '0 px (Identical)';
      metricPixels.className = 'metric-val val-green';
      metricStatus.textContent = '✓ Verified (100% Match)';
      metricStatus.className = 'metric-val val-green';
    }
  };

  demoTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      demoTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      if (demoModes[mode]) {
        demoModes[mode]();
      }
    });
  });

  // 3. Agent Selector Cards
  const agentCards = document.querySelectorAll('.agent-card');
  const agentCmdDisplay = document.getElementById('agent-command-output');

  const agentCommands = {
    antigravity: 'pixelproof install-skill --agent antigravity\n# Target: ~/.gemini/config/skills/pixelproof/SKILL.md',
    claude: 'pixelproof install-skill --agent claude\n# Target: CLAUDE.md in project root',
    cursor: 'pixelproof install-skill --agent cursor\n# Target: .cursor/rules/pixelproof.mdc',
    copilot: 'pixelproof install-skill --agent copilot\n# Target: .github/copilot-instructions.md',
    opencode: 'pixelproof install-skill --agent opencode\n# Target: AGENTS.md in project root',
    codex: 'pixelproof install-skill --agent codex\n# Target: AGENTS.md (OpenAI Codex / Aider)'
  };

  agentCards.forEach(card => {
    card.addEventListener('click', () => {
      agentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const agent = card.dataset.agent;
      if (agentCommands[agent] && agentCmdDisplay) {
        agentCmdDisplay.textContent = agentCommands[agent];
      }
    });
  });

  // 4. Documentation Tabs
  const docMenuItems = document.querySelectorAll('.docs-menu-item');
  const docBody = document.getElementById('docs-body');

  const docFiles = {
    workflow: 'workflow.md',
    'visual-analysis': 'visual-analysis.md',
    architecture: 'architecture.md',
    security: 'security.md',
    benchmarks: 'benchmarks.md',
    troubleshooting: 'troubleshooting.md'
  };

  async function loadDoc(docKey) {
    const file = docFiles[docKey];
    if (!file) return;

    docBody.innerHTML = '<div style="color:var(--text-muted); font-family:var(--font-mono);">Loading documentation...</div>';

    try {
      const res = await fetch(`./${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const markdown = await res.text();

      if (window.marked && typeof window.marked.parse === 'function') {
        docBody.innerHTML = window.marked.parse(markdown);
      } else {
        // Simple raw fallback
        docBody.innerHTML = `<pre><code>${escapeHtml(markdown)}</code></pre>`;
      }
    } catch (err) {
      docBody.innerHTML = `<div style="color:#ef4444; font-family:var(--font-mono);">Failed to load ${file}: ${err.message}. You can view the raw markdown in the repository <a href="https://github.com/ab-pro-dev/PixelProof-Advanced-AI-coding-agent-skill/tree/main/docs/${file}" target="_blank">here</a>.</div>`;
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  docMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      docMenuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      loadDoc(item.dataset.doc);
    });
  });

  // Load initial doc
  if (docMenuItems.length > 0) {
    loadDoc(docMenuItems[0].dataset.doc);
  }
});
