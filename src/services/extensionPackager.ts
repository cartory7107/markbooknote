/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';

export async function generateExtensionZip(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Manifest V3
  const manifestContent = JSON.stringify({
    manifest_version: 3,
    name: "Markbook Note — AI Conversation Memory & Sync",
    version: "1.0.3",
    description: "Automatically capture, organize, and transfer conversation context across ChatGPT, Google Gemini, and Claude.",
    permissions: [
      "storage",
      "activeTab"
    ],
    host_permissions: [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
      "https://gemini.google.com/*",
      "https://claude.ai/*"
    ],
    action: {
      default_popup: "popup.html",
      default_title: "Markbook Note"
    },
    background: {
      service_worker: "background.js",
      type: "module"
    },
    content_scripts: [
      {
        matches: [
          "https://chatgpt.com/*",
          "https://chat.openai.com/*",
          "https://gemini.google.com/*",
          "https://claude.ai/*"
        ],
        js: ["content-script.js"],
        run_at: "document_idle"
      }
    ]
  }, null, 2);

  zip.file('manifest.json', manifestContent);

  // 2. Background service worker
  const backgroundJs = `
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Markbook Note] Background service worker initialized.');
  if (chrome.action && chrome.action.setBadgeText) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#6366F1' });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CONVERSATION_CAPTURED') {
    const convo = request.data;
    console.log('[Markbook Note] Captured conversation: ' + convo.title + ' (' + convo.messages.length + ' msgs)');
    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: String(convo.messages.length) });
      setTimeout(() => { chrome.action.setBadgeText({ text: 'ON' }); }, 3000);
    }
    sendResponse({ success: true });
    return true;
  }
});
`;
  zip.file('background.js', backgroundJs);

  // 3. Content Script with Adapters
  const contentScriptJs = `
// Markbook Note Content Script - Unified Platform Observer
(function() {
  const url = window.location.href;
  let platform = null;

  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) platform = 'chatgpt';
  else if (url.includes('gemini.google.com')) platform = 'gemini';
  else if (url.includes('claude.ai')) platform = 'claude';

  if (!platform) return;

  console.log('[Markbook Note] Active on ' + platform);

  function extractMessages() {
    const msgs = [];
    if (platform === 'chatgpt') {
      const items = document.querySelectorAll('[data-message-author-role]');
      items.forEach((el, i) => {
        const role = el.getAttribute('data-message-author-role');
        const text = el.querySelector('.whitespace-pre-wrap, .markdown')?.textContent?.trim() || el.textContent?.trim();
        if (text) msgs.push({ role, content: text, timestamp: Date.now() - (items.length - i) * 1000 });
      });
    } else if (platform === 'gemini') {
      const items = document.querySelectorAll('user-query-container, model-response, .user-query, .model-response');
      items.forEach((el, i) => {
        const isUser = el.tagName.toLowerCase().includes('user') || el.classList.contains('user-query');
        const text = el.querySelector('.query-text, .message-content, .markdown')?.textContent?.trim() || el.textContent?.trim();
        if (text) msgs.push({ role: isUser ? 'user' : 'assistant', content: text, timestamp: Date.now() - (items.length - i) * 1000 });
      });
    } else if (platform === 'claude') {
      const items = document.querySelectorAll('[data-testid="user-message"], .font-claude-message, .font-user-message');
      items.forEach((el, i) => {
        const isUser = el.matches('[data-testid="user-message"], .font-user-message');
        const text = el.textContent?.trim();
        if (text) msgs.push({ role: isUser ? 'user' : 'assistant', content: text, timestamp: Date.now() - (items.length - i) * 1000 });
      });
    }
    return msgs;
  }

  function getTitle() {
    return document.title.replace(/ - (ChatGPT|Gemini|Claude)/i, '').trim() || (platform.toUpperCase() + ' Conversation');
  }

  // Periodic debounce capture
  let timer = null;
  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const msgs = extractMessages();
      if (msgs.length > 0) {
        chrome.runtime.sendMessage({
          action: 'CONVERSATION_CAPTURED',
          data: {
            id: platform + '-' + Date.now().toString(36),
            platform: platform,
            title: getTitle(),
            messages: msgs
          }
        });
      }
    }, 1500);
  });

  const main = document.querySelector('main') || document.body;
  observer.observe(main, { childList: true, subtree: true, characterData: true });

  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'MANUAL_CAPTURE') {
      const msgs = extractMessages();
      sendResponse({ success: true, count: msgs.length, title: getTitle() });
    }
  });
})();
`;
  zip.file('content-script.js', contentScriptJs);

  // 4. Popup HTML
  const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 360px; margin: 0; padding: 16px; background: #090A0F; color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 12px; }
    .brand { font-size: 16px; font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 8px; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #A5B4FC; }
    .box { background: #11121B; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .btn { width: 100%; background: #6366F1; color: #FFF; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 6px; }
    .btn:hover { background: #4F46E5; }
    .btn-sec { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); margin-top: 6px; }
    .btn-sec:hover { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">⚡ Markbook Note</div>
    <span class="tag">Active</span>
  </div>
  <div class="box">
    <div class="row">
      <span>Auto-Capture</span>
      <input type="checkbox" checked id="autoCheck" style="accent-color: #6366F1;">
    </div>
    <div style="font-size: 11px; color: #94A3B8;" id="statusText">Active memory monitor running</div>
    <button class="btn" id="manualBtn">📥 Save Current Conversation</button>
  </div>
  <div class="box">
    <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">Memory Quick Action</div>
    <button class="btn btn-sec" id="openDashBtn">🚀 Open Web Dashboard</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;
  zip.file('popup.html', popupHtml);

  // 5. Popup JS
  const popupJs = `
document.addEventListener('DOMContentLoaded', () => {
  const manualBtn = document.getElementById('manualBtn');
  const openDashBtn = document.getElementById('openDashBtn');
  const statusText = document.getElementById('statusText');

  manualBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'MANUAL_CAPTURE' }, (res) => {
          if (res?.success) {
            statusText.textContent = '✓ Saved ' + res.count + ' messages!';
          } else {
            statusText.textContent = 'Open ChatGPT, Gemini, or Claude to capture.';
          }
        });
      }
    });
  });

  openDashBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ais-dev-4aueeqqak3kc5ew4s7gyhz-935652996700.asia-southeast1.run.app' });
  });
});
`;
  zip.file('popup.js', popupJs);

  // 6. Installation README
  const readme = `# Markbook Note Chrome Extension Installation

Thank you for downloading Markbook Note!

## Installation Steps:
1. Extract this zip archive into a folder on your computer (e.g. ~/Downloads/markbook-note-extension).
2. Open Google Chrome and go to: chrome://extensions/
3. Turn ON "Developer mode" in the top right toggle.
4. Click "Load unpacked" button in the top left.
5. Select the extracted folder containing manifest.json.
6. The Markbook Note icon will appear in your Chrome toolbar.
7. Open ChatGPT, Google Gemini, or Claude and enjoy automatic conversation storage!
`;
  zip.file('README.md', readme);

  return await zip.generateAsync({ type: 'blob' });
}
