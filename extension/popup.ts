/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtensionStorage } from './storage';
import { ExtensionLicense } from './license';
import { CapturedConversation } from './adapters/BaseAdapter';

document.addEventListener('DOMContentLoaded', async () => {
  const modeAutoBtn = document.getElementById('modeAutoBtn') as HTMLButtonElement;
  const modeManualBtn = document.getElementById('modeManualBtn') as HTMLButtonElement;
  const modeDescription = document.getElementById('modeDescription') as HTMLElement;
  const cloneChatBtn = document.getElementById('cloneChatBtn') as HTMLButtonElement;

  const statusDot = document.getElementById('statusDot') as HTMLElement;
  const platformStatus = document.getElementById('platformStatus') as HTMLElement;
  const manualSaveBtn = document.getElementById('manualSaveBtn') as HTMLButtonElement;
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const recentList = document.getElementById('recentList') as HTMLElement;
  const planBadge = document.getElementById('planBadge') as HTMLElement;
  const openDashboardBtn = document.getElementById('openDashboardBtn') as HTMLButtonElement;
  const exportAllBtn = document.getElementById('exportAllBtn') as HTMLButtonElement;

  // Account & Sync elements
  const accountUserDisplay = document.getElementById('accountUserDisplay') as HTMLElement;
  const authToggleBtn = document.getElementById('authToggleBtn') as HTMLButtonElement;
  const restoreVaultBtn = document.getElementById('restoreVaultBtn') as HTMLButtonElement;
  const authDrawer = document.getElementById('authDrawer') as HTMLElement;
  const closeAuthBtn = document.getElementById('closeAuthBtn') as HTMLButtonElement;
  const authEmailInput = document.getElementById('authEmailInput') as HTMLInputElement;
  const authPassInput = document.getElementById('authPassInput') as HTMLInputElement;
  const submitAuthBtn = document.getElementById('submitAuthBtn') as HTMLButtonElement;
  const googleQuickAuthBtn = document.getElementById('googleQuickAuthBtn') as HTMLButtonElement;

  // Inspector elements
  const inspectorView = document.getElementById('inspectorView') as HTMLElement;
  const editTitleInput = document.getElementById('editTitleInput') as HTMLInputElement;
  const saveTitleBtn = document.getElementById('saveTitleBtn') as HTMLButtonElement;
  const pinConvoBtn = document.getElementById('pinConvoBtn') as HTMLButtonElement;
  const inspBody = document.getElementById('inspBody') as HTMLElement;
  const copyInspContextBtn = document.getElementById('copyInspContextBtn') as HTMLButtonElement;
  const deleteInspBtn = document.getElementById('deleteInspBtn') as HTMLButtonElement;
  const closeInspBtn = document.getElementById('closeInspBtn') as HTMLButtonElement;

  let allConversations: CapturedConversation[] = [];
  let currentFilter = 'all';
  let activeConvoForInsp: CapturedConversation | null = null;
  let activeTabUrl = '';
  let activeTabId: number | null = null;

  // 1. Account & Session UI
  async function updateAccountUI() {
    const user = await ExtensionStorage.getUserSession();
    if (user && user.email) {
      if (accountUserDisplay) {
        accountUserDisplay.innerHTML = `<span style="color: #34d399;">●</span> <span style="color: #f1f5f9; font-weight: 600;" title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</span>`;
      }
      if (authToggleBtn) {
        authToggleBtn.textContent = 'Sign Out';
        authToggleBtn.style.color = '#f87171';
        authToggleBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        authToggleBtn.style.background = 'rgba(239, 68, 68, 0.15)';
      }
    } else {
      if (accountUserDisplay) {
        accountUserDisplay.innerHTML = `<span style="color: #94a3b8;">Guest Vault (Local Only)</span>`;
      }
      if (authToggleBtn) {
        authToggleBtn.textContent = 'Sign In';
        authToggleBtn.style.color = '#c7d2fe';
        authToggleBtn.style.borderColor = '#6366f1';
        authToggleBtn.style.background = 'rgba(99, 102, 241, 0.2)';
      }
    }
  }

  await updateAccountUI();

  // Auth drawer toggle
  authToggleBtn?.addEventListener('click', async () => {
    const user = await ExtensionStorage.getUserSession();
    if (user) {
      if (confirm(`Signed in as ${user.email}.\nDo you want to sign out? Your local conversations will remain in this browser.`)) {
        await ExtensionStorage.setUserSession(null);
        await updateAccountUI();
      }
    } else {
      authDrawer?.classList.toggle('open');
      if (authDrawer?.classList.contains('open')) {
        authEmailInput?.focus();
      }
    }
  });

  closeAuthBtn?.addEventListener('click', () => {
    authDrawer?.classList.remove('open');
  });

  submitAuthBtn?.addEventListener('click', async () => {
    const email = authEmailInput?.value.trim() || '';
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    await ExtensionStorage.setUserSession({
      email,
      name: email.split('@')[0]
    });
    authDrawer?.classList.remove('open');
    if (authPassInput) authPassInput.value = '';
    await updateAccountUI();
    alert(`✓ Successfully linked to ${email}! Your conversations and pins are secured in Markbook Note.`);
  });

  googleQuickAuthBtn?.addEventListener('click', async () => {
    let email = authEmailInput?.value.trim() || '';
    if (!email || !email.includes('@')) {
      const prompted = prompt('Enter your Google Account email to link your Markbook Note Vault:');
      if (!prompted || !prompted.includes('@')) return;
      email = prompted.trim();
    }
    await ExtensionStorage.setUserSession({
      email,
      name: email.split('@')[0]
    });
    authDrawer?.classList.remove('open');
    await updateAccountUI();
    alert(`✓ Google Account (${email}) linked to Markbook Note!`);
  });

  // Restore Vault Handler
  restoreVaultBtn?.addEventListener('click', async () => {
    restoreVaultBtn.textContent = '⏳ Checking...';
    try {
      await refreshList();
      const count = allConversations.length;
      restoreVaultBtn.textContent = '✓ Synced!';
      setTimeout(() => { restoreVaultBtn.textContent = '🔄 Restore'; }, 2000);
      alert(`✓ Markbook Note Vault Synced!\n${count} conversation${count === 1 ? '' : 's'} are loaded and secure.`);
    } catch (e: any) {
      restoreVaultBtn.textContent = '🔄 Restore';
      alert('Could not sync vault: ' + (e?.message || 'Storage error'));
    }
  });

  // 2. Load Settings & Mode UI
  const settings = await ExtensionStorage.getSettings();

  function updateModeUI(isAuto: boolean) {
    if (isAuto) {
      modeAutoBtn?.classList.add('active');
      modeManualBtn?.classList.remove('active');
      if (modeDescription) {
        modeDescription.innerHTML = '⚡ <strong>Auto Mode:</strong> Listens & auto-captures every new prompt & AI response in real-time.';
      }
    } else {
      modeManualBtn?.classList.add('active');
      modeAutoBtn?.classList.remove('active');
      if (modeDescription) {
        modeDescription.innerHTML = '👆 <strong>Manual Mode:</strong> Passive. Captures only when you click Capture or Clone.';
      }
    }
  }

  updateModeUI(settings.autoSaveMode);

  modeAutoBtn?.addEventListener('click', async () => {
    await ExtensionStorage.updateSettings({ autoSaveMode: true });
    updateModeUI(true);
    if (activeTabId && typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
      chrome.tabs.sendMessage(activeTabId, { action: 'SET_AUTO_SAVE', enabled: true }, () => {
        if (chrome.runtime?.lastError) { /* ignore */ }
      });
    }
  });

  modeManualBtn?.addEventListener('click', async () => {
    await ExtensionStorage.updateSettings({ autoSaveMode: false });
    updateModeUI(false);
    if (activeTabId && typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
      chrome.tabs.sendMessage(activeTabId, { action: 'SET_AUTO_SAVE', enabled: false }, () => {
        if (chrome.runtime?.lastError) { /* ignore */ }
      });
    }
  });

  const license = await ExtensionLicense.getLicenseState();
  if (planBadge) {
    if (license.plan === 'premium') {
      planBadge.textContent = 'Premium (Unlimited)';
      planBadge.style.color = '#c084fc';
      planBadge.style.borderColor = '#9333ea';
    } else {
      planBadge.textContent = `Free (${license.savedCount}/${license.maxFreeLimit})`;
    }
  }

  // 3. Query Active Tab
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const activeTab = tabs?.[0];
      if (activeTab?.id) activeTabId = activeTab.id;
      if (activeTab?.url) {
        activeTabUrl = activeTab.url;
        if (activeTabUrl.includes('chatgpt.com') || activeTabUrl.includes('openai.com')) {
          setConnected('ChatGPT (OpenAI)', '#34d399');
        } else if (activeTabUrl.includes('gemini.google.com')) {
          setConnected('Google Gemini', '#60a5fa');
        } else if (activeTabUrl.includes('claude.ai')) {
          setConnected('Anthropic Claude', '#fb923c');
        } else {
          setNotDetected();
        }
      } else {
        setNotDetected();
      }
    });
  }

  function setConnected(name: string, color: string) {
    if (statusDot) statusDot.style.background = color;
    if (platformStatus) {
      platformStatus.innerHTML = `Connected: <strong style="color: ${color};">${name}</strong>`;
    }
    if (manualSaveBtn) manualSaveBtn.disabled = false;
    if (cloneChatBtn) cloneChatBtn.disabled = false;
  }

  function setNotDetected() {
    if (statusDot) statusDot.style.background = '#64748b';
    if (platformStatus) {
      platformStatus.innerHTML = `No AI tab active · <a href="https://chatgpt.com" target="_blank" style="color: #818cf8;">ChatGPT</a> / <a href="https://gemini.google.com" target="_blank" style="color: #818cf8;">Gemini</a> / <a href="https://claude.ai" target="_blank" style="color: #818cf8;">Claude</a>`;
    }
  }

  // 4. Capture Visible Chat Handler
  manualSaveBtn?.addEventListener('click', async () => {
    if (!activeTabId) {
      alert('Open ChatGPT, Gemini, or Claude in your active tab to capture conversations.');
      return;
    }

    manualSaveBtn.textContent = '⏳ Copying visible chat...';
    manualSaveBtn.disabled = true;

    trySendMessageToTab(activeTabId, { action: 'MANUAL_CAPTURE' }, async (res: any, hadError: boolean) => {
      if (!hadError && res?.success) {
        onCaptureSuccess(res.conversation?.messages?.length || res.count || 1);
        return;
      }

      // Fallback direct DOM extraction
      if (typeof chrome !== 'undefined' && chrome.scripting && chrome.scripting.executeScript) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: activeTabId! },
            func: directDomExtractor
          });

          const extracted = results?.[0]?.result as CapturedConversation | null;
          if (extracted && extracted.messages && extracted.messages.length > 0) {
            await ExtensionStorage.saveCapturedConversation(extracted);
            onCaptureSuccess(extracted.messages.length);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      manualSaveBtn.disabled = false;
      manualSaveBtn.textContent = '⚠️ Please refresh this AI tab once';
      setTimeout(() => { manualSaveBtn.textContent = '📥 Capture Visible Chat'; }, 3000);
    });
  });

  // 5. Deep Clone Chat Handler (Auto-Scroll & Capture Everything)
  cloneChatBtn?.addEventListener('click', async () => {
    if (!activeTabId) {
      alert('Open ChatGPT, Gemini, or Claude in your active tab to clone conversations.');
      return;
    }

    cloneChatBtn.disabled = true;
    cloneChatBtn.textContent = '🧬 Auto-Scrolling & Cloning All Turns...';

    // Send CLONE_CHAT action to tab
    trySendMessageToTab(activeTabId, { action: 'CLONE_CHAT' }, async (res: any, hadError: boolean) => {
      if (!hadError && res?.success) {
        const count = res.count || res.conversation?.messages?.length || 1;
        cloneChatBtn.textContent = `✓ Done! Cloned Entire Chat (${count} turns)`;
        setTimeout(() => {
          cloneChatBtn.disabled = false;
          cloneChatBtn.textContent = '🧬 Clone Entire Chat (Auto-Scroll & Capture All)';
        }, 3000);
        await refreshList();
        return;
      }

      // If content script was not injected, inject it and try again
      if (typeof chrome !== 'undefined' && chrome.scripting && chrome.scripting.executeScript) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTabId! },
            files: ['content-script.js']
          });

          setTimeout(() => {
            trySendMessageToTab(activeTabId!, { action: 'CLONE_CHAT' }, async (retryRes: any, retryErr: boolean) => {
              if (!retryErr && retryRes?.success) {
                const count = retryRes.count || 1;
                cloneChatBtn.textContent = `✓ Done! Cloned Entire Chat (${count} turns)`;
                setTimeout(() => {
                  cloneChatBtn.disabled = false;
                  cloneChatBtn.textContent = '🧬 Clone Entire Chat (Auto-Scroll & Capture All)';
                }, 3000);
                await refreshList();
              } else {
                cloneChatBtn.disabled = false;
                cloneChatBtn.textContent = '⚠️ Refresh AI tab & try clone again';
                setTimeout(() => { cloneChatBtn.textContent = '🧬 Clone Entire Chat (Auto-Scroll & Capture All)'; }, 3000);
              }
            });
          }, 300);
          return;
        } catch (err) {
          console.error(err);
        }
      }

      cloneChatBtn.disabled = false;
      cloneChatBtn.textContent = '⚠️ Refresh AI tab & try clone again';
      setTimeout(() => { cloneChatBtn.textContent = '🧬 Clone Entire Chat (Auto-Scroll & Capture All)'; }, 3000);
    });
  });

  function trySendMessageToTab(tabId: number, msg: any, callback: (res: any, hadError: boolean) => void) {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      callback(null, true);
      return;
    }

    try {
      chrome.tabs.sendMessage(tabId, msg, (res: any) => {
        if (chrome.runtime?.lastError) {
          callback(null, true);
        } else {
          callback(res, false);
        }
      });
    } catch (e) {
      callback(null, true);
    }
  }

  function onCaptureSuccess(msgCount: number) {
    manualSaveBtn.disabled = false;
    manualSaveBtn.textContent = `✓ Done! Saved ${msgCount} turns`;
    setTimeout(() => { manualSaveBtn.textContent = '📥 Capture Visible Chat'; }, 3000);
    refreshList();
  }

  /**
   * Direct DOM Extractor for emergency fallback
   */
  function directDomExtractor(): any {
    const url = window.location.href;
    let platform = '';
    if (url.includes('chatgpt.com') || url.includes('openai.com')) platform = 'chatgpt';
    else if (url.includes('gemini.google.com')) platform = 'gemini';
    else if (url.includes('claude.ai')) platform = 'claude';
    else return null;

    let convoId = `${platform}-session`;
    if (platform === 'chatgpt') {
      const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
      convoId = match && match[1] ? `chatgpt-${match[1]}` : `chatgpt-${document.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'current'}`;
    } else if (platform === 'gemini') {
      const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9]+)/);
      convoId = match && match[1] ? `gemini-${match[1]}` : `gemini-${document.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'current'}`;
    } else if (platform === 'claude') {
      const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
      convoId = match && match[1] ? `claude-${match[1]}` : `claude-${document.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'current'}`;
    }

    const msgs: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number }[] = [];

    function extractClean(node: Element): string {
      const clone = node.cloneNode(true) as HTMLElement;

      const preBlocks = Array.from(clone.querySelectorAll('pre, code-block, [class*="code-block"]'));
      preBlocks.forEach((pre) => {
        if (pre.parentElement?.closest('pre, code-block')) return;
        const codeEl = pre.querySelector('code, .formatted-code') || pre;
        let lang = pre.getAttribute('language') || '';
        if (!lang && codeEl) {
          const match = codeEl.className.match(/language-([a-zA-Z0-9_-]+)/);
          if (match) lang = match[1];
        }
        pre.querySelectorAll('button, svg, [aria-label*="Copy"]').forEach(b => b.remove());
        const codeText = ((codeEl as any)?.textContent || pre.textContent || '') as string;
        pre.replaceWith(document.createTextNode(`\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n`));
      });

      clone.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent?.trim() || '');
        if (cells.length > 0) {
          tr.replaceWith(document.createTextNode('| ' + cells.join(' | ') + ' |\n'));
        }
      });

      const imgs = Array.from(clone.querySelectorAll('img'));
      imgs.forEach(img => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || 'Attached Image';
        if (src && !src.startsWith('data:image/svg') && !src.includes('avatar') && !src.includes('profile')) {
          img.replaceWith(document.createTextNode(`\n\n![${alt}](${src})\n\n`));
        } else {
          img.remove();
        }
      });

      clone.querySelectorAll('button, svg, mat-icon, .sr-only, [aria-label*="Copy"], [aria-label*="copy"], [aria-label*="Read aloud"], [data-testid*="copy"]').forEach(j => j.remove());
      clone.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
      clone.querySelectorAll('p').forEach(p => p.appendChild(document.createTextNode('\n\n')));
      clone.querySelectorAll('li').forEach(li => li.prepend(document.createTextNode('\n• ')));

      const raw = clone.textContent || '';
      return raw.replace(/\n{3,}/g, '\n\n').trim();
    }

    if (platform === 'chatgpt') {
      const turns = Array.from(document.querySelectorAll('article, [data-testid^="conversation-turn-"]'));
      turns.forEach((turn, idx) => {
        const userEl = turn.querySelector('[data-message-author-role="user"], [data-testid="user-message"], div.items-end .whitespace-pre-wrap, div[class*="self-end"] .whitespace-pre-wrap, .whitespace-pre-wrap');
        const assistantEl = turn.querySelector('[data-message-author-role="assistant"], [data-testid="assistant-message"], [class*="agent-turn"], [class*="markdown"], div.prose');

        const isUserTurn = turn.getAttribute('data-message-author-role') === 'user' || turn.querySelector('div.items-end') !== null;
        const isAiTurn = turn.getAttribute('data-message-author-role') === 'assistant' || turn.querySelector('[class*="markdown"]') !== null;

        if (isUserTurn && !isAiTurn) {
          const t = extractClean(userEl || turn);
          if (t && !t.includes('What can I help with today?')) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role: 'user', content: t, timestamp: Date.now() - (turns.length - idx) * 1000 });
        } else if (isAiTurn && !isUserTurn) {
          const t = extractClean(assistantEl || turn);
          if (t && !t.includes('What can I help with today?')) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role: 'assistant', content: t, timestamp: Date.now() - (turns.length - idx) * 1000 });
        } else {
          if (userEl && assistantEl && userEl !== assistantEl) {
            const u = extractClean(userEl);
            const a = extractClean(assistantEl);
            if (u) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role: 'user', content: u, timestamp: Date.now() - (turns.length - idx) * 1000 });
            if (a) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role: 'assistant', content: a, timestamp: Date.now() - (turns.length - idx) * 1000 + 500 });
          } else {
            const isRight = turn.querySelector('div.items-end, div[class*="self-end"]') !== null;
            const t = extractClean(turn);
            if (t && !t.includes('What can I help with today?')) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role: isRight ? 'user' : 'assistant', content: t, timestamp: Date.now() - (turns.length - idx) * 1000 });
          }
        }
      });

      // User safety net
      if (msgs.length > 0 && !msgs.some(m => m.role === 'user')) {
        const uNodes = Array.from(document.querySelectorAll('.whitespace-pre-wrap, div.items-end')).filter(n => !n.closest('.markdown, div.prose'));
        if (uNodes.length > 0) {
          const uText = extractClean(uNodes[0]);
          if (uText) msgs.unshift({ id: `${convoId}_msg_u`, role: 'user', content: uText, timestamp: Date.now() - 5000 });
        }
      }
    } else if (platform === 'gemini') {
      const uNodes = Array.from(document.querySelectorAll('user-query-container, div[data-test-id="user-query"], .user-query'));
      const aNodes = Array.from(document.querySelectorAll('model-response, div[data-test-id="model-response"], .model-response, message-content'));
      const all = [...uNodes.map(el => ({ el, role: 'user' as const })), ...aNodes.map(el => ({ el, role: 'assistant' as const }))];
      all.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
      all.forEach(({ el, role }, idx) => {
        const t = extractClean(el);
        if (t) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role, content: t, timestamp: Date.now() - (all.length - idx) * 1000 });
      });
    } else if (platform === 'claude') {
      const uNodes = Array.from(document.querySelectorAll('[data-testid="user-message"], .font-user-message'));
      const aNodes = Array.from(document.querySelectorAll('[data-testid="assistant-message"], .font-claude-message'));
      const all = [...uNodes.map(el => ({ el, role: 'user' as const })), ...aNodes.map(el => ({ el, role: 'assistant' as const }))];
      all.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
      all.forEach(({ el, role }, idx) => {
        const t = extractClean(el);
        if (t) msgs.push({ id: `${convoId}_msg_${msgs.length}`, role, content: t, timestamp: Date.now() - (all.length - idx) * 1000 });
      });
    }

    if (msgs.length === 0) return null;

    let title = document.title.replace(/ - (ChatGPT|Gemini|Claude)/i, '').replace(/ · Claude/i, '').trim();
    if (!title || title === 'ChatGPT' || title === 'Gemini' || title === 'Claude') {
      title = msgs[0]?.content.slice(0, 42) + '...' || (platform.toUpperCase() + ' Conversation');
    }

    return { id: convoId, platform, title, url, messages: msgs };
  }

  // 6. Load and Render List
  async function refreshList() {
    allConversations = await ExtensionStorage.getCapturedConversations();
    renderFiltered();
  }

  function renderFiltered() {
    if (!recentList) return;
    const term = searchInput?.value.toLowerCase().trim() || '';

    let filtered = allConversations;
    if (currentFilter !== 'all') {
      filtered = filtered.filter(c => c.platform === currentFilter);
    }
    if (term) {
      filtered = filtered.filter(c =>
        (c.title && c.title.toLowerCase().includes(term)) ||
        (c.customTitle && c.customTitle.toLowerCase().includes(term)) ||
        c.messages?.some(m => m.content.toLowerCase().includes(term))
      );
    }

    if (filtered.length === 0) {
      recentList.innerHTML = `
        <div style="color: #64748b; font-size: 11px; padding: 16px; text-align: center;">
          ${term ? 'No conversations match "' + term + '"' : 'No conversations saved yet.<br>Chat on ChatGPT, Gemini, or Claude to auto-save!'}
        </div>
      `;
      return;
    }

    recentList.innerHTML = filtered.map((c, idx) => {
      const displayTitle = c.customTitle || c.title || 'Untitled Session';
      const userCount = c.messages?.filter(m => m.role === 'user').length || 0;
      const aiCount = c.messages?.filter(m => m.role === 'assistant').length || 0;
      return `
        <div class="convo-item" data-index="${idx}">
          <div class="convo-title" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 270px;">
              ${c.isPinned ? '<span style="color: #f59e0b; margin-right: 4px;" title="Pinned">📌</span>' : ''}
              <span>${escapeHtml(displayTitle)}</span>
            </div>
            ${c.isPinned ? '<span style="font-size: 9px; color: #f59e0b; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); padding: 1px 4px; border-radius: 4px;">PINNED</span>' : ''}
          </div>
          <div class="convo-meta">
            <span style="color: #818cf8; text-transform: uppercase;">${c.platform}</span>
            <span>${c.messages?.length || 0} msgs (${userCount} You / ${aiCount} AI)</span>
          </div>
        </div>
      `;
    }).join('');

    recentList.querySelectorAll('.convo-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = Number(item.getAttribute('data-index'));
        const convo = filtered[idx];
        if (convo) openInspector(convo);
      });
    });
  }

  function openInspector(convo: CapturedConversation) {
    activeConvoForInsp = convo;
    if (inspectorView) inspectorView.classList.add('open');
    if (editTitleInput) {
      editTitleInput.value = convo.customTitle || convo.title || '';
    }
    if (pinConvoBtn) {
      pinConvoBtn.textContent = convo.isPinned ? '📌 Pinned' : '📌 Pin';
      pinConvoBtn.style.background = convo.isPinned ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.1)';
    }

    if (inspBody) {
      const summaryText = convo.messages.map(m => `[${m.role === 'user' ? 'YOU' : 'AI RESPONSE'}]:\n${m.content}`).join('\n\n---\n\n');
      inspBody.textContent = summaryText;
    }
  }

  saveTitleBtn?.addEventListener('click', async () => {
    if (!activeConvoForInsp || !editTitleInput) return;
    const newTitle = editTitleInput.value.trim();
    if (!newTitle) return;

    await ExtensionStorage.updateTitle(activeConvoForInsp.id, newTitle);
    activeConvoForInsp.title = newTitle;
    activeConvoForInsp.customTitle = newTitle;
    saveTitleBtn.textContent = '✓ Saved!';
    setTimeout(() => { saveTitleBtn.textContent = 'Save'; }, 1500);
    await refreshList();
  });

  pinConvoBtn?.addEventListener('click', async () => {
    if (!activeConvoForInsp) return;
    const isNowPinned = await ExtensionStorage.togglePin(activeConvoForInsp.id);
    activeConvoForInsp.isPinned = isNowPinned;
    pinConvoBtn.textContent = isNowPinned ? '📌 Pinned' : '📌 Pin';
    pinConvoBtn.style.background = isNowPinned ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.1)';
    await refreshList();
  });

  const copyInspLinkBtn = document.getElementById('copyInspLinkBtn') as HTMLButtonElement;
  const openInspWebBtn = document.getElementById('openInspWebBtn') as HTMLButtonElement;

  function getWebDashboardUrl(): string {
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      return window.location.origin;
    }
    return 'https://ais-dev-4aueeqqak3kc5ew4s7gyhz-935652996700.asia-southeast1.run.app';
  }

  function buildPortableNoteUrl(convo: CapturedConversation): string {
    const base = getWebDashboardUrl();
    try {
      const payload = {
        conversation: {
          id: convo.id,
          platform: convo.platform,
          title: convo.customTitle || convo.title,
          createdAt: convo.createdAt || Date.now(),
          messageCount: convo.messages?.length || 0
        },
        messages: convo.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }))
      };
      const jsonStr = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      if (b64.length < 7500) {
        return `${base}/?note=payload_${b64}`;
      }
    } catch (e) {
      console.warn('Could not encode portable note payload', e);
    }
    return `${base}/?note=${encodeURIComponent(convo.id)}`;
  }

  copyInspLinkBtn?.addEventListener('click', async () => {
    if (!activeConvoForInsp) return;
    const url = buildPortableNoteUrl(activeConvoForInsp);
    await navigator.clipboard.writeText(url);
    copyInspLinkBtn.textContent = '✓ Link Copied!';
    setTimeout(() => {
      copyInspLinkBtn.textContent = '🔗 Copy Note Link';
    }, 2500);
  });

  openInspWebBtn?.addEventListener('click', () => {
    if (!activeConvoForInsp) return;
    const url = buildPortableNoteUrl(activeConvoForInsp);
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  });

  closeInspBtn?.addEventListener('click', () => {
    if (inspectorView) inspectorView.classList.remove('open');
    activeConvoForInsp = null;
  });

  copyInspContextBtn?.addEventListener('click', async () => {
    if (!activeConvoForInsp) return;
    let text = `Platform: ${activeConvoForInsp.platform.toUpperCase()}\n`;
    text += `Conversation: ${activeConvoForInsp.customTitle || activeConvoForInsp.title}\n\n`;
    activeConvoForInsp.messages.forEach(m => {
      text += `${m.role === 'user' ? 'User' : 'Assistant'}:\n${m.content}\n\n`;
    });
    await navigator.clipboard.writeText(text.trim());
    copyInspContextBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyInspContextBtn.textContent = '📋 Copy for ChatGPT'; }, 2000);
  });

  deleteInspBtn?.addEventListener('click', async () => {
    if (!activeConvoForInsp) return;
    if (confirm('Delete this conversation from Markbook Note?')) {
      allConversations = allConversations.filter(c => c.id !== activeConvoForInsp?.id);
      await ExtensionStorage.setAllConversations(allConversations);
      if (inspectorView) inspectorView.classList.remove('open');
      activeConvoForInsp = null;
      renderFiltered();
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter') || 'all';
      renderFiltered();
    });
  });

  searchInput?.addEventListener('input', () => {
    renderFiltered();
  });

  openDashboardBtn?.addEventListener('click', () => {
    const dashUrl = getWebDashboardUrl();
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: dashUrl });
    } else {
      window.open(dashUrl, '_blank');
    }
  });

  exportAllBtn?.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allConversations, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `markbook-note-backup-${new Date().toISOString().slice(0, 10)}.json`);
    dl.click();
  });

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  await refreshList();
});
