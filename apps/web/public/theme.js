// Dark is the house style; apply a saved choice before first paint to avoid a flash.
// Kept as a file (not inline) so the Content-Security-Policy can stay script-src 'self'.
document.documentElement.dataset.theme = "dark";
try {
  if (localStorage.getItem("dbj-theme") === "light") document.documentElement.dataset.theme = "light";
} catch (e) {}
