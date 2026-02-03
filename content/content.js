(() => {
  const styleId = "hello-chatgpt-dark-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* Intentionally no global color changes. */
  `;
  document.documentElement.appendChild(style);
})();
