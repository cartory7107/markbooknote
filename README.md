# Memora — Open Source AI Conversation Memory Platform

> **"Your AI Conversations. One Memory."**  
> Never lose your AI conversations. Save, organize, and continue your thinking across ChatGPT, Gemini, and Claude.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-6366f1.svg)](extension/manifest.json)
[![Zero Cloud Storage](https://img.shields.io/badge/Privacy-Zero%20Cloud%20Storage-10B981.svg)](#privacy-guarantee)

---

## Overview

**Memora** is an open-source, privacy-first AI conversation memory platform. It features:
1. **Chrome Extension (Manifest V3)**: Auto-detects and saves conversations on ChatGPT, Google Gemini, and Claude using dedicated DOM adapters.
2. **Web Dashboard**: Comprehensive search, tagging, favorites, and multi-format export interface.
3. **Context Transfer Studio**: Re-injects conversation context between different AI platforms with one click.
4. **Interactive In-App Simulator**: Test auto-capture and popup interactions inside the web interface without installing external tools.
5. **Ethical Subscription Management**: Free tier includes 100 auto-saved conversations. Premium (৳40/month) unlocks unlimited capture. **Existing saved data is never deleted or locked upon subscription expiration.**

---

## Core Privacy Architecture

- **100% Local-First Storage**: All conversation text and prompts reside in browser `IndexedDB` (`memora_db`).
- **Zero Ingestion**: Remote servers never receive your private AI dialogues.
- **Explicit Share Links Only**: Public share links are generated strictly upon explicit user instruction, protected by client-side revocation keys.

---

## Chrome Extension Setup

1. Open Google Chrome and visit `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `extension/` directory.
5. Pin Memora in your toolbar and start chatting on ChatGPT, Gemini, or Claude.

---

## Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run linting
npm run lint

# Build production bundle
npm run build
```

---

## Supported Platforms

| Platform | Target URL | Adapter Status |
| :--- | :--- | :--- |
| **ChatGPT** (GPT-4o, o1, o3) | `chatgpt.com`, `chat.openai.com` | Verified |
| **Google Gemini** (1.5, 2.0 Pro) | `gemini.google.com` | Verified |
| **Anthropic Claude** (3.5, 3.7 Sonnet) | `claude.ai` | Verified |

---

## License

This project is licensed under the [MIT License](LICENSE).
