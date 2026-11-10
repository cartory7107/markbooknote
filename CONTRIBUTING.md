# Contributing to Memora

Thank you for your interest in contributing to Memora!

## Code of Conduct
We are committed to providing a friendly, safe, and welcoming environment for everyone, regardless of background or identity.

## Pull Request Guidelines
1. Fork the repo and create your branch from `main`.
2. If you are adding or updating a platform adapter (e.g. for ChatGPT, Gemini, or Claude), isolate all DOM selectors within `extension/adapters/`.
3. Ensure that all mutation observers implement debounced event handlers (minimum 1,200ms) to accommodate live token streaming.
4. Run `npm run build` and ensure TypeScript compiles with zero errors before submitting.
5. Provide a clear explanation of UI changes and testing steps in your pull request description.
