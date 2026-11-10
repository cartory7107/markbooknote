# Memora Chrome Extension (Manifest V3)

This directory contains the production-ready Google Chrome Extension for **Memora**, an Open Source AI Conversation Memory Platform.

## Features
- **Manifest V3 Architecture**: Modern background service worker and isolated content scripts.
- **Auto-Capture Mode**: Seamlessly records user prompts and completed model responses on ChatGPT (`chatgpt.com`), Google Gemini (`gemini.google.com`), and Claude (`claude.ai`).
- **Zero Cloud Storage**: 100% of captured conversations remain exclusively inside local browser IndexedDB / Chrome Storage.
- **Manual Capture Mode**: Single-click on-demand conversation snapshot.
- **Cross-Platform Context Export**: Copy clean, linear conversation threads formatted for immediate handoff to another model.

## How to Install in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the URL bar.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select this folder (`memora/extension`).
6. Pin the Memora icon in your Chrome toolbar.
7. Open ChatGPT, Google Gemini, or Claude — Memora will immediately detect your conversation session!
