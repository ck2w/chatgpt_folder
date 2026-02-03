(() => {
  const styleId = "hello-chatgpt-dark-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    :root, body {
      background-color: #000000 !important;
      color: #ffffff !important;
    }
    * {
      background-color: transparent !important;
    }
  `;
  document.documentElement.appendChild(style);
})();
