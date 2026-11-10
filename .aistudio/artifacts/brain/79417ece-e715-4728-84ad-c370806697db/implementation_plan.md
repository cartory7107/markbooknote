# Memora — Open Source AI Conversation Memory Platform

Memora is a privacy-first, local-storage-centered AI conversation memory platform comprising a modern SaaS Web Dashboard, an interactive Extension Simulator, an exportable Chrome Extension (Manifest V3), and a subscription & licensing engine. It automatically captures, organizes, and transfers conversation context across ChatGPT, Google Gemini, and Claude while guaranteeing that private conversations stay securely in the user's browser.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned during Phase 1 clarification:
> - **Extension Experience**: Interactive in-app Chrome Extension Simulator embedded inside the dashboard paired with a one-click Unpacked Extension ZIP generator for real Chrome installation.
> - **Payment Gateway Flow**: Multi-channel checkout modal supporting bKash, Nagad, and Card simulators with authentic transaction state simulation and server-side license verification.
> - **Conversation Data Seed**: Preloaded realistic conversation sessions across ChatGPT (e.g. System Design, Full-Stack Refactoring), Google Gemini (e.g. Multimodal Analysis, Research), and Claude (e.g. Legal Analysis, Creative Writing).

---

## 1. Overview & Core Concept

- **What It Does**: Memora acts as a universal memory layer for generative AI tools. Rather than losing prompt history or manually copying fragments across tabs, Memora detects chat sessions on ChatGPT, Gemini, and Claude, capturing prompts and responses into client-side IndexedDB with zero cloud telemetry. It provides cross-platform context transfer (re-injecting context between ChatGPT and Claude, for example), full-text search, Markdown/JSON export, and optional encrypted public sharing.
- **Target Audience**: Power AI users, software engineers, researchers, and writers who juggle multiple AI models daily and require a unified, private archive of their prompts and insights.
- **Key Value**: 100% privacy-first local storage, zero subscription lock-in (never deleting data upon expiration), and effortless cross-model context handoff.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Visitor & Landing Flow**:
   - Clean obsidian-themed landing page (`#0A0A0E` canvas, deep charcoal card surfaces `#12121A`, hairline indigo/purple borders `#2E284A`).
   - Hero: *"Your AI Conversations. One Memory."* with active subheadline, primary CTA *"Download Extension"*, and secondary CTA *"Explore Memora"*.
   - Feature Bento grid, interactive platform compatibility breakdown (ChatGPT, Gemini, Claude), transparent Free vs. Premium comparison matrix, privacy architecture diagram, and interactive FAQ accordion.
2. **Dashboard & Library Flow**:
   - KPI metrics: Total Conversations, Saved Messages, Extension Status, Current Plan (Free / Premium with 100-conversation threshold gauge).
   - Rich Conversation Library: Instant client-side search, filter by platform (All, ChatGPT, Gemini, Claude), sort by newest/oldest, favorite toggling, title renaming, batch export, and single-click context generation.
   - Conversation Inspector: Full multi-turn dialog view with role indicators (User vs. Assistant), timestamp formatting, code block syntax highlighting, and context export actions.
3. **Context Transfer Studio**:
   - Generate structured handoff prompts formatted specifically for feeding into another AI (e.g., passing a ChatGPT brainstorm session directly into Claude or Gemini).
   - Configurable export formats: Clean Linear Text, Markdown transcript with metadata headers, and JSON structure.
   - Public Share Generator: Explicit user-consented sharing with revocation keys and expiration timers.
4. **Interactive Chrome Extension Simulator & Real MV3 Package**:
   - In-dashboard preview of the actual Extension Popup UI: Auto/Manual toggle, platform detection indicator, quick search, recent clips, and settings.
   - Live Sandbox: Trigger simulated chat capture from ChatGPT, Gemini, or Claude to watch the extension and library update live.
   - "Download Extension Package": Generates an unpacked Chrome Extension (Manifest V3, background service worker, DOM adapters, content scripts, and popup) ready to drag-and-drop into `chrome://extensions`.
