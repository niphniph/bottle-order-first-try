export function getSelectedBottleSkinSrc() {
  try {
    const savedObject = localStorage.getItem("selectedBottleSkin");
    if (savedObject) {
      const parsed = JSON.parse(savedObject);
      if (parsed?.src) {
        // remove leading slash if present
        if (parsed.src.startsWith("/")) return parsed.src.slice(1);
        return parsed.src;
      }
      if (typeof parsed === "string") {
        if (parsed.startsWith("/")) return parsed.slice(1);
        return parsed;
      }
    }

    return "skins/skin1.png";
  } catch (error) {
    return "skins/skin1.png";
  }
}

export function setSelectedBottleSkinSrc(src) {
  let id = 'skin1';
  const match = src.match(/skin\d+/);
  if (match) {
    id = match[0];
  }
  // Make sure to store without leading slash
  const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
  localStorage.setItem("selectedBottleSkin", JSON.stringify({ id, src: cleanSrc }));
  window.dispatchEvent(new Event("selectedBottleSkinChanged"));
}
