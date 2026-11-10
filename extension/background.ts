/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Chrome Extension Manifest V3 Service Worker

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Memora AI Memory Extension installed/updated.');
  if (chrome.action && chrome.action.setBadgeText) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#6366F1' });
  }

  // Auto-inject content script into any currently opened AI tabs so users NEVER have to refresh tabs!
  try {
    const tabs = await chrome.tabs.query({
      url: [
        'https://*.chatgpt.com/*',
        'https://chatgpt.com/*',
        'https://*.openai.com/*',
        'https://chat.openai.com/*',
        'https://gemini.google.com/*',
        'https://*.claude.ai/*',
        'https://claude.ai/*'
      ]
    });

    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js']
        }).catch(() => {
          // Ignore tabs where script was already running or cannot execute
        });
      }
    }
  } catch (err) {
    console.warn('Auto-injection failed:', err);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CONVERSATION_CAPTURED') {
    const convo = request.data;
    console.log(`[Memora Background] Auto-saved conversation: ${convo.title} (${convo.messages.length} messages)`);

    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: `${convo.messages.length}` });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: 'ON' });
      }, 3000);
    }

    sendResponse({ received: true });
    return true;
  }
});
