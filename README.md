# backgammon-ai

React + Vite + TypeScript single-page app. Requires Node 22.

```bash
npm ci
npm run dev     # dev server
npm run build   # type-check + production build to dist/
npm test        # vitest
npm run lint    # eslint
```

Deployed to GitHub Pages at `/backgammon-ai/` on every push to `main`
(see `.github/workflows/deploy.yml`). Enable Pages with source "GitHub Actions"
in the repository settings for the deploy job to succeed.