5. **Subscription & Payment Simulator Flow**:
   - Clear tier comparison: Free (first 100 conversations saved automatically, lifetime local access) vs. Premium (৳40/month, unlimited automatic capture, advanced context tools).
   - Multi-channel checkout modal with interactive tab selection for **bKash** (PIN/OTP simulation), **Nagad** (USSD/SMS validation simulation), and **Card** (sandbox test numbers).
   - Cryptographic license key issuance, status verification, and device binding.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: Obsidian-dark SaaS productivity workspace with soft ambient electric indigo (`#6366F1`) and violet (`#8B5CF6`) accents.
- **Color Palette**:
  - Neutral Canvas: `#090A0F`
  - Structural Surfaces: `#11121B` with 1px border `rgba(255, 255, 255, 0.07)`
  - Primary Accent: Indigo-to-Violet gradient (`#6366F1` $\rightarrow$ `#8B5CF6`)
  - Accent Text & Badges: Soft lavender `#C7D2FE`
  - Platform Colors:
    - OpenAI / ChatGPT: Emerald `#10A37F`
    - Google Gemini: Royal Blue `#1A73E8`
    - Anthropic Claude: Terracotta Coral `#D97757`
- **Typography**: Clean modern neo-grotesque sans (`Plus Jakarta Sans` / `Outfit` display) paired with clean geometric body text and tabular monospace numerals for timestamps and message counters.
- **Zero-Pill Discipline**: Unboxed metadata text with typographic separators (`·`, `/`); interactive controls use clean segmented states without garish pill badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Local-First IndexedDB Architecture**:
  - *Chosen Approach*: All conversation texts, prompts, and tokens are stored in the client's browser using `IndexedDB`.
  - *Why*: Strict adherence to privacy guarantees. Users never risk leaking confidential corporate code or personal queries to third-party cloud servers.
  - *Alternative Considered*: Syncing everything to Cloudflare D1/Firestore. Rejected because the prompt strictly requires that conversation content remains in the user's browser by default.
- **Decision 2: Dual Chrome Extension Delivery (Simulator + Exportable Unpacked Directory)**:
  - *Chosen Approach*: Provide a fully working extension popup & background simulation directly inside the Web App while also generating a standards-compliant Manifest V3 package (`manifest.json`, `background.ts`, `content-script.ts`, `adapters/`, `popup.html`, `popup.ts`) downloadable as a zip.
  - *Why*: Allows immediate testing and evaluation inside AI Studio without requiring external browser setup, while simultaneously delivering production-grade code for GitHub release.
- **Decision 3: Server-Side License Verification with Safe Offline Grace Period**:
  - *Chosen Approach*: The website simulates an Express/Cloudflare Worker license verification endpoint that issues signed license tokens. When offline, the extension honors verified cached licenses without locking user access.
  - *Why*: Guarantees users can always read and manage their conversations even without an internet connection or if the backend experiences downtime.
- **Decision 4: Transparent 100-Conversation Limit Handling**:
  - *Chosen Approach*: When a Free user reaches 100 conversations, automatic background capture pauses with a polite notification ("Your 100 free conversations have been used. Upgrade to Memora Premium for unlimited automatic saving"), but manual export, search, and reading of existing 100+ conversations remains completely unlocked forever.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             MEMORA PLATFORM                                 │
