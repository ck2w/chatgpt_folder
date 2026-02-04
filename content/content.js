(() => {
  const ROOT_CLASS = "gv-folder-container";
  const STYLE_ID = "cgpt-gv-folder-style";
  const STORAGE_KEY = "cgptFolderDataV1";
  const MAX_LEVEL = 6;
  const COLOR_OPTIONS = [
    { id: "blue", label: "Blue", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.4)" },
    { id: "green", label: "Green", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.4)" },
    { id: "purple", label: "Purple", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.4)" },
    { id: "orange", label: "Orange", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.4)" },
    { id: "gray", label: "Gray", bg: "rgba(148, 163, 184, 0.18)", border: "rgba(148, 163, 184, 0.5)" },
  ];

  const state = {
    folders: [],
    folderContents: {},
    expanded: new Set(),
    chatIndex: new Map(),
    rootEl: null,
    listEl: null,
    menuEl: null,
    dataLoaded: false,
    menuOpenedAt: 0,
    lastMenuChatId: null,
    lastMenuAnchorRect: null,
  };

  const init = () => {
    injectStyles();
    ensureMounted();
    loadData().then(() => {
      state.dataLoaded = true;
      syncChatsFromDOM();
      render();
      observeSidebar();
    });
    wireStorageListener();
    wireChatMenuIntegration();
  };

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&display=swap');

      :root {
        --folder-bg: #ffffff;
        --folder-text: #1f2937;
        --folder-border: #e5e7eb;
        --folder-hover-bg: #f3f4f6;
        --folder-active-bg: #e0e7ff;
        --folder-icon-color: #6b7280;
        --folder-menu-bg: #ffffff;
        --folder-menu-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        --folder-dragover-bg: #dbeafe;
        --folder-dragover-border: #3b82f6;
        --folder-selected-accent: #34d399;
        --folder-selected-glow: rgba(16, 185, 129, 0.12);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --folder-bg: #1f2937;
          --folder-text: #e5e7eb;
          --folder-border: #374151;
          --folder-hover-bg: #374151;
          --folder-active-bg: #1e40af;
          --folder-icon-color: #9ca3af;
          --folder-menu-bg: #1f2937;
          --folder-menu-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          --folder-dragover-bg: #1e3a8a;
          --folder-dragover-border: #60a5fa;
          --folder-selected-accent: #6ee7b7;
          --folder-selected-glow: rgba(16, 185, 129, 0.10);
        }
      }

      .google-symbols {
        font-family: 'Material Symbols Outlined', sans-serif;
        font-weight: 400;
        font-style: normal;
        font-size: 20px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-flex;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
      }

      .${ROOT_CLASS} {
        margin-bottom: 16px;
        padding: 8px 8px 8px 12px;
        margin-left: 0;
      }

      .${ROOT_CLASS} .gv-folder-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px 8px 0;
        margin-bottom: 8px;
        border-radius: 8px;
        transition: background-color 0.2s, border 0.2s;
      }

      .${ROOT_CLASS} .gv-folder-header .title {
        margin: 0;
        padding-left: 16px;
        opacity: 0.7;
        color: var(--folder-text);
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .${ROOT_CLASS} .gv-folder-add-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--folder-icon-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, color 0.2s;
      }

      .${ROOT_CLASS} .gv-folder-add-btn:hover {
        background-color: var(--folder-hover-bg);
        color: var(--folder-text);
      }

      .${ROOT_CLASS} .gv-folder-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-height: 40px;
        padding: 4px;
        border-radius: 8px;
        transition: background-color 0.2s, border 0.2s;
      }

      .${ROOT_CLASS} .gv-folder-item {
        display: flex;
        flex-direction: column;
      }

      .${ROOT_CLASS} .gv-folder-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
        position: relative;
      }

      .${ROOT_CLASS} .gv-folder-item-header:hover {
        background-color: var(--folder-hover-bg);
      }

      .${ROOT_CLASS} .gv-folder-item-header.gv-folder-dragover {
        background-color: var(--folder-dragover-bg);
        border: 2px dashed var(--folder-dragover-border);
      }

      .${ROOT_CLASS} .gv-folder-expand-btn {
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: var(--folder-icon-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        flex-shrink: 0;
      }

      .${ROOT_CLASS} .gv-folder-icon {
        font-size: 20px;
        color: var(--folder-icon-color);
        flex-shrink: 0;
      }

      .${ROOT_CLASS} .gv-folder-name {
        flex: 1;
        font-size: 14px;
        color: var(--folder-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        user-select: none;
      }

      .${ROOT_CLASS} .gv-folder-actions-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--folder-icon-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.2s, background-color 0.2s;
        flex-shrink: 0;
      }

      .${ROOT_CLASS} .gv-folder-item-header:hover .gv-folder-actions-btn {
        opacity: 1;
      }

      .${ROOT_CLASS} .gv-folder-actions-btn:hover {
        background-color: var(--folder-hover-bg);
      }

      .${ROOT_CLASS} .gv-folder-pin-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--folder-icon-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.2s, background-color 0.2s;
        flex-shrink: 0;
        margin-left: auto;
      }

      .${ROOT_CLASS} .gv-folder-item-header:hover .gv-folder-pin-btn {
        opacity: 1;
      }

      .${ROOT_CLASS} .gv-folder-pin-btn:hover {
        background-color: var(--folder-hover-bg);
      }

      .${ROOT_CLASS} .gv-folder-pin-btn .google-symbols {
        font-size: 18px;
      }

      .${ROOT_CLASS} .gv-folder-item[data-pinned="true"] .gv-folder-pin-btn {
        opacity: 1;
        color: #ef4444;
      }

      .${ROOT_CLASS} .gv-folder-item[data-pinned="true"] .gv-folder-pin-btn:hover {
        background-color: rgba(239, 68, 68, 0.12);
      }

      .${ROOT_CLASS} .gv-folder-item[data-color] .gv-folder-item-header {
        border: 1px solid transparent;
      }
      .${ROOT_CLASS} .gv-folder-item[data-color="blue"] .gv-folder-item-header {
        background-color: rgba(59, 130, 246, 0.12);
        border-color: rgba(59, 130, 246, 0.4);
      }
      .${ROOT_CLASS} .gv-folder-item[data-color="green"] .gv-folder-item-header {
        background-color: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.4);
      }
      .${ROOT_CLASS} .gv-folder-item[data-color="purple"] .gv-folder-item-header {
        background-color: rgba(139, 92, 246, 0.12);
        border-color: rgba(139, 92, 246, 0.4);
      }
      .${ROOT_CLASS} .gv-folder-item[data-color="orange"] .gv-folder-item-header {
        background-color: rgba(249, 115, 22, 0.12);
        border-color: rgba(249, 115, 22, 0.4);
      }
      .${ROOT_CLASS} .gv-folder-item[data-color="gray"] .gv-folder-item-header {
        background-color: rgba(148, 163, 184, 0.18);
        border-color: rgba(148, 163, 184, 0.5);
      }

      .${ROOT_CLASS} .gv-folder-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 2px;
      }

      .${ROOT_CLASS} .gv-folder-conversation {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.15s ease, opacity 0.2s;
        position: relative;
      }

      .${ROOT_CLASS} .gv-folder-conversation:hover {
        background-color: var(--folder-hover-bg);
      }

      .${ROOT_CLASS} .gv-conversation-remove-btn {
        margin-left: auto;
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: var(--folder-icon-color);
        cursor: pointer;
        opacity: 0;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s, background-color 0.2s;
      }

      .${ROOT_CLASS} .gv-folder-conversation:hover .gv-conversation-remove-btn {
        opacity: 1;
      }

      .${ROOT_CLASS} .gv-conversation-remove-btn:hover {
        background-color: var(--folder-hover-bg);
        color: #ef4444;
      }

      .${ROOT_CLASS} .gv-folder-menu {
        position: fixed;
        background: var(--folder-menu-bg);
        color: var(--folder-text);
        border: 1px solid var(--folder-border);
        border-radius: 10px;
        box-shadow: var(--folder-menu-shadow);
        padding: 6px;
        z-index: 9999;
        min-width: 180px;
      }

      .${ROOT_CLASS} .gv-folder-menu-item {
        display: block;
        width: 100%;
        border: none;
        background: transparent;
        color: inherit;
        text-align: left;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
      }

      .${ROOT_CLASS} .gv-folder-menu-item:hover {
        background-color: var(--folder-hover-bg);
      }

      .${ROOT_CLASS} .gv-folder-empty {
        padding: 6px 12px;
        font-size: 12px;
        opacity: 0.7;
      }
    `;
    document.documentElement.appendChild(style);
  };

  const ensureMounted = () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      mountUI();
      if (document.querySelector(`.${ROOT_CLASS}`) || attempts > 60) {
        window.clearInterval(timer);
      }
    }, 500);
  };

  const mountUI = () => {
    if (document.querySelector(`.${ROOT_CLASS}`)) return;
    const sidebar = findSidebarNav();
    if (!sidebar) return;

    const container = document.createElement("div");
    container.className = ROOT_CLASS;

    const header = document.createElement("div");
    header.className = "gv-folder-header";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "Folders";

    const addBtn = document.createElement("button");
    addBtn.className = "gv-folder-add-btn";
    addBtn.type = "button";
    addBtn.innerHTML = '<span class="google-symbols">add</span>';
    addBtn.addEventListener("click", () => {
      promptCreateFolder(null);
    });

    header.appendChild(title);
    header.appendChild(addBtn);

    const list = document.createElement("div");
    list.className = "gv-folder-list";

    container.appendChild(header);
    container.appendChild(list);

    const insertBefore = findInsertBeforeNode(sidebar);
    if (insertBefore && insertBefore.parentElement) {
      insertBefore.parentElement.insertBefore(container, insertBefore);
    } else {
      sidebar.appendChild(container);
    }

    state.rootEl = container;
    state.listEl = list;
    state.rootEl.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const actionsBtn = target.closest(".gv-folder-actions-btn");
        if (actionsBtn) {
          event.preventDefault();
          event.stopPropagation();
          const folderItem = actionsBtn.closest(".gv-folder-item");
          const folderId = folderItem?.dataset.folderId;
          if (folderId) {
            openFolderMenu(event.clientX, event.clientY, folderId);
          }
        }
      },
      true
    );
    if (state.dataLoaded) {
      render();
    }
  };

  const findSidebarNav = () => {
    const sidebarRoot = document.querySelector("#stage-slideover-sidebar");
    if (sidebarRoot) {
      const nav = sidebarRoot.querySelector('nav[aria-label="Chat history"]');
      if (nav) return nav;
    }
    const nav = document.querySelector('nav[aria-label="Chat history"]');
    if (nav) return nav;
    return document.querySelector("aside") || document.querySelector("nav");
  };

  const findInsertBeforeNode = (sidebar) => {
    const labels = ["Projects", "项目", "Your chats", "你的聊天"];
    const nodes = Array.from(sidebar.querySelectorAll("div, span, h2, h3"));
    const labelMatch = nodes.find((node) => labels.includes((node.textContent || "").trim()));
    if (labelMatch) return labelMatch;

    const firstChat = sidebar.querySelector('a[data-testid^="history-item-"], a[href*="/c/"]');
    if (firstChat) return firstChat;

    const menuAside = sidebar.querySelector("aside");
    if (menuAside && menuAside.parentElement) {
      return menuAside.nextElementSibling;
    }

    return null;
  };

  const loadData = () =>
    new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (data) => {
        const stored = data[STORAGE_KEY] || {};
        const rawFolders = Array.isArray(stored.folders) ? stored.folders : [];
        state.folders = rawFolders.map((folder) => ({
          pinned: false,
          color: null,
          ...folder,
        }));
        state.folderContents = stored.folderContents || {};
        resolve();
      });
    });

  const saveData = () => {
    chrome.storage.local.set({
      [STORAGE_KEY]: {
        folders: state.folders,
        folderContents: state.folderContents,
      },
    });
  };

  const wireStorageListener = () => {
    if (!chrome.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (!changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue || {};
      state.folders = Array.isArray(next.folders) ? next.folders : [];
      state.folderContents = next.folderContents || {};
      render();
    });
  };

  const syncChatsFromDOM = () => {
    const sidebar = findSidebarNav();
    if (!sidebar) return;
    const links = Array.from(sidebar.querySelectorAll("a[href]"));
    const chatLinks = links.filter((link) => {
      const href = link.getAttribute("href") || "";
      return href.includes("/c/");
    });

    chatLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const url = new URL(href, window.location.origin);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("c");
      if (idx === -1 || !parts[idx + 1]) return;
      const chatId = parts[idx + 1];
      const title = (link.textContent || "").trim() || "Untitled";
      state.chatIndex.set(chatId, { id: chatId, title, url: url.href });
      wireChatLink(link, chatId);
    });
  };

  const wireChatLink = (link, chatId) => {
    if (link.dataset.cgptDraggable === "true") return;
    link.dataset.cgptDraggable = "true";
    link.setAttribute("draggable", "true");
    link.addEventListener("dragstart", (event) => {
      const payload = JSON.stringify({ type: "chat", id: chatId });
      event.dataTransfer.setData("application/json", payload);
      event.dataTransfer.setData("text/plain", payload);
      event.dataTransfer.effectAllowed = "move";
    });
  };

  const observeSidebar = () => {
    const sidebar = findSidebarNav();
    if (!sidebar) return;
    const observer = new MutationObserver(() => {
      if (!document.querySelector(`.${ROOT_CLASS}`)) {
        mountUI();
      }
      syncChatsFromDOM();
    });
    observer.observe(sidebar, { childList: true, subtree: true });
  };

  const wireChatMenuIntegration = () => {
    document.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const menuButton = target.closest(
          'button[data-testid^="history-item-"][aria-haspopup="menu"]'
        );
        if (!menuButton) return;
        const chatLink = menuButton.closest("a[href*=\"/c/\"]");
        if (!chatLink) return;
        const href = chatLink.getAttribute("href") || "";
        const url = new URL(href, window.location.origin);
        const parts = url.pathname.split("/").filter(Boolean);
        const idx = parts.indexOf("c");
        if (idx === -1 || !parts[idx + 1]) return;
        state.lastMenuChatId = parts[idx + 1];
        state.lastMenuAnchorRect = menuButton.getBoundingClientRect();
      },
      true
    );

    const menuObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          const menu = node.matches('[role="menu"]')
            ? node
            : node.querySelector?.('[role="menu"]');
          if (!menu) return;
          injectMoveToFolderMenuItem(menu);
        });
      });
    });
    menuObserver.observe(document.body, { childList: true, subtree: true });
  };

  const injectMoveToFolderMenuItem = (menu) => {
    if (!state.lastMenuChatId) return;
    if (menu.querySelector('[data-cgpt-move-to-folder="true"]')) return;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"], button'));
    const hasAnchorText = items.some((item) => {
      const text = (item.textContent || "").trim();
      return text === "Share" || text === "Archive" || text === "Delete";
    });
    if (!hasAnchorText) return;

    const item = document.createElement("button");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.dataset.cgptMoveToFolder = "true";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.style.width = "100%";
    item.style.padding = "8px 12px";
    item.style.border = "none";
    item.style.background = "transparent";
    item.style.cursor = "pointer";
    item.style.textAlign = "left";
    item.style.fontSize = "14px";

    const icon = document.createElement("span");
    icon.className = "google-symbols";
    icon.textContent = "folder";
    icon.style.fontSize = "18px";

    const label = document.createElement("span");
    label.textContent = "Move to folder";

    item.appendChild(icon);
    item.appendChild(label);
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = state.lastMenuAnchorRect;
      const x = rect ? rect.right + 8 : event.clientX;
      const y = rect ? rect.top : event.clientY;
      openMoveToFolderMenu(x, y, state.lastMenuChatId);
    });

    menu.appendChild(item);
  };

  const promptCreateFolder = (parentId) => {
    const name = window.prompt("Folder name?");
    if (!name) return;
    const folder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      parentId: parentId || null,
      order: Date.now(),
      pinned: false,
      color: null,
    };
    state.folders.push(folder);
    saveData();
    render();
  };

  const renameFolder = (folderId) => {
    const folder = state.folders.find((item) => item.id === folderId);
    if (!folder) return;
    const name = window.prompt("Rename folder", folder.name);
    if (!name) return;
    folder.name = name.trim();
    saveData();
    render();
  };

  const deleteFolder = (folderId) => {
    const folder = state.folders.find((item) => item.id === folderId);
    if (!folder) return;
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;
    const toDelete = new Set();
    collectFolderIds(folderId, toDelete);
    state.folders = state.folders.filter((item) => !toDelete.has(item.id));
    toDelete.forEach((id) => {
      delete state.folderContents[id];
    });
    saveData();
    render();
  };

  const togglePinFolder = (folderId) => {
    const folder = state.folders.find((item) => item.id === folderId);
    if (!folder) return;
    folder.pinned = !folder.pinned;
    saveData();
    render();
  };

  const changeFolderColor = (folderId, colorId) => {
    const folder = state.folders.find((item) => item.id === folderId);
    if (!folder) return;
    folder.color = colorId || null;
    saveData();
    render();
  };

  const collectFolderIds = (folderId, set) => {
    set.add(folderId);
    state.folders
      .filter((item) => item.parentId === folderId)
      .forEach((child) => collectFolderIds(child.id, set));
  };

  const assignChatToFolder = (chatId, folderId) => {
    const list = state.folderContents[folderId] || [];
    if (!list.includes(chatId)) {
      state.folderContents[folderId] = [...list, chatId];
      saveData();
      render();
    }
  };

  const moveChatToFolder = (chatId, folderId) => {
    Object.keys(state.folderContents).forEach((key) => {
      state.folderContents[key] = (state.folderContents[key] || []).filter(
        (id) => id !== chatId
      );
    });
    if (folderId) {
      const list = state.folderContents[folderId] || [];
      state.folderContents[folderId] = [...list, chatId];
    }
    saveData();
    render();
  };

  const removeChatFromFolder = (chatId, folderId) => {
    const list = state.folderContents[folderId] || [];
    const next = list.filter((id) => id !== chatId);
    state.folderContents[folderId] = next;
    saveData();
    render();
  };

  const readDragPayload = (event) => {
    const data =
      event.dataTransfer?.getData("application/json") ||
      event.dataTransfer?.getData("text/plain");
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const render = () => {
    if (!state.listEl) return;
    state.listEl.innerHTML = "";

    const byParent = new Map();
    state.folders.forEach((folder) => {
      const key = folder.parentId || "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(folder);
    });

    byParent.forEach((items) => {
      items.sort((a, b) => {
        const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        if (pinDiff !== 0) return pinDiff;
        return a.order - b.order || a.name.localeCompare(b.name);
      });
    });

    const renderLevel = (parentId, level, container) => {
      if (level > MAX_LEVEL) return;
      const key = parentId || "root";
      const folders = byParent.get(key) || [];

      folders.forEach((folder) => {
        const item = document.createElement("div");
        item.className = "gv-folder-item";
        item.dataset.folderId = folder.id;
        item.dataset.pinned = folder.pinned ? "true" : "false";
        if (folder.color) item.dataset.color = folder.color;

        const header = document.createElement("div");
        header.className = "gv-folder-item-header";
        header.style.paddingLeft = `${level * 16 + 12}px`;

        header.addEventListener("dragover", (event) => {
          const payload = readDragPayload(event);
          if (!payload || payload.type !== "chat") return;
          event.preventDefault();
          header.classList.add("gv-folder-dragover");
        });

        header.addEventListener("dragleave", () => {
          header.classList.remove("gv-folder-dragover");
        });

        header.addEventListener("drop", (event) => {
          const payload = readDragPayload(event);
          if (!payload || payload.type !== "chat") return;
          event.preventDefault();
          header.classList.remove("gv-folder-dragover");
          assignChatToFolder(payload.id, folder.id);
        });

        const expandBtn = document.createElement("button");
        expandBtn.className = "gv-folder-expand-btn";
        const hasChildren = (byParent.get(folder.id) || []).length > 0;
        const isExpanded = state.expanded.has(folder.id);
        expandBtn.innerHTML = `<span class="google-symbols">${
          hasChildren ? (isExpanded ? "expand_more" : "chevron_right") : "chevron_right"
        }</span>`;
        expandBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          if (state.expanded.has(folder.id)) {
            state.expanded.delete(folder.id);
          } else {
            state.expanded.add(folder.id);
          }
          render();
        });

        const icon = document.createElement("span");
        icon.className = "gv-folder-icon google-symbols";
        icon.textContent = "folder";

        const name = document.createElement("div");
        name.className = "gv-folder-name";
        name.textContent = folder.name;

        const pin = document.createElement("button");
        pin.className = "gv-folder-pin-btn";
        pin.type = "button";
        pin.innerHTML = '<span class="google-symbols">push_pin</span>';
        pin.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          togglePinFolder(folder.id);
        });

        const actions = document.createElement("button");
        actions.className = "gv-folder-actions-btn";
        actions.type = "button";
        actions.innerHTML = '<span class="google-symbols">more_vert</span>';
        actions.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openFolderMenu(event.clientX, event.clientY, folder.id);
        });

        header.appendChild(expandBtn);
        header.appendChild(icon);
        header.appendChild(name);
        header.appendChild(pin);
        header.appendChild(actions);

        item.appendChild(header);

        if (isExpanded) {
          const content = document.createElement("div");
          content.className = "gv-folder-content";

          const childFolders = byParent.get(folder.id) || [];
          if (childFolders.length) {
            renderLevel(folder.id, level + 1, content);
          }

          const chats = (state.folderContents[folder.id] || [])
            .map((id) => state.chatIndex.get(id))
            .filter(Boolean);

          chats.forEach((chat) => {
            const row = document.createElement("div");
            row.className = "gv-folder-conversation";
            row.style.paddingLeft = `${level * 16 + 28}px`;
            const title = document.createElement("span");
            title.textContent = chat.title;
            title.style.flex = "1";

            const remove = document.createElement("button");
            remove.className = "gv-conversation-remove-btn";
            remove.type = "button";
            remove.innerHTML = '<span class="google-symbols">close</span>';
            remove.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              removeChatFromFolder(chat.id, folder.id);
            });

            row.appendChild(title);
            row.appendChild(remove);
            row.addEventListener("click", () => {
              window.location.href = chat.url;
            });
            content.appendChild(row);
          });

          if (!childFolders.length && !chats.length) {
            const empty = document.createElement("div");
            empty.className = "gv-folder-empty";
            empty.textContent = "Drop chats here";
            content.appendChild(empty);
          }

          item.appendChild(content);
        }

        container.appendChild(item);
      });
    };

    if (!state.folders.length) {
      const empty = document.createElement("div");
      empty.className = "gv-folder-empty";
      empty.textContent = "No folders yet.";
      state.listEl.appendChild(empty);
      return;
    }

    renderLevel(null, 0, state.listEl);
  };

  const openFolderMenu = (x, y, folderId) => {
    closeMenu();
    if (!state.rootEl) return;
    const menu = document.createElement("div");
    menu.className = "gv-folder-menu";
    applyMenuStyles(menu);

    const pin = createMenuItem("Pin folder", () => togglePinFolder(folderId));
    const addSub = createMenuItem("Create subfolder", () => promptCreateFolder(folderId));
    const rename = createMenuItem("Rename", () => renameFolder(folderId));
    const color = createMenuItem("Change Color", () => openColorMenu(x, y, folderId));
    const remove = createMenuItem("Delete", () => deleteFolder(folderId));

    menu.appendChild(pin);
    menu.appendChild(addSub);
    menu.appendChild(rename);
    menu.appendChild(color);
    menu.appendChild(remove);

    document.body.appendChild(menu);
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;

    state.menuEl = menu;
    state.menuOpenedAt = Date.now();
    window.setTimeout(() => {
      document.addEventListener("click", closeMenu, { once: true, capture: true });
    }, 0);
  };

  const createMenuItem = (label, handler) => {
    const item = document.createElement("button");
    item.className = "gv-folder-menu-item";
    item.type = "button";
    item.textContent = label;
    item.style.display = "block";
    item.style.width = "100%";
    item.style.border = "none";
    item.style.background = "transparent";
    item.style.color = "inherit";
    item.style.textAlign = "left";
    item.style.padding = "8px 10px";
    item.style.borderRadius = "8px";
    item.style.cursor = "pointer";
    item.style.fontSize = "13px";
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      handler();
      closeMenu();
    });
    item.addEventListener("mouseenter", () => {
      item.style.background = "var(--folder-hover-bg)";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "transparent";
    });
    return item;
  };

  const openColorMenu = (x, y, folderId) => {
    closeMenu();
    const menu = document.createElement("div");
    menu.className = "gv-folder-menu";
    applyMenuStyles(menu);

    COLOR_OPTIONS.forEach((option) => {
      const item = createMenuItem(option.label, () => changeFolderColor(folderId, option.id));
      item.innerHTML = `<span style=\"display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:${option.border}\"></span>${option.label}`;
      menu.appendChild(item);
    });

    const clear = createMenuItem("Clear Color", () => changeFolderColor(folderId, null));
    menu.appendChild(clear);

    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;

    state.menuEl = menu;
    state.menuOpenedAt = Date.now();
    window.setTimeout(() => {
      document.addEventListener("click", closeMenu, { once: true, capture: true });
    }, 0);
  };

  const openMoveToFolderMenu = (x, y, chatId) => {
    closeMenu();
    const menu = document.createElement("div");
    menu.className = "gv-folder-menu";
    applyMenuStyles(menu);

    if (!state.folders.length) {
      const empty = document.createElement("div");
      empty.className = "gv-folder-empty";
      empty.textContent = "No folders yet.";
      menu.appendChild(empty);
    } else {
      state.folders
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((folder) => {
          const item = createMenuItem(folder.name, () => moveChatToFolder(chatId, folder.id));
          menu.appendChild(item);
        });
      const unfiled = createMenuItem("Unfiled", () => moveChatToFolder(chatId, null));
      menu.appendChild(unfiled);
    }

    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;

    state.menuEl = menu;
    state.menuOpenedAt = Date.now();
    window.setTimeout(() => {
      document.addEventListener("click", closeMenu, { once: true, capture: true });
    }, 0);
  };

  const applyMenuStyles = (menu) => {
    menu.style.position = "fixed";
    menu.style.zIndex = "9999";
    menu.style.background = "var(--folder-menu-bg)";
    menu.style.color = "var(--folder-text)";
    menu.style.border = "1px solid var(--folder-border)";
    menu.style.borderRadius = "10px";
    menu.style.boxShadow = "var(--folder-menu-shadow)";
    menu.style.padding = "6px";
    menu.style.minWidth = "180px";
  };

  const closeMenu = () => {
    if (Date.now() - state.menuOpenedAt < 150) return;
    if (state.menuEl && state.menuEl.parentElement) {
      state.menuEl.parentElement.removeChild(state.menuEl);
    }
    state.menuEl = null;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
