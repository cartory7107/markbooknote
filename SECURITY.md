# Security & Privacy Policy

## Our Security Commitment
Memora is designed from the ground up on a **Zero Ingestion Architecture**. We believe user conversations with AI models should remain private, local, and sovereign.

## Core Guarantees
1. **Local Custody**: 100% of captured conversation messages remain in client-side IndexedDB storage on the user's computer.
2. **No Cloud Mining**: Memora does not store or analyze conversation content on remote servers.
3. **Explicit Public Links**: Public share links are generated only when the user explicitly clicks "Generate Share Link". Each record includes a client-side revocation key.
4. **No Arbitrary Script Injection**: The extension requests host permissions exclusively for `chatgpt.com`, `chat.openai.com`, `gemini.google.com`, and `claude.ai`.

## Reporting a Vulnerability
If you discover a security issue or privacy leak, please email `security@memora.dev`. We respond within 48 hours and work with researchers to coordinate responsible disclosure.
