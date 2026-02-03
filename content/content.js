(() => {
  const styleId = "hello-chatgpt-dark-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    :root, body {
      background-color: #1e1e1e !important;
      color: #ffffff !important;
    }
    #thread, #thread * {
      color: #ffffff !important;
    }
    textarea, input, [contenteditable="true"] {
      color: #ffffff !important;
    }
    * {
      background-color: transparent !important;
    }
  `;
  document.documentElement.appendChild(style);
})();
