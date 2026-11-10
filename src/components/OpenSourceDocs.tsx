/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, GitBranch, Shield, FileText, Check, Copy } from 'lucide-react';

export const OpenSourceDocs: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<'readme' | 'architecture' | 'contributing' | 'security' | 'license'>('readme');
  const [copied, setCopied] = useState(false);

  const docs = {
    readme: `# Memora — Open Source AI Conversation Memory Platform

Memora is a privacy-first, local-storage-centered AI conversation memory platform comprising a Chrome Extension (Manifest V3), a Web Dashboard, an interactive Extension Simulator, and a subscription & licensing engine.

## Key Capabilities
- **Automatic Multi-Turn Capture**: Listens to chat sessions on ChatGPT, Google Gemini, and Claude with dedicated DOM adapters.
- **Pure Local-First IndexedDB**: 100% of captured conversations remain on your local machine. No remote database synchronization by default.
- **Universal Context Transfer**: Package any conversation into an engineered prompt to continue thinking across different AI models.
- **Fair & Ethical Licensing**: Free tier includes 100 auto-saved conversations. Premium (৳40/month) unlocks unlimited capture. Previously saved conversations are never deleted or locked upon subscription expiration.

## Quick Start (Chrome Extension)
1. Download the extension ZIP from the dashboard or \`/extension\` directory.
2. Unpack into a local folder.
3. Open \`chrome://extensions/\`, enable **Developer mode**, and click **Load unpacked**.
4. Open ChatGPT, Gemini, or Claude to start saving conversations automatically!`,

    architecture: `# System Architecture & Data Flow

\`\`\`
┌───────────────────────────────────────────────────────────────┐
│                       Browser Process                         │
│                                                               │
│   ┌───────────────────────────┐    ┌──────────────────────┐   │
│   │   AI Tab (ChatGPT/Gemini) │    │  Memora Web App      │   │
│   │   - Content Script        │    │  - React Dashboard   │   │
│   │   - DOM MutationObserver  │    │  - Context Studio    │   │
│   └─────────────┬─────────────┘    └──────────┬───────────┘   │
│                 │                             │               │
│                 ▼                             ▼               │
│   ┌───────────────────────────────────────────────────────┐   │
│   │             Local IndexedDB ('memora_db')             │   │
│   │             - conversations store                     │   │
│   │             - messages store                          │   │
│   │             - shares store (opt-in public)            │   │
│   └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
\`\`\`

## Zero Ingestion Policy
The backend receives only license verification requests and explicitly published public share requests. Chat dialogues never leave client device memory.`,

    contributing: `# Contributing to Memora

We welcome open-source contributions to platform adapters, context exporters, and accessibility improvements!

## Development Guidelines
1. Fork and clone the repository.
2. Install dependencies: \`npm install\`
3. Run local dev server: \`npm run dev\`
4. Build extension: check \`/extension\` directory.
5. All adapters must isolate selectors in \`/extension/adapters/\` and include debounce handling for AI streaming.`,

    security: `# Security & Data Privacy Policy

## 1. Zero Cloud Storage for Dialogues
By default, conversation texts and message histories are stored exclusively in client-side IndexedDB.

## 2. Public Share Links
Public share links are generated only upon explicit user confirmation. Each share link is protected by a client-side revocation key.

## 3. Vulnerability Disclosure
To report a security vulnerability, please email security@memora.dev or open a private security advisory on GitHub.`,

    license: `MIT License

Copyright (c) 2026 Memora Open Source Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`
  };

  async function handleCopy() {
    await navigator.clipboard.writeText(docs[activeDoc]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-4 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Open Source Documentation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Standard open-source specifications, architectural contracts, and developer guidelines.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Doc'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveDoc('readme')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeDoc === 'readme'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#11121B] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>README.md</span>
        </button>
        <button
          onClick={() => setActiveDoc('architecture')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeDoc === 'architecture'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#11121B] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>ARCHITECTURE.md</span>
        </button>
        <button
          onClick={() => setActiveDoc('contributing')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeDoc === 'contributing'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#11121B] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>CONTRIBUTING.md</span>
        </button>
        <button
          onClick={() => setActiveDoc('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeDoc === 'security'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#11121B] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>SECURITY.md</span>
        </button>
        <button
          onClick={() => setActiveDoc('license')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeDoc === 'license'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#11121B] border border-white/[0.08] text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>LICENSE (MIT)</span>
        </button>
      </div>

      {/* Doc Content Display */}
      <div className="p-6 rounded-2xl bg-[#11121B] border border-white/[0.08] font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
        {docs[activeDoc]}
      </div>
    </div>
  );
};
