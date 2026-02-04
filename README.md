# ChatGPT Folders Extension

Version: v1 (first release).

A simple Chrome extension that adds a left sidebar folder tree to organize historical chats on ChatGPT.com.

## Features (v1)
- Folder tree in the left sidebar
- Create folders and subfolders
- Expand/collapse folders
- Drag chats into folders
- Pin folders
- Rename/delete folders
- Change folder color
- Right‑click menu on chats to “Move to folder”
- Remove chat from folder with a hover “x” button
- Local persistence via `chrome.storage.local`

## Project Structure
- `manifest.json` Chrome extension manifest (MV3)
- `content/content.js` Content script injected into `chatgpt.com`
- `popup/popup.html` Simple popup UI

## Local Development
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the project root (this repository folder)
5. Open `https://chatgpt.com/`
6. After edits, click `Reload` in `chrome://extensions/` and refresh the page

## Roadmap
- Accessibility and keyboard support
- Folder search and filtering
- Import/export and sync

## Notes
This project is for personal use and experimentation. No backend is required for the MVP.
