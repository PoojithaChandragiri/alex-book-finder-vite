# Alex's Book Finder (Vite + React + Tailwind)

## Quick start (VS Code)

Prerequisites:
- Node.js >= 16 (check with `node -v`)
- npm (comes with Node) or pnpm/yarn

Steps:
1. Unzip the project and open the folder in VS Code.
2. Open the terminal in VS Code (``Ctrl+` ``) and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open your browser at http://localhost:5173 (Vite default) — the app will load.

## Files
- `src/App.jsx` – main app component (the Book Finder UI).
- `src/main.jsx` – React entry.
- `src/index.css` – Tailwind directives.
- `index.html` – app shell.
- `package.json` – scripts + deps.

## Notes
- This uses the Open Library Search API (no keys needed): https://openlibrary.org/search.json
- Favorites are stored in `localStorage`.

## Troubleshooting
- If `npm run dev` fails, ensure Node version >= 16 and try deleting `node_modules` then `npm install` again.
- If the port 5173 is in use, Vite will prompt to use a different port.
