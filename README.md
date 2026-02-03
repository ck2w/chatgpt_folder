# ChatGPT Folders Extension

A simple Chrome extension that customizes ChatGPT and adds a left sidebar folder tree to organize historical chats.

## Features (Planned)
- Hierarchical folders with expand/collapse
- Chat counts per folder
- Drag-and-drop to move chats into folders
- Search folders and chats
- Local persistence via Chrome storage

## Current Status
MVP scaffolding exists. The extension injects styles and a popup; the folder UI will be implemented next.

## Project Structure
- `manifest.json` Chrome extension manifest (MV3)
- `content/content.js` Content script injected into `chatgpt.com`
- `popup/popup.html` Simple popup UI

## Local Development
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the project root: `/Users/kenchen/Projects/chatgpt_folder`
5. Open `https://chatgpt.com/`
6. After edits, click `Reload` in `chrome://extensions/` and refresh the page

## Roadmap
- Build folder tree UI in the sidebar
- Persist folders and assignments
- DnD interactions and empty states
- Accessibility and keyboard support

## Notes
This project is for personal use and experimentation. No backend is required for the MVP.

