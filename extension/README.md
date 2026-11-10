# Markbook Note Chrome Extension (Manifest V3)

This directory contains the production-ready Google Chrome Extension for **Markbook Note**, an Open Source AI Conversation Memory Platform.

## Features
- **Manifest V3 Architecture**: Modern background service worker and isolated content scripts.
- **Auto-Capture & Manual Modes**: Real-time background sync or on-demand passive capturing.
- **🧬 Deep Clone Chat**: Smoothly auto-scrolls through long conversations to capture 100% of User prompts and AI responses without missing a single turn.
- **Open Note Viewer**: Generate instant shareable Markdown notes viewable as clean open-source documents or readable by ChatGPT.
- **Zero Cloud Storage**: 100% of captured conversations remain exclusively inside local browser storage.
- **Cross-Platform Context Export**: Copy clean, linear conversation threads formatted for immediate handoff to another model.

## How to Install in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the URL bar.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select this folder (`extension/`).
6. Pin the Markbook Note icon in your Chrome toolbar.
7. Open ChatGPT, Google Gemini, or Claude — Markbook Note will immediately detect your conversation session!
