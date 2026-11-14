// PixelProof Documentation & Interactive Simulator
document.addEventListener('DOMContentLoaded', () => {
  // --- Universal Clipboard & Toast Engine ---
  const copyToast = document.getElementById('copy-toast');
  const copyToastCmd = document.getElementById('copy-toast-cmd');
  let toastTimer = null;

  function showToast(label) {
    if (!copyToast) return;
    if (copyToastCmd) {
      copyToastCmd.textContent = label;
      copyToastCmd.title = label;
    }
    copyToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      copyToast.classList.remove('show');
    }, 2200);
  }

  function copyToClipboard(text, label = '', triggerEl = null) {
    if (!text) return;
    const cleanText = text.trim();

    const onSuccess = () => {
      showToast(label || cleanText);
      if (triggerEl) {
        triggerEl.classList.add('copied');
        const textSpan = triggerEl.querySelector('span:not(.prompt)') || triggerEl.querySelector('span');
        const prevText = textSpan ? textSpan.textContent : '';
        const isIconBtn = triggerEl.classList.contains('table-copy-btn');

        if (isIconBtn) {
          triggerEl.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
        } else if (textSpan) {
          textSpan.textContent = 'Copied!';
        }

        setTimeout(() => {
          triggerEl.classList.remove('copied');
          if (isIconBtn) {
            triggerEl.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            `;
          } else if (textSpan && prevText) {
            textSpan.textContent = prevText;
          }
        }, 1800);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText)
        .then(onSuccess)
        .catch(() => fallbackCopy(cleanText, onSuccess));
    } else {
      fallbackCopy(cleanText, onSuccess);
    }
  }

  function fallbackCopy(text, onSuccess) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.warn('Fallback copy error:', err);
    }
  }

  // --- 1. Terminal Tabs & Hero Copy Logic ---
  const terminalTabs = document.querySelectorAll('.terminal-tab');
  const terminalCode = document.getElementById('terminal-code-text');
  const terminalWrapper = document.getElementById('terminal-code-wrapper');
  const copyTerminalBtn = document.getElementById('copy-terminal-btn');

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
      if (commands[target] && terminalCode) {
        terminalCode.textContent = commands[target];
      }
    });
  });

  if (copyTerminalBtn) {
    copyTerminalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = terminalCode ? terminalCode.textContent.trim() : '';
      copyToClipboard(text, text, copyTerminalBtn);
    });
  }

  if (terminalWrapper) {
    terminalWrapper.addEventListener('click', () => {
      const text = terminalCode ? terminalCode.textContent.trim() : '';
      copyToClipboard(text, text, copyTerminalBtn);
    });
  }

  // --- 2. Interactive Visual Verification Simulator ---
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

  // --- 3. Agent Selector & Copy Logic ---
  const agentCards = document.querySelectorAll('.agent-card');
  const agentCmdDisplay = document.getElementById('agent-command-output');
  const agentCmdBox = document.getElementById('agent-cmd-box');
  const copyAgentBtn = document.getElementById('copy-agent-btn');

  const agentCommands = {
    antigravity: 'pixelproof install-skill --agent antigravity\n# Target: ~/.gemini/config/skills/pixelproof/SKILL.md',
    claude: 'pixelproof install-skill --agent claude\n# Target: CLAUDE.md in project root',
    cursor: 'pixelproof install-skill --agent cursor\n# Target: .cursor/rules/pixelproof.mdc',
    copilot: 'pixelproof install-skill --agent copilot\n# Target: .github/copilot-instructions.md',
    opencode: 'pixelproof install-skill --agent opencode\n# Target: AGENTS.md in project root',
    codex: 'pixelproof install-skill --agent codex\n# Target: AGENTS.md (OpenAI Codex / Aider)'
  };

  function getActiveAgentCommand() {
    if (!agentCmdDisplay) return 'pixelproof install-skill';
    const lines = agentCmdDisplay.textContent.split('\n');
    return lines[0].trim();
  }

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

  if (copyAgentBtn) {
    copyAgentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = getActiveAgentCommand();
      copyToClipboard(cmd, cmd, copyAgentBtn);
    });
  }

  if (agentCmdBox) {
    agentCmdBox.addEventListener('click', () => {
      const cmd = getActiveAgentCommand();
      copyToClipboard(cmd, cmd, copyAgentBtn);
    });
  }

  // --- 4. CLI Command Matrix Copy Handlers ---
  const tableCopyBtns = document.querySelectorAll('.table-copy-btn');
  tableCopyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = btn.dataset.copy || '';
      copyToClipboard(cmd, cmd, btn);
    });
  });

  const cmdCopyCells = document.querySelectorAll('.cmd-copy-cell');
  cmdCopyCells.forEach(cell => {
    const code = cell.querySelector('code');
    const btn = cell.querySelector('.table-copy-btn');
    if (code && btn) {
      code.style.cursor = 'pointer';
      code.title = 'Click to copy command';
      code.addEventListener('click', () => {
        const cmd = btn.dataset.copy || code.textContent.trim();
        copyToClipboard(cmd, cmd, btn);
      });
    }
  });

  // --- 5. Interactive Documentation Reader with Code Block Enhancer ---
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

  function enhanceDocCodeBlocks() {
    if (!docBody) return;
    const preBlocks = docBody.querySelectorAll('pre');
    preBlocks.forEach(pre => {
      if (pre.parentElement.classList.contains('doc-pre-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'doc-pre-wrapper';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'doc-copy-btn';
      copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      `;
      copyBtn.title = 'Copy snippet to clipboard';

      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = pre.querySelector('code');
        const text = code ? code.innerText : pre.innerText;
        copyToClipboard(text, 'Code snippet', copyBtn);
      });

      wrapper.appendChild(copyBtn);
    });
  }

  async function loadDoc(docKey) {
    const file = docFiles[docKey];
    if (!file || !docBody) return;

    docBody.innerHTML = '<div style="color:var(--text-muted); font-family:var(--font-mono); padding:1rem;">Loading documentation...</div>';

    try {
      const res = await fetch(`./${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const markdown = await res.text();

      if (window.marked && typeof window.marked.parse === 'function') {
        docBody.innerHTML = window.marked.parse(markdown);
      } else {
        docBody.innerHTML = `<pre><code>${escapeHtml(markdown)}</code></pre>`;
      }

      enhanceDocCodeBlocks();
    } catch (err) {
      docBody.innerHTML = `<div style="color:#ef4444; font-family:var(--font-mono); padding:1rem;">Failed to load ${file}: ${err.message}. View raw document on <a href="https://github.com/ab-pro-dev/PixelProof-Advanced-AI-coding-agent-skill/tree/main/docs/${file}" target="_blank" style="color:var(--cyan);">GitHub</a>.</div>`;
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

  // Load initial documentation tab
  if (docMenuItems.length > 0) {
    loadDoc(docMenuItems[0].dataset.doc);
  }

  // --- 6. Click-to-copy for Workflow Steps inline code ---
  const workflowCodes = document.querySelectorAll('.step-card code');
  workflowCodes.forEach(code => {
    const text = code.textContent.trim();
    if (text.startsWith('pixelproof') || text.startsWith('npm') || text.startsWith('npx')) {
      code.style.cursor = 'pointer';
      code.title = 'Click to copy command';
      code.addEventListener('click', () => {
        copyToClipboard(text, text);
      });
    }
  });
});
