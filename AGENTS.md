# Working on this template

- Read README.md before changing the game.
- For a new lesson, edit src/data/game.json first. Keep its questions, answers, explanations, metadata, and audience coherent.
- Preserve the Next.js static export and the pure reducer in src/lib/game-state.ts. No account, backend, or external API is required for the base game.
- Reuse the game interface. Do not replace it with a landing page or static screenshot.
- Keep scoring idempotent, answers hidden until revealed, and saves isolated by content version. Update meaningful scenario tests when game rules change.
- Run npm run check before delivery. Publish the complete out/ directory only after it builds.
- Keep this repository generic. Do not commit credentials, environment files, personal data, private infrastructure details, local filesystem paths, or generated build artifacts.
- Document actual limitations. Do not claim cross-device synchronization, browser verification, or successful deployment without evidence.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
