# AGENTS

## Project summary
This repository contains a simple Chrome extension that customizes ChatGPT UI. The planned feature is a left sidebar with hierarchical folders, where each folder can store and organize historical chats.

## Goals
- Implement a folder tree in the left sidebar (ChatGPT.com) with expand/collapse, drag-and-drop reordering, and counts.
- Allow each chat to be assigned to exactly one folder (MVP), with future support for multi-folder if needed.
- Store folder structure and chat assignments locally first; plan for sync later.

## Non-goals (for now)
- Cross-browser support beyond Chrome.
- Cloud backend or collaboration features.
- Full ChatGPT redesign; only augment existing sidebar.

## Current structure
- `manifest.json`
- `content/content.js` (injects styles and UI into chatgpt.com)
- `popup/popup.html`

## Development workflow
- Load unpacked extension from the repo root in `chrome://extensions/`.
- After changes: click `Reload` in the Extensions page and refresh `https://chatgpt.com/`.

## Data model (proposed)
- Folders: `{ id, name, parentId|null, order }`
- Chats: `{ id, title, url, folderId|null, createdAt, updatedAt }`
- Storage: `chrome.storage.local` for MVP.

## UI behavior (MVP)
- Sidebar section titled "Folders" above the existing chat list (insert before \"Projects/项目\" or \"Your chats/你的聊天\").
- Search input filters folders and chats.
- Expand/collapse per folder; show counts.
- Drag chat into folder to assign.

## Implementation notes
- Use a single content script to inject the sidebar UI and wire handlers.
- Avoid fragile selectors; prefer stable landmarks and observe for DOM changes.
- Keep injected styles scoped to a root container (e.g., `#cgpt-folders-root`).
- Do not change global ChatGPT colors or theme.

## Testing checklist
- Folder tree renders on `https://chatgpt.com/`.
- Expand/collapse works.
- Drag-and-drop assignment works.
- Data persists after reload.