├──────────────────────────────────────┬──────────────────────────────────────┤
│          WEB DASHBOARD (SPA)         │      CHROME EXTENSION (MANIFEST V3)  │
│                                      │                                      │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │ Navigation & Route Views       │  │  │ Popup Window (React / HTML)    │  │
│  │ - Landing (Hero, FAQ, Pricing) │  │  │ - Auto/Manual Mode Toggle      │  │
│  │ - Dashboard & Metrics          │  │  │ - Active Platform Detector     │  │
│  │ - Conversation Library         │  │  │ - Quick Context Copy           │  │
│  │ - Context Transfer Studio      │  │  │ - License Status Pill          │  │
│  │ - Extension Simulator & Zip    │  │  └───────────────┬────────────────┘  │
│  │ - Account & Billing (bKash)    │  │                  │                   │
│  └────────────────┬───────────────┘  │  ┌───────────────▼────────────────┐  │
│                   │                  │  │ Background Service Worker      │  │
│  ┌────────────────▼───────────────┐  │  │ - Tab state listener           │  │
│  │ Local Client Storage Layer     │  │  │ - Entitlement check cache      │  │
│  │ - IndexedDB ('memora_db')      │  │  │ - Context transfer dispatcher  │  │
│  │   - 'conversations' store      │  │  └───────────────┬────────────────┘  │
│  │   - 'messages' store           │  │                  │                   │
│  │   - 'shares' store             │  │  ┌───────────────▼────────────────┐  │
│  │ - Chrome Storage Sync / Local  │  │  │ Platform DOM Adapters          │  │
│  └────────────────┬───────────────┘  │  │ - ChatGPT Adapter (OpenAI DOM) │  │
│                   │                  │  │ - Gemini Adapter (Google DOM)  │  │
│                   │                  │  │ - Claude Adapter (Anthropic)   │  │
│                   │                  │  └───────────────┬────────────────┘  │
├───────────────────┼─────────────────────────────────────┼───────────────────┤
│                   ▼                                     ▼                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               BACKEND & CLOUDFLARE WORKERS API (Node/TS)              │  │
│  │ - POST /api/licenses/verify     - POST /api/payments/bkash/init       │  │
│  │ - POST /api/licenses/activate   - POST /api/shares/create             │  │
│  │ - POST /api/auth/google-sim     - GET  /api/shares/:id                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Models

```typescript
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
}

export interface Conversation {
  id: string;
  platform: 'chatgpt' | 'gemini' | 'claude';
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  isFavorite: boolean;
  tags?: string[];
  externalUrl?: string;
  messages?: Message[];
}

export interface LicenseRecord {
  id: string;
  userId: string;
  licenseKey: string;
  plan: 'free' | 'premium';
  status: 'active' | 'expired' | 'revoked';
  expiresAt: number | null;
  savedCount: number;
  maxFreeConversations: number; // 100
  deviceCount: number;
}
```

---

## 5. Phased Implementation Roadmap

- **Phase 1: Foundation & Design System**
  - Establish dark-first color variables, Plus Jakarta Sans font loading, and layout primitives.
  - Implement top-bar navigation (wordmark, single-line links, primary CTA).
  - Build the Landing Page with hero, features bento, platform support breakdown, pricing, and FAQ.
- **Phase 2: Storage Engine & Conversation Library**
  - Implement IndexedDB wrapper (`src/services/storage/indexedDb.ts`) with robust transaction handling, search indexes, and schema migration.
  - Seed high-quality initial multi-turn conversations across ChatGPT, Gemini, and Claude.
  - Build searchable, filterable Conversation Library with sorting, tag filtering, renaming, and favoriting.
- **Phase 3: Context Transfer & Sharing Studio**
  - Build context formatter (Linear text, Markdown, JSON, and Cross-Platform Prompt Injector).
  - Implement single-click copy, JSON export/import, and privacy-first consent-driven shareable link generator with revocation support.
- **Phase 4: Chrome Extension (MV3) Architecture & In-App Simulator**
  - Create dedicated `/extension` directory with `manifest.json`, `background.ts`, `content-script.ts`, `popup.html`, `popup.tsx`, and platform adapters (`ChatGPTAdapter`, `GeminiAdapter`, `ClaudeAdapter`) using isolated DOM selectors and MutationObserver deduplication.
  - Build interactive in-app Extension Simulator allowing users to test auto-capture and popup controls directly in the browser.
  - Build Extension ZIP Packager enabling users to download the unpacked extension directory with one click.
- **Phase 5: Licensing, Payment Simulator & Account Settings**
  - Create licensing service with client-side verification protocol.
  - Multi-channel checkout simulator for **bKash**, **Nagad**, and **Card** with verified confirmation callbacks.
  - Account Settings view with license management, extension pairing, data export, and account deletion.
- **Phase 6: Open Source Packaging & Verification**
  - Add root open-source files: `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, and `SECURITY.md`.
  - Run `compile_applet` and `lint_applet` to verify TypeScript compliance with zero errors.
