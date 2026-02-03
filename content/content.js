(() => {
  const ROOT_ID = "cgpt-folders-root";
  const STYLE_ID = "cgpt-folders-style";
  const STORAGE_KEYS = {
    folders: "cgptFolders",
    chats: "cgptChats",
  };

  const state = {
    folders: [],
    chats: [],
    expanded: new Set(),
    search: "",
    rootEl: null,
    treeEl: null,
  };

  const init = () => {
    injectStyles();
    ensureMounted();
    loadData().then(() => {
      render();
      syncChatsFromDOM();
      observeSidebar();
    });
    wireStorageListener();
  };

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        font-family: inherit;
        margin: 12px 8px 8px;
        padding: 8px;
        border: 1px solid rgba(120, 120, 120, 0.25);
        border-radius: 8px;
        background: rgba(127, 127, 127, 0.06);
      }
      #${ROOT_ID} .cgpt-folders-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      #${ROOT_ID} .cgpt-folders-title {
        font-weight: 600;
        font-size: 14px;
      }
      #${ROOT_ID} .cgpt-folders-add {
        border: 1px solid rgba(120, 120, 120, 0.4);
        background: transparent;
        border-radius: 6px;
        width: 22px;
        height: 22px;
        cursor: pointer;
      }
      #${ROOT_ID} .cgpt-folders-search input {
        width: 100%;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid rgba(120, 120, 120, 0.35);
        background: transparent;
      }
      #${ROOT_ID} .cgpt-folders-tree {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #${ROOT_ID} .cgpt-folder-row {
        display: grid;
        grid-template-columns: 18px 1fr auto auto;
        gap: 6px;
        align-items: center;
        padding: 4px 6px;
        border-radius: 6px;
      }
      #${ROOT_ID} .cgpt-folder-row[data-drop="true"] {
        outline: 1px dashed rgba(120, 120, 120, 0.7);
      }
      #${ROOT_ID} .cgpt-folder-toggle {
        border: none;
        background: transparent;
        cursor: pointer;
        width: 18px;
        height: 18px;
      }
      #${ROOT_ID} .cgpt-folder-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${ROOT_ID} .cgpt-folder-count {
        font-size: 12px;
        opacity: 0.7;
      }
      #${ROOT_ID} .cgpt-folder-add-child {
        border: 1px solid rgba(120, 120, 120, 0.35);
        background: transparent;
        border-radius: 5px;
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      #${ROOT_ID} .cgpt-folder-children {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #${ROOT_ID} .cgpt-chat-row {
        padding: 3px 6px 3px 24px;
        font-size: 13px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #${ROOT_ID} .cgpt-chat-row[data-drop="true"] {
        outline: 1px dashed rgba(120, 120, 120, 0.7);
      }
      #${ROOT_ID} .cgpt-empty {
        font-size: 12px;
        opacity: 0.6;
        padding: 6px;
      }
    `;
    document.documentElement.appendChild(style);
  };

  const mountUI = () => {
    if (document.getElementById(ROOT_ID)) return;
    const sidebar = findSidebar();
    if (!sidebar) return;

    const root = document.createElement("section");
    root.id = ROOT_ID;

    const header = document.createElement("div");
    header.className = "cgpt-folders-header";

    const title = document.createElement("div");
    title.className = "cgpt-folders-title";
    title.textContent = "Folders";

    const addButton = document.createElement("button");
    addButton.className = "cgpt-folders-add";
    addButton.type = "button";
    addButton.textContent = "+";
    addButton.addEventListener("click", () => addFolder(null));

    header.appendChild(title);
    header.appendChild(addButton);

    const searchWrap = document.createElement("div");
    searchWrap.className = "cgpt-folders-search";
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search folders...";
    search.addEventListener("input", (event) => {
      state.search = event.target.value.trim().toLowerCase();
      render();
    });
    searchWrap.appendChild(search);

    const tree = document.createElement("div");
    tree.className = "cgpt-folders-tree";
    tree.addEventListener("dragover", (event) => {
      const payload = readDragPayload(event);
      if (!payload) return;
      if (payload.type === "folder") {
        event.preventDefault();
      }
    });
    tree.addEventListener("drop", (event) => {
      const payload = readDragPayload(event);
      if (!payload) return;
      if (payload.type === "folder") {
        event.preventDefault();
        moveFolderToRoot(payload.id);
      }
      if (payload.type === "chat") {
        event.preventDefault();
        assignChatToFolder(payload.id, null);
      }
    });

    root.appendChild(header);
    root.appendChild(searchWrap);
    root.appendChild(tree);

    const insertBefore = findInsertBeforeNode(sidebar);
    if (insertBefore && insertBefore.parentElement === sidebar) {
      sidebar.insertBefore(root, insertBefore);
    } else if (insertBefore && insertBefore.parentElement) {
      insertBefore.parentElement.insertBefore(root, insertBefore);
    } else {
      sidebar.prepend(root);
    }

    state.rootEl = root;
    state.treeEl = tree;
  };

  const ensureMounted = () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      mountUI();
      if (document.getElementById(ROOT_ID) || attempts > 60) {
        window.clearInterval(timer);
      }
    }, 500);
  };

  const findSidebar = () => {
    const existing = document.querySelector(`#${ROOT_ID}`);
    if (existing) return existing.parentElement;

    const explicit = document.querySelector(
      "[data-testid=\"sidebar\"], nav[aria-label], nav[role=\"navigation\"], aside"
    );
    if (explicit) return explicit;

    const labelMatch = findSidebarByLabel();
    if (labelMatch) return labelMatch;

    const aside = document.querySelector("aside");
    if (aside) return aside;

    const navCandidates = Array.from(document.querySelectorAll("nav"));
    const nav = navCandidates.find((node) => {
      const text = node.textContent || "";
      return (
        text.includes("New chat") ||
        text.includes("Chats") ||
        text.includes("新建聊天") ||
        text.includes("聊天")
      );
    });
    if (nav) return nav;

    return document.body;
  };

  const findSidebarByLabel = () => {
    const labels = ["New chat", "新 Chat", "新建聊天"];
    const nodes = Array.from(document.querySelectorAll("a, button, div, span"));
    const match = nodes.find((node) => {
      const text = (node.textContent || "").trim();
      return labels.includes(text);
    });
    if (!match) return null;
    let el = match;
    for (let i = 0; i < 6 && el; i += 1) {
      const role = el.getAttribute ? el.getAttribute("role") : null;
      const testId = el.getAttribute ? el.getAttribute("data-testid") : null;
      if (
        el.tagName === "NAV" ||
        el.tagName === "ASIDE" ||
        role === "navigation" ||
        testId === "sidebar"
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return match.closest("nav, aside") || match.parentElement;
  };

  const findInsertBeforeNode = (sidebar) => {
    const labels = ["Projects", "项目", "Your chats", "你的聊天", "Your Chats"];
    const nodes = Array.from(sidebar.querySelectorAll("div, span, h2, h3"));
    const match = nodes.find((node) => {
      const text = (node.textContent || "").trim();
      return labels.includes(text);
    });
    return match || null;
  };

  const loadData = () =>
    new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.folders, STORAGE_KEYS.chats], (data) => {
        state.folders = Array.isArray(data[STORAGE_KEYS.folders])
          ? data[STORAGE_KEYS.folders]
          : [];
        state.chats = Array.isArray(data[STORAGE_KEYS.chats])
          ? data[STORAGE_KEYS.chats]
          : [];
        resolve();
      });
    });

  const saveFolders = () => {
    chrome.storage.local.set({
      [STORAGE_KEYS.folders]: state.folders,
    });
  };

  const saveChats = () => {
    chrome.storage.local.set({
      [STORAGE_KEYS.chats]: state.chats,
    });
  };

  const wireStorageListener = () => {
    if (!chrome.storage || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.folders]) {
        state.folders = changes[STORAGE_KEYS.folders].newValue || [];
        render();
      }
      if (changes[STORAGE_KEYS.chats]) {
        state.chats = changes[STORAGE_KEYS.chats].newValue || [];
        render();
      }
    });
  };

  const addFolder = (parentId) => {
    const name = window.prompt("Folder name?");
    if (!name) return;
    const folder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      parentId: parentId || null,
      order: Date.now(),
    };
    state.folders.push(folder);
    saveFolders();
    render();
  };

  const moveFolderToRoot = (folderId) => {
    const folder = state.folders.find((item) => item.id === folderId);
    if (!folder) return;
    folder.parentId = null;
    folder.order = Date.now();
    saveFolders();
    render();
  };

  const reorderFolder = (dragId, targetId) => {
    const dragFolder = state.folders.find((folder) => folder.id === dragId);
    const targetFolder = state.folders.find((folder) => folder.id === targetId);
    if (!dragFolder || !targetFolder) return;
    if (dragFolder.parentId !== targetFolder.parentId) return;

    const siblings = state.folders
      .filter((folder) => folder.parentId === dragFolder.parentId)
      .sort((a, b) => a.order - b.order);

    const dragIndex = siblings.findIndex((folder) => folder.id === dragId);
    const targetIndex = siblings.findIndex((folder) => folder.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    siblings.splice(dragIndex, 1);
    const insertIndex = targetIndex >= siblings.length ? siblings.length : targetIndex + 1;
    siblings.splice(insertIndex, 0, dragFolder);

    siblings.forEach((folder, index) => {
      folder.order = index;
    });

    saveFolders();
    render();
  };

  const assignChatToFolder = (chatId, folderId) => {
    const chat = state.chats.find((item) => item.id === chatId);
    if (!chat) return;
    chat.folderId = folderId || null;
    chat.updatedAt = Date.now();
    saveChats();
    render();
  };

  const syncChatsFromDOM = () => {
    const sidebar = findSidebar();
    if (!sidebar) return;

    const links = Array.from(sidebar.querySelectorAll("a[href]"));
    const chatLinks = links.filter((link) => {
      const href = link.getAttribute("href") || "";
      return href.includes("/c/");
    });

    let changed = false;
    const byId = new Map(state.chats.map((chat) => [chat.id, chat]));

    chatLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const url = new URL(href, window.location.origin);
      const parts = url.pathname.split("/").filter(Boolean);
      const idIndex = parts.indexOf("c");
      if (idIndex === -1 || !parts[idIndex + 1]) return;
      const chatId = parts[idIndex + 1];
      const title = (link.textContent || "").trim() || "Untitled";
      const existing = byId.get(chatId);
      if (existing) {
        if (existing.title !== title || existing.url !== url.href) {
          existing.title = title;
          existing.url = url.href;
          existing.updatedAt = Date.now();
          changed = true;
        }
      } else {
        state.chats.push({
          id: chatId,
          title,
          url: url.href,
          folderId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        changed = true;
      }

      wireChatLink(link, chatId);
    });

    if (changed) {
      saveChats();
      render();
    }
  };

  const wireChatLink = (link, chatId) => {
    if (link.dataset.cgptDraggable === "true") return;
    link.dataset.cgptDraggable = "true";
    link.setAttribute("draggable", "true");
    link.addEventListener("dragstart", (event) => {
      const payload = JSON.stringify({ type: "chat", id: chatId });
      event.dataTransfer.setData("application/json", payload);
      event.dataTransfer.effectAllowed = "move";
    });
  };

  const observeSidebar = () => {
    const sidebar = findSidebar();
    if (!sidebar) return;
    const observer = new MutationObserver(() => {
      if (!document.getElementById(ROOT_ID)) {
        mountUI();
      }
      syncChatsFromDOM();
    });
    observer.observe(sidebar, { childList: true, subtree: true });
  };

  const readDragPayload = (event) => {
    if (!event.dataTransfer) return null;
    const data = event.dataTransfer.getData("application/json");
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  };

  const render = () => {
    if (!state.treeEl) return;
    state.treeEl.innerHTML = "";

    const foldersByParent = new Map();
    state.folders.forEach((folder) => {
      const key = folder.parentId || "root";
      if (!foldersByParent.has(key)) foldersByParent.set(key, []);
      foldersByParent.get(key).push(folder);
    });

    foldersByParent.forEach((items) => {
      items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    });

    const chatsByFolder = new Map();
    state.chats.forEach((chat) => {
      const key = chat.folderId || "root";
      if (!chatsByFolder.has(key)) chatsByFolder.set(key, []);
      chatsByFolder.get(key).push(chat);
    });

    chatsByFolder.forEach((items) => {
      items.sort((a, b) => b.updatedAt - a.updatedAt);
    });

    const query = state.search;
    const visibleFolderIds = new Set();

    const folderMatches = (folderId) => {
      const folder = state.folders.find((item) => item.id === folderId);
      if (!folder) return false;
      const nameMatch = folder.name.toLowerCase().includes(query);
      if (!query) return true;
      if (nameMatch) return true;
      const chats = chatsByFolder.get(folderId) || [];
      const chatMatch = chats.some((chat) => chat.title.toLowerCase().includes(query));
      if (chatMatch) return true;
      const children = foldersByParent.get(folderId) || [];
      return children.some((child) => folderMatches(child.id));
    };

    state.folders.forEach((folder) => {
      if (folderMatches(folder.id)) visibleFolderIds.add(folder.id);
    });

    const renderFolderLevel = (parentId, depth, container) => {
      const key = parentId || "root";
      const folders = foldersByParent.get(key) || [];

      folders.forEach((folder) => {
        if (query && !visibleFolderIds.has(folder.id)) return;
        const row = document.createElement("div");
        row.className = "cgpt-folder-row";
        row.style.marginLeft = `${depth * 12}px`;
        row.dataset.folderId = folder.id;
        row.setAttribute("draggable", "true");
        row.addEventListener("dragstart", (event) => {
          const payload = JSON.stringify({ type: "folder", id: folder.id });
          event.dataTransfer.setData("application/json", payload);
          event.dataTransfer.effectAllowed = "move";
        });

        row.addEventListener("dragover", (event) => {
          const payload = readDragPayload(event);
          if (!payload) return;
          if (payload.type === "chat" || payload.type === "folder") {
            event.preventDefault();
            row.dataset.drop = "true";
          }
        });

        row.addEventListener("dragleave", () => {
          row.dataset.drop = "false";
        });

        row.addEventListener("drop", (event) => {
          const payload = readDragPayload(event);
          if (!payload) return;
          event.preventDefault();
          row.dataset.drop = "false";
          if (payload.type === "chat") {
            assignChatToFolder(payload.id, folder.id);
            return;
          }
          if (payload.type === "folder" && payload.id !== folder.id) {
            reorderFolder(payload.id, folder.id);
          }
        });

        const toggle = document.createElement("button");
        toggle.className = "cgpt-folder-toggle";
        toggle.type = "button";
        const hasChildren = (foldersByParent.get(folder.id) || []).length > 0;
        const isExpanded = state.expanded.has(folder.id) || query;
        toggle.textContent = hasChildren ? (isExpanded ? "▾" : "▸") : "";
        toggle.addEventListener("click", () => {
          if (state.expanded.has(folder.id)) {
            state.expanded.delete(folder.id);
          } else {
            state.expanded.add(folder.id);
          }
          render();
        });

        const name = document.createElement("div");
        name.className = "cgpt-folder-name";
        name.textContent = folder.name;

        const chats = chatsByFolder.get(folder.id) || [];
        const count = document.createElement("div");
        count.className = "cgpt-folder-count";
        count.textContent = `${chats.length}`;

        const addChild = document.createElement("button");
        addChild.className = "cgpt-folder-add-child";
        addChild.type = "button";
        addChild.textContent = "+";
        addChild.addEventListener("click", (event) => {
          event.stopPropagation();
          addFolder(folder.id);
        });

        row.appendChild(toggle);
        row.appendChild(name);
        row.appendChild(count);
        row.appendChild(addChild);

        container.appendChild(row);

        if (isExpanded) {
          const childrenWrap = document.createElement("div");
          childrenWrap.className = "cgpt-folder-children";

          const childFolders = foldersByParent.get(folder.id) || [];
          if (childFolders.length) {
            renderFolderLevel(folder.id, depth + 1, childrenWrap);
          }

          const visibleChats = query
            ? chats.filter((chat) => chat.title.toLowerCase().includes(query))
            : chats;

          visibleChats.forEach((chat) => {
            const chatRow = document.createElement("div");
            chatRow.className = "cgpt-chat-row";
            chatRow.textContent = chat.title;
            chatRow.style.paddingLeft = `${24 + depth * 12}px`;
            chatRow.setAttribute("draggable", "true");
            chatRow.addEventListener("dragstart", (event) => {
              const payload = JSON.stringify({ type: "chat", id: chat.id });
              event.dataTransfer.setData("application/json", payload);
              event.dataTransfer.effectAllowed = "move";
            });
            chatRow.addEventListener("click", () => {
              window.location.href = chat.url;
            });
            childrenWrap.appendChild(chatRow);
          });

          if (!childFolders.length && !visibleChats.length) {
            const empty = document.createElement("div");
            empty.className = "cgpt-empty";
            empty.textContent = "Drop chats here";
            childrenWrap.appendChild(empty);
          }

          container.appendChild(childrenWrap);
        }
      });
    };

    const rootFolders = foldersByParent.get("root") || [];
    if (!rootFolders.length) {
      const empty = document.createElement("div");
      empty.className = "cgpt-empty";
      empty.textContent = "No folders yet. Click + to add one.";
      state.treeEl.appendChild(empty);
      return;
    }

    renderFolderLevel(null, 0, state.treeEl);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
