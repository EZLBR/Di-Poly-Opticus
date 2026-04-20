# Opticus React

React migration workspace for the Opticus project.

## Current scope

- Marketplace migrated to React
- Filters, favorites, session badge, theme toggle, and saved-design modal migrated
- React route for the creator added
- The creator screen now runs inside the React app shell while still using the legacy `creator.js` engine
- Import page still points to the legacy HTML file one directory above

## Run

1. Install dependencies with `npm install`
2. Start dev server with `npm run dev`

## Next migration target

- Replace the legacy `creator.js` bridge with native React state and a dedicated Three.js viewer component
