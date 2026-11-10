/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Conversation, Message } from '../types';

export const INITIAL_SEED_CONVERSATIONS: { conversation: Conversation; messages: Message[] }[] = [
  {
    conversation: {
      id: 'convo-chatgpt-001',
      platform: 'chatgpt',
      title: 'Distributed Cache Architecture & Redis Invalidation',
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      updatedAt: Date.now() - 1000 * 60 * 60 * 46,
      messageCount: 4,
      isFavorite: true,
      tags: ['System Design', 'Redis', 'Caching'],
      externalUrl: 'https://chatgpt.com/c/6789a12b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
      summary: 'Architectural evaluation of cache-aside vs write-through patterns for a high-traffic microservices cluster with multi-region invalidation.'
    },
    messages: [
      {
        id: 'msg-gpt-1',
        conversationId: 'convo-chatgpt-001',
        role: 'user',
        content: 'We are designing a distributed caching layer for our e-commerce checkout service. We expect 15,000 read queries/sec and 800 writes/sec during flash sales. Should we adopt Cache-Aside with Redis Cluster or a Write-Through cache via an edge gateway? How do we handle cache stampedes when inventory drops to zero?',
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        model: 'GPT-4o'
      },
      {
        id: 'msg-gpt-2',
        conversationId: 'convo-chatgpt-001',
        role: 'assistant',
        content: `For high-throughput flash sales (15,000 QPS reads / 800 QPS writes), **Cache-Aside with Redis Cluster combined with probabilistic early expiration (XFetch algorithm)** is significantly superior to write-through gateway proxies.

### Recommended Pattern:
1. **Cache-Aside with Single-Flight Locking (Mutex)**:
   When inventory cache misses occur, avoid having 15,000 concurrent requests query Postgres simultaneously. Use Redis \`SET key token NX EX 5\` to let exactly ONE worker recalculate inventory while other workers wait or serve a stale cached value with \`stale-while-revalidate\` semantics.

2. **Atomic Inventory Decrements in Redis**:
   Never fetch $\\rightarrow$ calculate $\\rightarrow$ update. Use a Lua script to atomically evaluate:
\`\`\`lua
local current = redis.call('GET', KEYS[1])
if not current or tonumber(current) < tonumber(ARGV[1]) then
    return -1
end
return redis.call('DECRBY', KEYS[1], ARGV[1])
\`\`\`

3. **Event-Driven Write Invalidation**:
   Publish CDC (Change Data Capture) via Debezium or Kafka. When checkout completes in PostgreSQL, workers emit an invalidation event to clear regional Redis keys within <25ms.`,
        timestamp: Date.now() - 1000 * 60 * 60 * 47,
        model: 'GPT-4o'
      },
      {
        id: 'msg-gpt-3',
        conversationId: 'convo-chatgpt-001',
        role: 'user',
        content: 'How does the XFetch algorithm mathematically decide when to refresh the cache before it expires?',
        timestamp: Date.now() - 1000 * 60 * 60 * 46.5,
        model: 'GPT-4o'
      },
      {
        id: 'msg-gpt-4',
        conversationId: 'convo-chatgpt-001',
        role: 'assistant',
        content: `The **XFetch (Optimal Probabilistic Cache Stampede Prevention)** algorithm evaluates the following inequality:

$$\\Delta - \\beta \\cdot \\ln(\\text{rand}()) > \\text{TTL}$$

Where:
- $\\Delta$: The computation time (seconds) it takes to re-fetch and serialize the data.
- $\\beta$: Aggressiveness constant (usually $\\beta > 0$, typically $1.0$).
- $\\text{rand}()$: Uniform random value $\\in (0, 1]$.
- $\\text{TTL}$: Remaining time-to-live before hard expiration.

As $\\text{TTL} \\to 0$, $-\\beta \\ln(\\text{rand}())$ becomes more likely to exceed the remaining time, causing an early asynchronous refresh by whichever reader arrives first, completely eliminating the sudden spike when the key disappears.`,
        timestamp: Date.now() - 1000 * 60 * 60 * 46,
        model: 'GPT-4o'
      }
    ]
  },
  {
    conversation: {
      id: 'convo-gemini-002',
      platform: 'gemini',
      title: 'Multimodal Video Reasoning Pipeline with Gemini 2.0 Pro',
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      updatedAt: Date.now() - 1000 * 60 * 60 * 22,
      messageCount: 3,
      isFavorite: true,
      tags: ['Multimodal', 'Gemini API', 'Video Analysis'],
      externalUrl: 'https://gemini.google.com/app/19a82b7c0d',
      summary: 'Design of high-efficiency chunked video ingestion with timestamped spatial entity extraction using Gemini 2.0 Pro multimodal tokens.'
    },
    messages: [
      {
        id: 'msg-gem-1',
        conversationId: 'convo-gemini-002',
        role: 'user',
        content: 'We need to analyze 45-minute technical webinar recordings to extract slide timestamps, speaker transitions, and code snippets shown on screen. How can we optimize token count and accuracy with the Google Gen AI SDK?',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        model: 'Gemini 2.0 Pro'
      },
      {
        id: 'msg-gem-2',
        conversationId: 'convo-gemini-002',
        role: 'assistant',
        content: `Gemini 2.0 Pro natively ingests video at 1 frame per second (fps) by default, requiring approximately 258 tokens per second of video. For a 45-minute recording ($2,700$ seconds), that consumes $\\approx 696,000$ tokens, well within Gemini's 2,000,000 token context window.

### Recommended Pipeline:
1. **Pre-processing with Media Pipe or FFmpeg**:
   Instead of uploading raw 4K footage, transcode to 720p at 1fps or keyframe-only (I-frames) to minimize upload bandwidth.

2. **Structured JSON Output Schema**:
\`\`\`typescript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});
const response = await ai.models.generateContent({
  model: 'gemini-2.0-pro-exp-02-05',
  contents: [
    { text: 'Extract all presentation topic milestones and code snippets shown.' },
    { fileData: { fileUri: videoUploadedUri, mimeType: 'video/mp4' } }
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        chapters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.STRING },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              extractedCode: { type: Type.STRING, nullable: true }
            },
            required: ['timestamp', 'title', 'summary']
          }
        }
      }
    }
  }
});
\`\`\``,
        timestamp: Date.now() - 1000 * 60 * 60 * 23,
        model: 'Gemini 2.0 Pro'
      },
      {
        id: 'msg-gem-3',
        conversationId: 'convo-gemini-002',
        role: 'user',
        content: 'That matches our needs. What about audio speech-to-text alignment alongside the visual frames?',
        timestamp: Date.now() - 1000 * 60 * 60 * 22,
        model: 'Gemini 2.0 Pro'
      }
    ]
  },
  {
    conversation: {
      id: 'convo-claude-003',
      platform: 'claude',
      title: 'Enterprise SaaS Privacy & Compliance Review (GDPR/HIPAA)',
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
      updatedAt: Date.now() - 1000 * 60 * 60 * 11,
      messageCount: 2,
      isFavorite: false,
      tags: ['Security', 'GDPR', 'Compliance'],
      externalUrl: 'https://claude.ai/chat/5b7f1a3e-8c9d-4e2a-1b0c',
      summary: 'Data protection impact assessment for a browser extension handling user prompts and conversational metadata.'
    },
    messages: [
      {
        id: 'msg-cld-1',
        conversationId: 'convo-claude-003',
        role: 'user',
        content: 'We are building an open-source browser extension called Memora that records AI chat histories. We want to ensure that corporate customers can use it safely without triggering GDPR Article 28 data processor obligations. What architectural guarantees must we provide?',
        timestamp: Date.now() - 1000 * 60 * 60 * 12,
        model: 'Claude 3.7 Sonnet'
      },
      {
        id: 'msg-cld-2',
        conversationId: 'convo-claude-003',
        role: 'assistant',
        content: `To ensure Memora remains outside the scope of **GDPR Article 28 (Data Processor requirements)** and avoids triggering enterprise data sovereignty violations, your architecture should adopt a **Pure Client-Side Zero-Knowledge Boundary**:

### 1. Zero Ingestion Principle
- **No Cloud Storage for Conversations**: Store 100% of captured conversation text, prompts, and tokens in browser \`IndexedDB\`. The server must never receive or process chat bodies.
- **Data Subject Control**: Because data never leaves the client's device, the user retains absolute custody (GDPR Article 17 "Right to be Forgotten" is instant via \`indexedDB.deleteDatabase\`).

### 2. Telemetry Isolation
- No third-party analytical scripts (e.g. Google Analytics, Mixpanel, Sentry) running within the extension's content script context, where prompt text could inadvertently leak through event payloads or breadcrumbs.

### 3. Clear Consent for Share Links
- If a user deliberately generates a public shareable URL, present an unskippable modal confirming:
  - The specific conversation is encrypted and published to a public endpoint.
  - A unique revocation key is stored locally so the user can wipe the server record at any time.

By keeping conversation content strictly on-device, enterprise security officers can certify Memora without executing a separate Data Processing Addendum (DPA).`,
        timestamp: Date.now() - 1000 * 60 * 60 * 11,
        model: 'Claude 3.7 Sonnet'
      }
    ]
  },
  {
    conversation: {
      id: 'convo-chatgpt-004',
      platform: 'chatgpt',
      title: 'React 19 Server Actions vs Optimistic UI Updates',
      createdAt: Date.now() - 1000 * 60 * 60 * 72,
      updatedAt: Date.now() - 1000 * 60 * 60 * 70,
      messageCount: 2,
      isFavorite: false,
      tags: ['React', 'Frontend', 'TypeScript'],
      externalUrl: 'https://chatgpt.com/c/331a44c-99bb-4f81-91ea',
      summary: 'Practical patterns using useActionState and useOptimistic for instant button responses with automatic rollback on server error.'
    },
    messages: [
      {
        id: 'msg-gpt-5',
        conversationId: 'convo-chatgpt-004',
        role: 'user',
        content: 'How do useActionState and useOptimistic work together in React 19 to handle like/favorite buttons with instant feedback?',
        timestamp: Date.now() - 1000 * 60 * 60 * 72,
        model: 'GPT-4o'
      },
      {
        id: 'msg-gpt-6',
        conversationId: 'convo-chatgpt-004',
        role: 'assistant',
        content: `In React 19, \`useOptimistic\` pairs with \`useActionState\` or standard transitions to provide instantaneous feedback while the async action executes in the background.

\`\`\`tsx
import { useOptimistic, useTransition, useState } from 'react';

export function FavoriteButton({ convoId, initialFavorited }: { convoId: string; initialFavorited: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [favorited, setFavorited] = useState(initialFavorited);
  
  const [optimisticFavorited, setOptimisticFavorited] = useOptimistic(
    favorited,
    (current, nextValue: boolean) => nextValue
  );

  async function handleToggle() {
    const nextState = !favorited;
    startTransition(async () => {
      setOptimisticFavorited(nextState);
      try {
        await api.toggleFavorite(convoId, nextState);
        setFavorited(nextState);
      } catch (err) {
        // Automatically reverts if an unhandled error rolls back
        console.error('Failed to update favorite', err);
      }
    });
  }

  return (
    <button onClick={handleToggle} disabled={isPending} className="p-2 text-slate-300 hover:text-amber-400">
      <Star className={optimisticFavorited ? "fill-amber-400 text-amber-400" : "text-slate-500"} />
    </button>
  );
}
\`\`\``,
        timestamp: Date.now() - 1000 * 60 * 60 * 70,
        model: 'GPT-4o'
      }
    ]
  }
];
