export function getSelectedBottleSkinSrc() {
  try {
    const savedObject = localStorage.getItem("selectedBottleSkin");
    if (savedObject) {
      const parsed = JSON.parse(savedObject);
      if (parsed?.src) return parsed.src;
      if (typeof parsed === "string") return parsed;
    }

    return "/skins/skin1.png";
  } catch (error) {
    return "/skins/skin1.png";
  }
}

export function setSelectedBottleSkinSrc(src) {
  let id = 'skin1';
  const match = src.match(/skin\d+/);
  if (match) {
    id = match[0];
  }
  localStorage.setItem("selectedBottleSkin", JSON.stringify({ id, src }));
  window.dispatchEvent(new Event("selectedBottleSkinChanged"));
}
