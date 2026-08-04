// Cache for skin assets
const skinAssetCache = {};
const skinAssetCallbacks = {};

function removeOuterWhiteFrame(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const visited = new Uint8Array(w * h);
  const queue = [];

  function isNearWhite(i) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    return a > 0 && r > 210 && g > 210 && b > 210;
  }

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(idx);
  }

  // start flood fill from outer edges only
  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w;
    const y = Math.floor(idx / w);
    const i = idx * 4;

    if (isNearWhite(i)) {
      data[i + 3] = 0; // make transparent

      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
      enqueue(x + 1, y + 1);
      enqueue(x - 1, y - 1);
      enqueue(x + 1, y - 1);
      enqueue(x - 1, y + 1);
    }
  }

  // optional second cleanup: remove thin white fringe touching transparency
  const alphaCopy = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    alphaCopy[i] = data[i * 4 + 3];
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const i = idx * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const nearTransparent =
        alphaCopy[idx - 1] === 0 ||
        alphaCopy[idx + 1] === 0 ||
        alphaCopy[idx - w] === 0 ||
        alphaCopy[idx + w] === 0;

      if (nearTransparent && r > 220 && g > 220 && b > 220) {
        data[i + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function cleanSkinBackgroundPreserveColor(img) {
  const canvas = document.createElement("canvas");
  const w = 512;
  const h = 512;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  function getColorAt(x, y) {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  function dist(a, b) {
    return Math.sqrt(
      (a[0] - b[0]) ** 2 +
      (a[1] - b[1]) ** 2 +
      (a[2] - b[2]) ** 2
    );
  }

  const samples = [];
  const step = 16;

  for (let x = 0; x < w; x += step) {
    samples.push(getColorAt(x, 0));
    samples.push(getColorAt(x, h - 1));
  }

  for (let y = 0; y < h; y += step) {
    samples.push(getColorAt(0, y));
    samples.push(getColorAt(w - 1, y));
  }

  const visited = new Uint8Array(w * h);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(idx);
  }

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }

  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w;
    const y = Math.floor(idx / w);
    const offset = idx * 4;

    const color = [
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    ];

    let isBackground = false;

    if (color[3] < 20) {
      isBackground = true;
    }

    for (const sample of samples) {
      if (dist(color, sample) < 75) {
        isBackground = true;
        break;
      }
    }

    // remove white/gray edge backgrounds only if connected to outside
    if (
      color[0] > 185 &&
      color[1] > 185 &&
      color[2] > 185
    ) {
      isBackground = true;
    }

    if (isBackground) {
      data[offset + 3] = 0;

      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }
  }

  // light edge cleanup
  for (let pass = 0; pass < 2; pass++) {
    const alpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      alpha[i] = data[i * 4 + 3];
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const offset = idx * 4;

        if (alpha[idx] > 0) {
          const hasTransparentNeighbor =
            alpha[idx - 1] === 0 ||
            alpha[idx + 1] === 0 ||
            alpha[idx - w] === 0 ||
            alpha[idx + w] === 0;

          if (hasTransparentNeighbor) {
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];

            if (r > 210 && g > 210 && b > 210) {
              data[offset + 3] = 0;
            }
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function createGameplayMaskFromCleanedCanvas(cleanedCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = cleanedCanvas.width;
  canvas.height = cleanedCanvas.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(cleanedCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let v = 0.299 * r + 0.587 * g + 0.114 * b;
    v = v * 1.2;
    v = Math.max(0, Math.min(255, v));

    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function getSkinAsset(src, callback) {
  if (skinAssetCache[src]) {
    callback(skinAssetCache[src]);
    return;
  }

  if (skinAssetCallbacks[src]) {
    skinAssetCallbacks[src].push(callback);
    return;
  }

  skinAssetCallbacks[src] = [callback];

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    let cleanedOriginalCanvas = cleanSkinBackgroundPreserveColor(img);
    removeOuterWhiteFrame(cleanedOriginalCanvas);
    let gameplayMaskCanvas = createGameplayMaskFromCleanedCanvas(cleanedOriginalCanvas);
    removeOuterWhiteFrame(gameplayMaskCanvas);

    const asset = {
      original: cleanedOriginalCanvas,
      gameplayMask: gameplayMaskCanvas
    };

    skinAssetCache[src] = asset;

    skinAssetCallbacks[src].forEach(cb => cb(asset));
    delete skinAssetCallbacks[src];
  };

  img.onerror = () => {
    console.warn("Skin failed to load:", src);

    img.onerror = null;

    const asset = {
      original: null,
      gameplayMask: null
    };

    skinAssetCache[src] = asset;

    skinAssetCallbacks[src].forEach(cb => cb(asset));
    delete skinAssetCallbacks[src];
  };

  img.src = src;
}

const COLOR_HEX_MAP = {
    'color-red': '#FF0040',
    'color-green': '#00FF2A',
    'color-yellow': '#FFEA00',
    'color-blue': '#0088FF',
    'color-orange': '#FF6A00',
    'color-purple': '#AA00FF',
    'color-cyan': '#00E5FF',
    'color-magenta': '#FF00AA',
    'color-lime': '#A6FF00',
    'color-pink': '#FF4D85',
    'color-teal': '#00F0B5',
    'color-lavender': '#D16BFF',
    'color-brown': '#FFB300',
    'color-beige': '#6BFFB3',
    'color-maroon': '#D90022'
};

function getColorHex(colorClass) {
    if (!colorClass) return '#ffffff';
    const match = colorClass.match(/color-[a-z]+/);
    if (match && COLOR_HEX_MAP[match[0]]) {
        return COLOR_HEX_MAP[match[0]];
    }
    const parts = colorClass.split(' ');
    for (let part of parts) {
        if (COLOR_HEX_MAP[part]) return COLOR_HEX_MAP[part];
        if (COLOR_HEX_MAP[`color-${part}`]) return COLOR_HEX_MAP[`color-${part}`];
    }
    return '#ffffff';
}

function drawBottleSilhouette(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(27, 2);
    ctx.lineTo(43, 2);
    ctx.arcTo(45, 2, 45, 4, 2);
    ctx.lineTo(45, 20);
    ctx.bezierCurveTo(50, 22, 60, 30, 65, 35);
    ctx.lineTo(65, 87);
    ctx.arcTo(65, 93, 59, 93, 6);
    ctx.lineTo(11, 93);
    ctx.arcTo(5, 93, 5, 87, 6);
    ctx.lineTo(5, 35);
    ctx.bezierCurveTo(10, 30, 20, 22, 25, 20);
    ctx.lineTo(25, 4);
    ctx.arcTo(25, 2, 27, 2, 2);
    ctx.closePath();
}

function renderBottleToCanvas(canvas, skinImageElement, colorHex, isHidden) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    if (isHidden) {
        ctx.save();
        drawBottleSilhouette(ctx, w, h);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
        return;
    }
    
    if (skinImageElement) {
        // 1. Draw the processed skin image directly onto the transparent canvas
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(skinImageElement, 0, 0, w, h);
        
        // 2. Fill the silhouette exactly with the gameplay color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colorHex || '#ffffff';
        ctx.fillRect(0, 0, w, h);
        
        // 3. Multiply grayscale skin shading and highlights on top
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(skinImageElement, 0, 0, w, h);
        
        // 4. Mask back to the skin's original alpha to crop any blended edge bleeding
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(skinImageElement, 0, 0, w, h);
        
        // 5. Restore default composite operation
        ctx.globalCompositeOperation = 'source-over';
    } else {
        ctx.save();
        drawBottleSilhouette(ctx, w, h);
        ctx.clip();
        
        // Fallback: fill classic bottle with solid color
        ctx.fillStyle = colorHex || '#ffffff';
        ctx.fillRect(0, 0, w, h);
        
        ctx.restore();
        
        // Classic glass reflection details and shape outline (only for classic mode)
        ctx.save();
        drawBottleSilhouette(ctx, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(12, 35);
        ctx.quadraticCurveTo(12, 60, 12, 85);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
}

function createHiddenBottleDOM({ isSelected, onClick }) {
    const button = document.createElement('button');
    button.className = `hidden-bottle-only ${isSelected ? 'selected' : ''}`;
    if (onClick) {
        button.onclick = onClick;
    }
    button.setAttribute('aria-label', 'Hidden bottle');
    button.setAttribute('type', 'button');
    
    button.innerHTML = `
      <svg
        class="hidden-bottle-svg"
        viewBox="0 0 100 130"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          class="hidden-bottle-outline"
          d="M40 8 H60 V34 L82 52 V118 Q82 124 76 124 H24 Q18 124 18 118 V52 L40 34 Z"
        />
        <text
          x="50"
          y="78"
          text-anchor="middle"
          dominant-baseline="middle"
          class="hidden-bottle-question"
        >
          ?
        </text>
      </svg>
    `;
    return button;
}

export function BottleImage({ color, hidden, isSelected = false, className = '' }) {
    if (hidden) {
        return createHiddenBottleDOM({ isSelected });
    }
    const savedSkin = localStorage.getItem("selectedBottleSkin");
    let selectedSkin = null;
    if (savedSkin) {
        try {
            selectedSkin = JSON.parse(savedSkin);
        } catch (e) {
            console.error("Error parsing selectedBottleSkin in BottleImage:", e);
        }
    }
    const bottleSrc = selectedSkin?.src || "/skins/skin1.png";
    console.log("GAME IS USING SELECTED SKIN:", bottleSrc);

    const bottleSlot = document.createElement('div');
    bottleSlot.className = `bottle-slot bottle skin-image ${color || ''} ${className}`;
    if (isSelected) {
        bottleSlot.classList.add('selected');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 70;
    canvas.height = 95;
    canvas.className = 'bottle-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    bottleSlot.appendChild(canvas);

    const colorHex = getColorHex(color);

    // Check processed cache first for instant synchronous rendering
    const cachedAsset = skinAssetCache[bottleSrc];
    if (cachedAsset && cachedAsset.gameplayMask) {
        renderBottleToCanvas(canvas, cachedAsset.gameplayMask, colorHex, hidden);
        removeOuterWhiteFrame(canvas);
    } else {
        getSkinAsset(bottleSrc, (asset) => {
            if (asset && asset.gameplayMask) {
                renderBottleToCanvas(canvas, asset.gameplayMask, colorHex, hidden);
                removeOuterWhiteFrame(canvas);
            }
        });
    }

    // Dummy element for swap compatibility
    if (color) {
        const liquid = document.createElement('div');
        liquid.className = `bottle-liquid liquid ${color}`;
        liquid.style.display = 'none';
        bottleSlot.appendChild(liquid);

        // Observe class changes to trigger redrawing
        const observer = new MutationObserver(() => {
            const match = liquid.className.match(/color-[a-z]+/);
            const newColor = match ? match[0] : '';
            
            // Remove any existing color- class
            bottleSlot.className = bottleSlot.className.replace(/color-[a-z]+/g, '').trim();
            if (newColor) {
                bottleSlot.classList.add(newColor);
            }

            const newColorHex = getColorHex(liquid.className);
            const cachedAsset = skinAssetCache[bottleSrc];
            if (cachedAsset && cachedAsset.gameplayMask) {
                renderBottleToCanvas(canvas, cachedAsset.gameplayMask, newColorHex, hidden);
                removeOuterWhiteFrame(canvas);
            } else {
                getSkinAsset(bottleSrc, (asset) => {
                    if (asset && asset.gameplayMask) {
                        renderBottleToCanvas(canvas, asset.gameplayMask, newColorHex, hidden);
                        removeOuterWhiteFrame(canvas);
                    }
                });
            }
        });
        observer.observe(liquid, { attributes: true });
    }

    if (hidden) {
        bottleSlot.classList.add('hidden-bottle');
        const mystery = document.createElement('div');
        mystery.className = 'mystery-mark';
        mystery.textContent = '?';
        bottleSlot.appendChild(mystery);
    }

    return bottleSlot;
}
