// --- Energy System Constants & Storage Logic ---
const MAX_ENERGY = 50;
const MOVE_COST = 2.5;
const LOSE_COST = 5;
const AD_REWARD = 5;

function getEnergy() {
    const saved = localStorage.getItem("playerEnergy");
    if (saved === null) return MAX_ENERGY;
    const num = Number(saved);
    if (isNaN(num) || num < 0 || num > MAX_ENERGY) {
        localStorage.setItem("playerEnergy", String(MAX_ENERGY));
        return MAX_ENERGY;
    }
    return Math.max(0, Math.min(MAX_ENERGY, num));
}

function setEnergy(value) {
    const safeValue = Math.max(0, Math.min(MAX_ENERGY, Number(value)));
    localStorage.setItem("playerEnergy", String(safeValue));
    updateEnergyUI();
}

function spendEnergy(amount) {
    const current = getEnergy();
    if (current < amount) {
        showEnergyModal();
        return false;
    }
    setEnergy(current - amount);
    return true;
}

function rewardEnergyFromAd() {
    const current = getEnergy();
    setEnergy(current + AD_REWARD);
}

function updateEnergyUI() {
    const current = getEnergy();
    // format to remove trailing .0 if it's an integer, else show .5
    const formatted = current % 1 === 0 ? current.toFixed(0) : current.toFixed(1);
    
    // Header value
    const headerVal = document.getElementById("header-energy-value");
    if (headerVal) headerVal.textContent = `${formatted}/${MAX_ENERGY}`;
    
    // Menu values
    const menuVal = document.getElementById("menu-energy-display");
    if (menuVal) menuVal.textContent = `${formatted} / ${MAX_ENERGY}`;
    
    const classicVal = document.getElementById("classic-energy-display");
    if (classicVal) classicVal.textContent = `${formatted} / ${MAX_ENERGY}`;
}

// Simulated ad states and progress bar animation
let adTimeout = null;
let adInterval = null;

function watchAdForEnergy() {
    if (getEnergy() >= MAX_ENERGY) {
        alert("Energy is already full!");
        return;
    }
    showAdOverlay();
}

function watchAdFromModal() {
    closeEnergyModal();
    watchAdForEnergy();
}

function showAdOverlay() {
    const adOverlay = document.getElementById("ad-overlay");
    const adBar = document.getElementById("ad-progress-bar");
    const timerText = document.getElementById("ad-timer-text");
    if (!adOverlay || !adBar) return;
    
    adOverlay.classList.remove("hidden");
    
    // Reset bar width and transition
    adBar.style.transition = "none";
    adBar.style.width = "0%";
    
    let secondsLeft = 3;
    if (timerText) timerText.textContent = `Ad completes in ${secondsLeft} seconds`;
    
    // Force browser reflow to apply style reset before starting transition
    adBar.getBoundingClientRect();
    
    // Set transition parameters for exactly 3 seconds
    adBar.style.transition = "width 3s linear";
    adBar.style.width = "100%";
    
    adInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft >= 0 && timerText) {
            timerText.textContent = `Ad completes in ${secondsLeft} seconds`;
        }
    }, 1000);
    
    adTimeout = setTimeout(() => {
        hideAdOverlay();
        rewardEnergyFromAd();
        if (typeof sound !== "undefined" && typeof sound.playWin === "function") {
            sound.playWin();
        }
        alert("+5 Energy added!");
    }, 3000);
}

function hideAdOverlay() {
    const adOverlay = document.getElementById("ad-overlay");
    if (adOverlay) adOverlay.classList.add("hidden");
    clearInterval(adInterval);
    clearTimeout(adTimeout);
}

function showEnergyModal() {
    const modal = document.getElementById("out-of-energy-modal");
    if (modal) modal.classList.remove("hidden");
}

function closeEnergyModal() {
    const modal = document.getElementById("out-of-energy-modal");
    if (modal) modal.classList.add("hidden");
}

const COLORS = [
    'color-red', 'color-green', 'color-yellow', 'color-blue', 'color-orange', 
    'color-purple', 'color-cyan', 'color-magenta', 'color-lime', 'color-pink', 
    'color-teal', 'color-lavender', 'color-brown', 'color-beige', 'color-maroon'
];
const MAX_BOTTLES = 15;

// --- Core Logic Refactor for Color Uniqueness ---
function getUniqueCupColorsForShelf(cupCount, rngFunc) {
    if (cupCount > COLORS.length) {
        console.warn(`Requested ${cupCount} cups but only ${COLORS.length} colors available. Capping to max.`);
        cupCount = COLORS.length;
    }

    let availableColors = [...COLORS];
    // Shuffle the full available colors palette using Fisher-Yates
    for (let i = availableColors.length - 1; i > 0; i--) {
        const j = Math.floor(rngFunc() * (i + 1));
        const temp = availableColors[i];
        availableColors[i] = availableColors[j];
        availableColors[j] = temp;
    }

    // Take the first N colors
    const selectedColors = availableColors.slice(0, cupCount);

    // Strict validation
    if (new Set(selectedColors).size !== selectedColors.length) {
        throw new Error("CRITICAL BUG: Duplicate colors detected during generation!");
    }

    return selectedColors;
}

function validateRoundColors(sequence, shelfName) {
    if (!sequence || sequence.length === 0) return;
    const uniqueCount = new Set(sequence).size;
    if (uniqueCount !== sequence.length) {
        console.error(`VALIDATION FAILED: Duplicate colors found on ${shelfName} shelf!`, sequence);
        alert(`Error: Duplicate colors found on ${shelfName}. Check console.`);
    }
}

// 1000-Round Debug Test (Run this in browser console to verify)
window.runColorUniquenessTest = function() {
    console.log("Starting 1000-round uniqueness test...");
    let passed = 0;
    for (let i = 0; i < 1000; i++) {
        const bottleCount = 2 + Math.floor(Math.random() * 14); // 2 to 15
        try {
            const seq = getUniqueCupColorsForShelf(bottleCount, Math.random);
            validateRoundColors(seq, `TestShelf-${i}`);
            passed++;
        } catch (e) {
            console.error(`Test failed on round ${i}:`, e);
        }
    }
    console.log(`Test complete. ${passed}/1000 rounds passed with NO duplicates.`);
};
// ------------------------------------------------

let currentMode = '';
let currentLevel = 1;
let currentNumBottles = 2;

let targetSequence = [];
let currentSequence = [];
let selectedIndex = -1;
let isPlaying = false;
let isHidden = true; // Bottom row is hidden until win
let timerInterval = null;
let blindTimeout = null;
let timeElapsed = 0;
let timeLeft = 0;
let lives = 5;

// Multiplayer state
let currentPlayer = 1;
let player1Time = 0;
let player2Time = 0;
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
    // Cap/Top: centered, from x = 33 to x = 37
    ctx.moveTo(33, 2);
    ctx.lineTo(37, 2);
    ctx.arcTo(39, 2, 39, 4, 1);
    
    // Neck right edge: straight down to y = 20
    ctx.lineTo(39, 20);
    
    // Right shoulder curve: curves out from (39,20) to body edge (48,35)
    ctx.bezierCurveTo(40.5, 22, 45, 28, 48, 35);
    
    // Body right edge: straight down to y = 87
    ctx.lineTo(48, 87);
    
    // Bottom-right corner curve to base (y = 92)
    ctx.arcTo(48, 92, 43, 92, 5);
    
    // Base: straight left to x = 27
    ctx.lineTo(27, 92);
    
    // Bottom-left corner curve
    ctx.arcTo(22, 92, 22, 87, 5);
    
    // Body left edge: straight up to y = 35
    ctx.lineTo(22, 35);
    
    // Left shoulder curve: curves in from (22,35) to neck (31,20)
    ctx.bezierCurveTo(25, 28, 29.5, 22, 31, 20);
    
    // Neck left edge: straight up to cap (y = 4)
    ctx.lineTo(31, 4);
    ctx.arcTo(31, 2, 33, 2, 1);
    
    ctx.closePath();
}

function renderBottleToCanvas(canvas, skinImageElement, colorHex, isHidden) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    if (isHidden) {
        if (skinImageElement) {
            const imgEl = skinImageElement.original || skinImageElement;
            // Render custom skin silhouette
            // 1. Draw the white outline around the skin shape
            ctx.save();
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(imgEl, 0, 0, w, h);
            
            tempCtx.globalCompositeOperation = 'source-in';
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, w, h);
            
            ctx.globalCompositeOperation = 'source-over';
            const d = 2.2; // Outline stroke width
            for (let angle = 0; angle < 360; angle += 45) {
                const rad = (angle * Math.PI) / 180;
                ctx.drawImage(tempCanvas, Math.cos(rad) * d, Math.sin(rad) * d, w, h);
            }
            ctx.restore();
            
            // 2. Draw the solid dark purple fill inside the skin shape
            ctx.save();
            ctx.drawImage(imgEl, 0, 0, w, h);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = 'rgba(26, 0, 51, 0.6)';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        } else {
            // Render classic silhouette
            ctx.save();
            drawBottleSilhouette(ctx, w, h);
            
            // Fill base shape with dark semi-transparent purple cartoon background
            ctx.fillStyle = 'rgba(26, 0, 51, 0.6)';
            ctx.fill();
            
            // Draw solid white stroke outline
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.restore();
        }
        return;
    }
    
    if (skinImageElement) {
        const imgOrig = skinImageElement.original || skinImageElement;
        const imgGray = skinImageElement.grayscale || skinImageElement;
        
        // 1. Draw the processed skin image directly onto the transparent canvas
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(imgOrig, 0, 0, w, h);
        
        // 2. Fill the silhouette exactly with the gameplay color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colorHex || '#ffffff';
        ctx.fillRect(0, 0, w, h);
        
        // 3. Multiply grayscale skin shading and highlights on top
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(imgGray, 0, 0, w, h);
        
        // 4. Mask back to the skin's original alpha to crop any blended edge bleeding
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(imgOrig, 0, 0, w, h);
        
        // 5. Restore default composite operation
        ctx.globalCompositeOperation = 'source-over';
    } else {
        ctx.save();
        
        // 1. Base Glass Fill: semi-transparent light blue-white so the CSS outline filter recognizes the shape
        drawBottleSilhouette(ctx, w, h);
        ctx.fillStyle = 'rgba(240, 248, 255, 0.12)';
        ctx.fill();
        
        ctx.restore();
        
        // 2. Liquid Fill: clipped to the bottle silhouette, filled ~70% up from the bottom (up to y = 38)
        ctx.save();
        drawBottleSilhouette(ctx, w, h);
        ctx.clip();
        
        ctx.fillStyle = colorHex || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-5, 38);
        ctx.quadraticCurveTo(w / 2, 35, w + 5, 38);
        ctx.lineTo(w + 5, h + 5);
        ctx.lineTo(-5, h + 5);
        ctx.closePath();
        ctx.fill();
        
        // 3. White Neck Cap: Solid white with light grey horizontal rib segments (centered on slim neck x=31 to x=39)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(31, 2, 8, 11); // cap main body
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(30, 13, 10, 4); // cap lip/rim
        
        // Cap ribbed lines
        ctx.strokeStyle = '#b0bec5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(31, 6);
        ctx.lineTo(39, 6);
        ctx.moveTo(31, 10);
        ctx.lineTo(39, 10);
        ctx.stroke();
        
        // 4. Vertical left reflection shine capsules (white, cartoonish, shifted to x=25 for slim layout)
        ctx.fillStyle = '#ffffff';
        
        // Long reflection capsule
        const rx1 = 25, ry1 = 38, rw1 = 2.5, rh1 = 20, rad1 = 1.25;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(rx1, ry1, rw1, rh1, rad1);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(rx1 + rad1, ry1);
            ctx.lineTo(rx1 + rw1 - rad1, ry1);
            ctx.quadraticCurveTo(rx1 + rw1, ry1, rx1 + rw1, ry1 + rad1);
            ctx.lineTo(rx1 + rw1, ry1 + rh1 - rad1);
            ctx.quadraticCurveTo(rx1 + rw1, ry1 + rh1, rx1 + rw1 - rad1, ry1 + rh1);
            ctx.lineTo(rx1 + rad1, ry1 + rh1);
            ctx.quadraticCurveTo(rx1, ry1 + rh1, rx1, ry1 + rh1 - rad1);
            ctx.lineTo(rx1, ry1 + rad1);
            ctx.quadraticCurveTo(rx1, ry1, rx1 + rad1, ry1);
            ctx.closePath();
            ctx.fill();
        }
        
        // Short reflection capsule/dot
        const rx2 = 25, ry2 = 62, rw2 = 2.5, rh2 = 3.5, rad2 = 1.25;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(rx2, ry2, rw2, rh2, rad2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(rx2 + rad2, ry2);
            ctx.lineTo(rx2 + rw2 - rad2, ry2);
            ctx.quadraticCurveTo(rx2 + rw2, ry2, rx2 + rw2, ry2 + rad2);
            ctx.lineTo(rx2 + rw2, ry2 + rh2 - rad2);
            ctx.quadraticCurveTo(rx2 + rw2, ry2 + rh2, rx2 + rw2 - rad2, ry2 + rh2);
            ctx.lineTo(rx2 + rad2, ry2 + rh2);
            ctx.quadraticCurveTo(rx2, ry2 + rh2, rx2, ry2 + rh2 - rad2);
            ctx.lineTo(rx2, ry2 + rad2);
            ctx.quadraticCurveTo(rx2, ry2, rx2 + rad2, ry2);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
        
        // 5. Delicate inner glass edge outline for depth (only for classic mode)
        ctx.save();
        drawBottleSilhouette(ctx, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

// --- Skin State & Migration ---
function getSelectedBottleSkinSrc() {
  try {
    const savedObject = localStorage.getItem("selectedBottleSkin");
    if (savedObject) {
      const parsed = JSON.parse(savedObject);
      if (parsed?.src) {
        if (parsed.src.startsWith("/")) return parsed.src.slice(1);
        return parsed.src;
      }
      if (typeof parsed === "string") {
        if (parsed.startsWith("/")) return parsed.slice(1);
        return parsed;
      }
    }

    return "classic";
  } catch (error) {
    return "classic";
  }
}

function setSelectedBottleSkinSrc(src) {
  let id = 'classic';
  if (src && src.match(/skin\d+/)) {
    const match = src.match(/skin\d+/);
    if (match) id = match[0];
  }
  const cleanSrc = (src && src.startsWith("/")) ? src.slice(1) : src;
  localStorage.setItem("selectedBottleSkin", JSON.stringify({ id, src: cleanSrc }));
  window.dispatchEvent(new Event("selectedBottleSkinChanged"));
}

function getMigratedSkin() {
    let skinVal = localStorage.getItem('selectedBottleSkin') || localStorage.getItem('selectedBottleSkinSrc') || localStorage.getItem('bottleOrderSkin');
    if (!skinVal) {
        return 'classic';
    }
    let id = 'classic';
    if (skinVal.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(skinVal);
            if (parsed && parsed.src) {
                if (parsed.src === 'classic') {
                    id = 'classic';
                } else {
                    const match = parsed.src.match(/skin\d+/);
                    if (match) id = match[0];
                }
            }
            if (parsed && parsed.id) {
                id = parsed.id;
            }
        } catch (e) {
            console.error("Error parsing skinVal in getMigratedSkin:", e);
        }
    } else if (skinVal === 'skin-classic' || skinVal === 'classic') {
        id = 'classic';
    } else if (skinVal.startsWith('skin-image-')) {
        const idStr = skinVal.split('-')[2]; // 'skin-image-1' -> '1'
        const num = parseInt(idStr);
        if (num >= 1 && num <= 13) {
            id = `skin${num}`;
        }
    } else {
        const match = skinVal.match(/skin\d+/);
        if (match) {
            id = match[0];
        }
    }

    // Automatically reset removed skins to default 'classic'
    const removedSkins = [];
    if (removedSkins.includes(id)) {
        id = 'classic';
        localStorage.setItem('selectedBottleSkin', JSON.stringify({ id: 'classic', src: 'classic' }));
    }
    return id;
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

// Global reusable BottleImage function definition
function BottleImage({ color, hidden, isSelected = false, className = '' }) {
    const bottleSrc = getSelectedBottleSkinSrc();
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
    if (bottleSrc === 'classic' || bottleSrc === 'skin-classic' || !bottleSrc) {
        renderBottleToCanvas(canvas, null, colorHex, hidden);
    } else {
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
            if (bottleSrc === 'classic' || bottleSrc === 'skin-classic' || !bottleSrc) {
                renderBottleToCanvas(canvas, null, newColorHex, hidden);
            } else {
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

let currentSkin = getMigratedSkin();
const initialSkinSrc = getSelectedBottleSkinSrc();
localStorage.setItem('selectedBottleSkin', JSON.stringify({ id: currentSkin, src: initialSkinSrc }));
localStorage.removeItem('selectedBottleSkinSrc'); // Cleanup legacy key
localStorage.removeItem('bottleOrderSkin'); // Cleanup legacy key

let SKINS_METADATA = {};
let BottleSkin = null;

// Dynamically import ES modules in non-module script
import('./src/data/skins.js').then(module => {
    const bottleSkins = module.bottleSkins;
    bottleSkins.forEach(skin => {
        SKINS_METADATA[skin.id] = {
            name: skin.name,
            desc: skin.desc,
            image: skin.src,
            border: skin.border
        };
    });
    
    initSkinsShop(bottleSkins);
    updateActiveSkinUI(currentSkin);
    updateStatsUI();
});

import('./src/components/BottleSkin.jsx').then(module => {
    BottleSkin = module.BottleSkin;
    if (isPlaying) {
        renderBoard();
    }
});

function initSkinsShop(skins) {
    const grid = document.getElementById('skins-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    skins.forEach((skin, index) => {
        const card = document.createElement('div');
        card.id = `skin-card-${skin.id}`;
        card.className = `glass-card rounded-lg overflow-hidden group cursor-pointer active:scale-95 transition-all animate-[fadeIn_0.3s_ease-out]`;
        card.onclick = () => selectSkin(skin.id);
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = `aspect-square relative p-4 flex items-center justify-center bg-white/5`;
        
        const img = document.createElement('img');
        img.className = `w-[70px] h-[95px] object-contain transition-transform duration-300 group-hover:scale-105`;
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // placeholder
        img.alt = `${skin.name} Skin Bottle`;
        
        const previewColors = [
            "#ff3b30", // Red
            "#007aff", // Blue
            "#34c759", // Green
            "#00e5ff", // Cyan
            "#ffcc00", // Yellow
            "#ff2d95", // Pink
            "#af52de", // Purple
            "#ff9500"  // Orange
        ];
        const previewColor = previewColors[index % previewColors.length];
        
        if (skin.id === 'classic') {
            const canvas = document.createElement('canvas');
            canvas.width = 70;
            canvas.height = 95;
            renderBottleToCanvas(canvas, null, '#00E5FF', false);
            img.src = canvas.toDataURL();
        } else {
            getSkinAsset(skin.src, (asset) => {
                if (!asset || !asset.original) return;

                const canvas = document.createElement("canvas");
                canvas.width = 70;
                canvas.height = 95;

                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(asset.original, 0, 0, canvas.width, canvas.height);

                removeOuterWhiteFrame(canvas);
                img.src = canvas.toDataURL("image/png");
            });
        }
        
        const badge = document.createElement('span');
        badge.id = `active-badge-${skin.id}`;
        badge.className = `absolute top-2 right-2 px-2 py-0.5 bg-tertiary text-on-tertiary font-label-caps text-[10px] rounded-full shadow-[0_0_8px_#abd600] hidden`;
        badge.textContent = 'ACTIVE';
        
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(badge);
        
        if (skin.id === 'skin5') {
            const sparkles = document.createElement('div');
            sparkles.id = 'magical-sparkles-container';
            sparkles.className = 'absolute inset-0 overflow-hidden pointer-events-none z-10';
            sparkles.innerHTML = `
                <div class="absolute top-4 left-4 text-tertiary animate-pulse opacity-60"><span class="material-symbols-outlined text-sm">auto_awesome</span></div>
                <div class="absolute bottom-10 right-6 text-secondary opacity-40"><span class="material-symbols-outlined text-xs">star</span></div>
                <div class="absolute top-1/2 right-2 text-primary opacity-50"><span class="material-symbols-outlined text-sm">flare</span></div>
            `;
            imgWrapper.appendChild(sparkles);
        }
        
        const footer = document.createElement('div');
        footer.className = `p-3 bg-white/10 text-center border-t border-white/5`;
        
        const nameText = document.createElement('p');
        let nameColorClass = 'text-secondary';
        if (skin.border.includes('primary')) nameColorClass = 'text-primary';
        if (skin.border.includes('secondary')) nameColorClass = 'text-secondary';
        if (skin.border.includes('tertiary')) nameColorClass = 'text-tertiary';
        if (skin.border.includes('hotpink')) nameColorClass = 'text-hot-pink';
        
        nameText.className = `font-label-caps text-label-caps ${nameColorClass} text-sm group-hover:text-primary transition-colors`;
        nameText.textContent = skin.name;
        
        footer.appendChild(nameText);
        
        card.appendChild(imgWrapper);
        card.appendChild(footer);
        grid.appendChild(card);
    });
}

// --- Seeded PRNG for Daily Mode ---
function xmur3(str) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    } return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}
function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}
let seededRandom = Math.random;

function updateMainMenuRank() {
    const currentLevelForRank = parseInt(localStorage.getItem('bottleOrderLevel')) || 1;
    let title = "NOVICE";
    if (currentLevelForRank >= 10) {
        title = "MASTER";
    } else if (currentLevelForRank >= 8) {
        title = "ADEPT";
    } else if (currentLevelForRank >= 5) {
        title = "SCHOLAR";
    } else if (currentLevelForRank >= 3) {
        title = "APPRENTICE";
    }
    
    const homeLevel = document.getElementById('home-level-display');
    const homeRank = document.getElementById('home-rank-display');
    if (homeLevel) homeLevel.textContent = currentLevelForRank;
    if (homeRank) homeRank.textContent = title;

    const classicLevel = document.getElementById('classic-level-display');
    const classicRank = document.getElementById('classic-rank-display');
    if (classicLevel) classicLevel.textContent = currentLevelForRank;
    if (classicRank) classicRank.textContent = title;
}

document.addEventListener('DOMContentLoaded', () => {
    // Hydrate options and states
    sound.sfxEnabled = sfxOn;
    const sfxToggle = document.getElementById('sfx-toggle');
    if (sfxToggle) sfxToggle.checked = sfxOn;

    const musicToggle = document.getElementById('music-toggle');
    if (musicToggle) musicToggle.checked = sound.musicEnabled;

    const glowToggle = document.getElementById('glow-toggle');
    if (glowToggle) glowToggle.checked = glowOn;
    document.documentElement.classList.toggle('dark', glowOn);

    updateActiveSkinUI(currentSkin);
    updateStatsUI();
    spawnSparkles();

    // Artificial initial loading to show the visual
    setTimeout(() => { hideLoadingScreen(); }, 1000); // Shows loading screen for 1 second initially

    // Setup responsive scaling for game container
    const wrapper = document.querySelector('.game-wrapper');
    const container = document.querySelector('.game-container');
    if (wrapper && container) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const rect = entry.contentRect;
                // scale to fit with a small margin
                const scaleW = rect.width / 800;
                const scaleH = rect.height / 380;
                let scale = Math.min(scaleW, scaleH);
                // Optional: don't scale up too much on huge screens
                if (scale > 1.2) scale = 1.2;
                container.style.transform = `scale(${scale})`;
            }
        });
        resizeObserver.observe(wrapper);
    }

    // Fallback: ensure loading screen hides after max 3 seconds or when page fully loads
    window.addEventListener('load', () => {
        hideLoadingScreen();
    });
    setTimeout(() => {
        hideLoadingScreen();
    }, 3000);
    showScreen('main-menu');
});

function showLoadingScreen(callback, delay = 1000) {
    const loader = document.getElementById('loading-screen');
    loader.style.visibility = 'visible';
    loader.style.opacity = '1';
    
    setTimeout(() => {
        if (callback) callback();
        setTimeout(hideLoadingScreen, delay); // keep it up for 'delay' ms after callback
    }, 500); // wait for fade-in
}

function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    if (!loader) return;
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.visibility = 'hidden';
        loader.style.display = 'none';
        // loader.remove(); // optional removal from DOM
    }, 500);
}

// --- Web Audio SFX/Synth System ---
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = false;
        this.musicNode = null;
        this.musicTimer = null;
    }

    initContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        if (!this.sfxEnabled) return;
        this.initContext();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSelect() {
        if (!this.sfxEnabled) return;
        this.initContext();
        
        const now = this.ctx.currentTime;
        const freqs = [329.63, 392.00, 523.25, 659.25, 783.99]; // E4, G4, C5, E5, G5
        
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            
            gain.gain.setValueAtTime(0, now + idx * 0.04);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);
            
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.4);
        });
    }

    playToggle() {
        if (!this.sfxEnabled) return;
        this.initContext();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        
        const sfxToggle = document.getElementById('sfx-toggle');
        const state = sfxToggle ? sfxToggle.checked : true;
        const startFreq = state ? 200 : 400;
        const endFreq = state ? 400 : 200;
        
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playWin() {
        if (!this.sfxEnabled) return;
        this.initContext();
        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gain.gain.setValueAtTime(0, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.5);
        });
    }

    playGameOver() {
        if (!this.sfxEnabled) return;
        this.initContext();
        const now = this.ctx.currentTime;
        const freqs = [220.00, 207.65, 196.00, 146.83]; // A3, Ab3, G3, D3
        
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, now + idx * 0.12);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + idx * 0.12 + 0.35);
            
            gain.gain.setValueAtTime(0, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.12 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.5);
            
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.6);
        });
    }

    startMusic() {
        this.initContext();
        if (this.musicNode) return;
        
        const now = this.ctx.currentTime;
        
        this.musicNode = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        
        this.musicNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        this.musicNode.type = 'sine';
        gain.gain.setValueAtTime(0.06, now);
        
        const notes = [130.81, 146.83, 164.81, 196.00]; // C3, D3, E3, G3
        let step = 0;
        
        this.musicTimer = setInterval(() => {
            if (this.ctx.state === 'suspended') return;
            if (this.musicNode) {
                this.musicNode.frequency.setValueAtTime(notes[step % notes.length], this.ctx.currentTime);
                filter.frequency.setValueAtTime(300 + Math.sin(this.ctx.currentTime) * 100, this.ctx.currentTime);
                step++;
            }
        }, 800);
        
        this.musicNode.start();
    }

    stopMusic() {
        if (this.musicNode) {
            try {
                this.musicNode.stop();
            } catch(e) {}
            this.musicNode = null;
            clearInterval(this.musicTimer);
        }
    }
}

const sound = new SoundSystem();
let sfxOn = localStorage.getItem('bottleOrderSFX') !== 'false';
let glowOn = localStorage.getItem('bottleOrderGlow') !== 'false';

// --- Skins Logic ---
function selectSkin(skinId) {
    if (!SKINS_METADATA || !SKINS_METADATA[skinId]) return;

    currentSkin = skinId;
    const skinSrc = SKINS_METADATA[skinId].image || `${skinId}.png`;
    setSelectedBottleSkinSrc(skinSrc);
    sound.playSelect();

    updateActiveSkinUI(skinId);
    updateStatsUI();

    const selectedCard = document.getElementById(`skin-card-${skinId}`);
    if (selectedCard) {
        selectedCard.classList.add('scale-95');
        setTimeout(() => selectedCard.classList.remove('scale-95'), 150);
    }
}

function updateActiveSkinUI(activeSkinId) {
    if (!SKINS_METADATA || !SKINS_METADATA[activeSkinId]) return;

    Object.keys(SKINS_METADATA).forEach(skinId => {
        const card = document.getElementById(`skin-card-${skinId}`);
        const badge = document.getElementById('active-badge-' + skinId);
        
        if (card) {
            card.className = "glass-card rounded-lg overflow-hidden group cursor-pointer active:scale-95 transition-all animate-[fadeIn_0.3s_ease-out]";
            card.classList.add('border-2', 'border-transparent');
        }
        if (badge) {
            badge.classList.add('hidden');
        }
    });

    const activeCard = document.getElementById(`skin-card-${activeSkinId}`);
    const activeBadge = document.getElementById('active-badge-' + activeSkinId);
    
    if (activeCard) {
        activeCard.classList.remove('border-transparent');
        const borderClass = SKINS_METADATA[activeSkinId].border;
        activeCard.classList.add(borderClass);
        activeCard.classList.add('neon-glow-active');
    }
    if (activeBadge) {
        activeBadge.classList.remove('hidden');
    }

    const metadata = SKINS_METADATA[activeSkinId];
    const previewImg = document.getElementById('live-preview-img');
    const previewName = document.getElementById('live-preview-name');
    const previewDesc = document.getElementById('live-preview-desc');

    if (previewImg) {
        previewImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // placeholder
        previewImg.className = "w-20 h-28 object-contain transition-all";
        
        const previewColors = [
            "#ff3b30", // Red
            "#007aff", // Blue
            "#34c759", // Green
            "#00e5ff", // Cyan
            "#ffcc00", // Yellow
            "#ff2d95", // Pink
            "#af52de", // Purple
            "#ff9500"  // Orange
        ];
        const skinsKeys = Object.keys(SKINS_METADATA);
        const activeIndex = skinsKeys.indexOf(activeSkinId);
        const previewColor = previewColors[activeIndex !== -1 ? activeIndex % previewColors.length : 0];
        
        if (activeSkinId === 'classic') {
            const canvas = document.createElement('canvas');
            canvas.width = 70;
            canvas.height = 95;
            renderBottleToCanvas(canvas, null, '#00E5FF', false);
            previewImg.src = canvas.toDataURL();
        } else {
            getSkinAsset(metadata.image, (asset) => {
                if (!asset || !asset.original) return;

                const canvas = document.createElement("canvas");
                canvas.width = 70;
                canvas.height = 95;

                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(asset.original, 0, 0, canvas.width, canvas.height);

                removeOuterWhiteFrame(canvas);
                previewImg.src = canvas.toDataURL("image/png");
            });
        }
        
        const glowColorMap = {
            'neon-border-primary': 'rgba(236, 178, 255, 0.6)',
            'neon-border-secondary': 'rgba(211, 251, 255, 0.6)',
            'neon-border-tertiary': 'rgba(171, 214, 0, 0.6)',
            'neon-border-hotpink': 'rgba(255, 0, 122, 0.6)',
            'glass-card': 'rgba(255, 255, 255, 0.4)'
        };
        const glowColor = glowColorMap[metadata.border] || 'rgba(255, 255, 255, 0.4)';
        previewImg.style.setProperty('--preview-glow', glowColor);
    }
    if (previewName) previewName.textContent = metadata.name;
    if (previewDesc) previewDesc.textContent = metadata.desc;
}

// --- Statistics and Achievements UI updates ---
function updateStatsUI() {
    const statsGames = document.getElementById('stats-games-completed');
    const statsLevel = document.getElementById('stats-current-level');
    const statsSkin = document.getElementById('stats-active-skin');
    
    const rankTitle = document.getElementById('profile-rank-title');
    const progressBar = document.getElementById('profile-progress-bar');
    const progressLabel = document.getElementById('profile-progress-label');

    currentLevel = parseInt(localStorage.getItem('bottleOrderLevel')) || 1;
    const gamesCompletedCount = Math.max(0, currentLevel - 1);
    
    if (statsGames) statsGames.textContent = gamesCompletedCount;
    if (statsLevel) statsLevel.textContent = currentLevel;
    if (statsSkin) {
        statsSkin.textContent = (SKINS_METADATA && SKINS_METADATA[currentSkin]) ? 
            SKINS_METADATA[currentSkin].name : 'Shaker';
    }
    
    let title = "BOTTLE NOVICE";
    let percent = 10;
    if (currentLevel >= 10) {
        title = "BOTTLE MASTER";
        percent = 100;
    } else if (currentLevel >= 8) {
        title = "ARCADE ADEPT";
        percent = 80;
    } else if (currentLevel >= 5) {
        title = "POTION SCHOLAR";
        percent = 55;
    } else if (currentLevel >= 3) {
        title = "FLASK APPRENTICE";
        percent = 30;
    }
    
    if (rankTitle) rankTitle.textContent = title;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressLabel) {
        progressLabel.textContent = currentLevel >= 10 ? `MAX LEVEL CLEARED` : `Lvl ${currentLevel} â†’ Lvl ${currentLevel + 1}`;
    }

    const achSkin = document.getElementById('achievement-unlocked-skin');
    const achSkinIcon = document.getElementById('achievement-unlocked-skin-icon');
    
    if (achSkin && achSkinIcon) {
        if (currentSkin !== 'classic') {
            achSkin.classList.remove('opacity-40');
            achSkin.classList.add('border-tertiary/60', 'opacity-100');
            achSkinIcon.className = "material-symbols-outlined text-tertiary text-2xl mb-1";
        } else {
            achSkin.className = "glass-card rounded-lg p-3 text-center border-white/10 flex flex-col items-center opacity-40";
            achSkinIcon.className = "material-symbols-outlined text-outline text-2xl mb-1";
        }
    }

    const achLvl5 = document.getElementById('achievement-cleared-lvl5');
    const achLvl5Icon = document.getElementById('achievement-cleared-lvl5-icon');
    if (achLvl5 && achLvl5Icon) {
        if (currentLevel >= 5) {
            achLvl5.classList.remove('opacity-40');
            achLvl5.classList.add('border-tertiary/60', 'opacity-100');
            achLvl5Icon.className = "material-symbols-outlined text-tertiary text-2xl mb-1";
        } else {
            achLvl5.className = "glass-card rounded-lg p-3 text-center border-white/10 flex flex-col items-center opacity-40";
            achLvl5Icon.className = "material-symbols-outlined text-outline text-2xl mb-1";
        }
    }
}

// --- Interactive Floating Sparks Particles (Magical Skin) ---
function spawnSparkles() {
    const container = document.getElementById('magical-sparkles-container');
    if (!container) return;

    if (window.sparklesInterval) {
        clearInterval(window.sparklesInterval);
    }

    window.sparklesInterval = setInterval(() => {
        const skinsScreen = document.getElementById('skins-screen');
        if (skinsScreen && skinsScreen.classList.contains('hidden')) return;

        const particle = document.createElement('div');
        particle.className = 'sparkle-particle';
        
        const size = Math.random() * 8 + 4;
        const left = Math.random() * 80 + 10;
        const duration = Math.random() * 1.5 + 1.5;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.bottom = `10px`;
        particle.style.animationDuration = `${duration}s`;

        const colors = ['rgba(171, 214, 0, 0.7)', 'rgba(0, 240, 255, 0.7)', 'rgba(189, 0, 255, 0.7)'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = `radial-gradient(circle, ${color} 20%, transparent 80%)`;

        container.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, duration * 1000);
    }, 350);
}

// --- Settings Panel Action Handlers ---
function openSettings() {
    sound.playClick();
    const settings = document.getElementById('settings-modal');
    settings.classList.remove('hidden');
    setTimeout(() => {
        settings.classList.remove('opacity-0');
    }, 50);
}

function closeSettings() {
    sound.playClick();
    const settings = document.getElementById('settings-modal');
    settings.classList.add('opacity-0');
    setTimeout(() => {
        settings.classList.add('hidden');
    }, 300);
}

function toggleSFX() {
    const toggle = document.getElementById('sfx-toggle');
    sfxOn = toggle.checked;
    sound.sfxEnabled = sfxOn;
    localStorage.setItem('bottleOrderSFX', sfxOn);
    sound.playToggle();
}

function toggleMusic() {
    const toggle = document.getElementById('music-toggle');
    sound.musicEnabled = toggle.checked;
    sound.initContext();
    if (toggle.checked) {
        sound.startMusic();
    } else {
        sound.stopMusic();
    }
}

function toggleGlow() {
    const toggle = document.getElementById('glow-toggle');
    glowOn = toggle.checked;
    localStorage.setItem('bottleOrderGlow', glowOn);
    sound.playClick();
    
    if (glowOn) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function confirmResetProgress() {
    sound.playClick();
    if (confirm("Are you sure you want to reset your level progress, active skins, and stats? This cannot be undone.")) {
        localStorage.setItem('bottleOrderLevel', 1);
        localStorage.setItem('selectedBottleSkin', JSON.stringify({ id: 'classic', src: 'classic' }));
        localStorage.removeItem('selectedBottleSkinSrc');
        currentLevel = 1;
        currentSkin = 'classic';
        
        updateActiveSkinUI(currentSkin);
        updateStatsUI();
        
        // Dispatch custom event to notify gameplay components immediately
        window.dispatchEvent(new Event("selectedBottleSkinChanged"));
        
        alert("All stats and level progression have been reset!");
        closeSettings();
        showScreen('main-menu');
    }
}

// --- SPA Navigation ---
function showScreen(screenId) {
    sound.playClick();
    
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.remove('hidden');
        activeScreen.classList.add('active');
    }
    
    const appHeader = document.getElementById('app-header');
    const appNav = document.getElementById('app-nav');
    if (appHeader && appNav) {
        if (screenId === 'game-screen') {
            appHeader.classList.add('hidden');
            appNav.classList.add('hidden');
        } else if (screenId === 'main-menu' || screenId === 'classic-menu') {
            appHeader.classList.add('hidden');
            appNav.classList.remove('hidden');
        } else {
            appHeader.classList.remove('hidden');
            appNav.classList.remove('hidden');
        }
    }
    
    if (screenId !== 'game-screen') {
        clearInterval(timerInterval);
    }

    updateActiveNavTab(screenId);

    if (screenId === 'profile-screen') {
        updateStatsUI();
    } else if (screenId === 'leaderboard-screen') {
        const activeSkinName = (SKINS_METADATA && SKINS_METADATA[currentSkin]) ? SKINS_METADATA[currentSkin].name : 'Shaker';
        document.getElementById('leaderboard-active-skin-name').textContent = activeSkinName;
        document.getElementById('leaderboard-player-level-stats').innerHTML = `Lvl ${currentLevel} â€¢ --s`;
    } else if (screenId === 'skins-screen') {
        updateActiveSkinUI(currentSkin);
    }

    if (screenId === 'main-menu' || screenId === 'classic-menu') {
        updateMainMenuRank();
    }
}

function updateActiveNavTab(screenId) {
    const navMapping = {
        'main-menu': 'nav-play',
        'classic-menu': 'nav-play',
        'skins-screen': 'nav-skins',
        'leaderboard-screen': 'nav-leaderboard',
        'profile-screen': 'nav-profile'
    };
    
    const activeTabId = navMapping[screenId];
    const navItems = ['nav-play', 'nav-skins', 'nav-leaderboard', 'nav-profile'];
    
    navItems.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        if (id === activeTabId) {
            el.className = "flex flex-col items-center justify-center bg-secondary/20 text-secondary border-t-4 border-secondary px-4 py-2 transition-all cursor-pointer";
            const icon = el.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 1";
        } else {
            el.className = "flex flex-col items-center justify-center text-outline-variant px-4 py-2 hover:bg-glass-stroke transition-colors active:scale-90 transition-all duration-150 cursor-pointer";
            const icon = el.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 0";
        }
    });
}

function showComingSoon(modeName) {
    document.getElementById('coming-soon-title').textContent = modeName;
    document.getElementById('coming-soon-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('coming-soon-modal').classList.add('hidden');
}

// --- Game Logic ---
function startGameMode(mode) {
    if (getEnergy() <= 0) {
        showEnergyModal();
        return;
    }
    showLoadingScreen(() => {
        currentMode = mode;
        currentLevel = 1;
        localStorage.setItem('bottleOrderLevel', currentLevel);
        
        const titles = {
            'sequence': 'Sequence Mode',
            'time-attack': 'Time Attack',
            'blind': 'Blind Mode / Memory',
            'adventure': 'Adventure Mode',
            'daily': 'Daily Challenge',
            'multiplayer': 'Multiplayer (P1)',
            'knockout': 'Knock-out (Survival)'
        };
        document.getElementById('game-mode-title').textContent = titles[mode];
        
        if (mode === 'daily') {
            const today = new Date().toDateString();
            const lastPlayed = localStorage.getItem('bottleOrderDailyLastPlayed');
            if (lastPlayed === today) {
                const status = localStorage.getItem('bottleOrderDailyStatus');
                showComingSoon(status === 'win' ? 'Daily Cleared!' : 'Try Again Tomorrow!');
                document.getElementById('coming-soon-title').nextElementSibling.textContent = "You have already played today's challenge.";
                return;
            }
        }
        
        if (mode === 'multiplayer') {
            currentPlayer = 1;
            multiplayerSeed = Math.random().toString();
            document.getElementById('game-mode-title').textContent = 'Multiplayer (P1)';
        }

        if (mode === 'adventure') {
            lives = 5;
            document.getElementById('lives-container').classList.remove('hidden');
            updateLivesDisplay();
        } else {
            document.getElementById('lives-container').classList.add('hidden');
        }
        
        showScreen('game-screen');
        initLevel();
        startLevelPlay();
    }, 1500); // Show loading screen for 1.5 seconds between modes
}

function initLevel() {
    if (currentMode === 'daily') {
        const today = new Date().toDateString();
        const seed = xmur3(today);
        seededRandom = sfc32(seed(), seed(), seed(), seed());
        currentNumBottles = 6 + Math.floor(seededRandom() * 10); // 6 to 15 bottles
        document.getElementById('level-display').textContent = 'DAILY';
    } else if (currentMode === 'multiplayer') {
        const seedStr = multiplayerSeed + currentLevel.toString();
        const seed = xmur3(seedStr);
        seededRandom = sfc32(seed(), seed(), seed(), seed());
        currentNumBottles = Math.min(MAX_BOTTLES, currentLevel + 1);
        document.getElementById('level-display').textContent = currentLevel;
        document.getElementById('game-mode-title').textContent = `Multiplayer (P${currentPlayer})`;
    } else {
        seededRandom = Math.random;
        currentNumBottles = Math.min(MAX_BOTTLES, currentLevel + 1);
        document.getElementById('level-display').textContent = currentLevel;
    }
    
    // Use the centralized robust function
    targetSequence = getUniqueCupColorsForShelf(currentNumBottles, seededRandom);
    validateRoundColors(targetSequence, 'target-bottom');
    
    // Create a shuffled version for the player to solve
    currentSequence = [...targetSequence];
    if (currentNumBottles > 1) {
        while (countCorrectBottles() === currentNumBottles) {
            for (let i = currentSequence.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                const temp = currentSequence[i];
                currentSequence[i] = currentSequence[j];
                currentSequence[j] = temp;
            }
        }
    }
    validateRoundColors(currentSequence, 'player-top');
    
    if (currentMode === 'blind' || currentMode === 'daily') {
        isHidden = false; // Show initially for 3 seconds
    } else {
        isHidden = true; // Always hide for other modes
    }
    
    document.getElementById('feedback-text').textContent = 'Correct Bottles: ?';
    document.getElementById('feedback-text').style.color = '#fff';
    document.getElementById('feedback-text').style.textShadow = 'none';

    renderBoard();
    
    document.getElementById('win-message').classList.add('hidden');
    
    if (currentMode === 'time-attack') {
        timeLeft = 20 + (currentLevel * 5);
        document.getElementById('time-display').textContent = timeLeft;
    } else if (currentMode === 'daily') {
        timeLeft = currentNumBottles * 8; // 8 seconds per bottle
        document.getElementById('time-display').textContent = timeLeft;
    } else if (currentMode === 'knockout') {
        if (currentLevel === 1) {
            timeLeft = 30; // Starting time
        }
        document.getElementById('time-display').textContent = timeLeft;
    } else {
        timeElapsed = 0;
        document.getElementById('time-display').textContent = timeElapsed;
    }
    
    clearInterval(timerInterval);
    if (blindTimeout) clearTimeout(blindTimeout);
    isPlaying = false;
    selectedIndex = -1;
}

function startLevelPlay() {
    if (isPlaying) return;
    
    document.getElementById('win-message').classList.add('hidden');
    clearInterval(timerInterval);
    if (blindTimeout) clearTimeout(blindTimeout);
    
    selectedIndex = -1;
    updateFeedback(); // Show initial correct count
    renderBoard();
    
    if (currentMode === 'blind' || currentMode === 'daily') {
        // Wait 3 seconds before starting play in blind mode
        blindTimeout = setTimeout(() => {
            isHidden = true;
            renderBoard();
            isPlaying = true;
            if (currentMode === 'daily') {
                startTimeAttackTimer();
            } else {
                timeElapsed = 0;
                document.getElementById('time-display').textContent = timeElapsed;
                startNormalTimer();
            }
        }, 3000);
    } else {
        isPlaying = true;
        if (currentMode === 'time-attack' || currentMode === 'knockout') {
            startTimeAttackTimer();
        } else {
            timeElapsed = 0;
            document.getElementById('time-display').textContent = timeElapsed;
            startNormalTimer();
        }
    }
}

function startNormalTimer() {
    timerInterval = setInterval(() => {
        timeElapsed++;
        document.getElementById('time-display').textContent = timeElapsed;
    }, 1000);
}

function startTimeAttackTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('time-display').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isPlaying = false;
            sound.playGameOver();
            
            // Deduct 5 energy on loss
            setEnergy(getEnergy() - LOSE_COST);
            
            if (currentMode === 'daily') {
                localStorage.setItem('bottleOrderDailyLastPlayed', new Date().toDateString());
                localStorage.setItem('bottleOrderDailyStatus', 'lose');
                document.getElementById('win-message').classList.remove('hidden');
                document.getElementById('win-message').innerHTML = `<h2 style="color:red;">OUT OF TIME!</h2><p style="font-size:1rem; margin-top:10px;">Try again tomorrow.</p><button class="game-btn reset-btn" style="margin-top:15px" onclick="showScreen('main-menu')">Main Menu</button>`;
            } else if (currentMode === 'knockout') {
                document.getElementById('win-message').classList.remove('hidden');
                document.getElementById('win-message').innerHTML = `<h2 style="color:red;">KNOCKED OUT!</h2><p style="font-size:1.2rem; margin-top:10px; color: #fff;">You survived <b>${currentLevel - 1}</b> levels.</p><button class="game-btn reset-btn" style="margin-top:15px" onclick="showScreen('main-menu')">Main Menu</button>`;
            } else {
                document.getElementById('win-message').classList.remove('hidden');
                document.getElementById('win-message').innerHTML = `<h2 style="color:red;">TIME'S UP!</h2><p style="font-size:1rem; margin-top:10px;">Restarting game in 3s...</p>`;
                setTimeout(() => {
                    currentLevel = 1;
                    initLevel();
                    startLevelPlay();
                }, 3000);
            }
        }
    }, 1000);
}

function resetLevel() {
    sound.playClick();
    initLevel();
    startLevelPlay();
}

function renderBoard() {
    // Top row is Player's row (Interactive, Visible)
    renderBottles('top-row', currentSequence, true, false);
    
    // Bottom row is Target row (Non-interactive, Hidden until Win)
    renderBottles('bottom-row', targetSequence, false, isHidden);
    
    renderArrows();
}

function createBottleDOM({ color, skinId, hidden, isInteractive, isSelected, index }) {
    if (hidden) {
        const bottleSrc = getSelectedBottleSkinSrc();
        if (bottleSrc && bottleSrc !== 'classic' && bottleSrc !== 'skin-classic') {
            const bottleSlot = BottleImage({
                color: null,
                hidden: true,
                isSelected,
                className: 'bottle'
            });
            if (isInteractive) {
                bottleSlot.onclick = () => handleBottleClick(index);
            }
            return bottleSlot;
        } else {
            const onClick = isInteractive ? () => handleBottleClick(index) : null;
            return createHiddenBottleDOM({ isSelected, onClick });
        }
    }
    if (typeof BottleImage === 'function') {
        const bottleSlot = BottleImage({
            color,
            hidden,
            isSelected,
            className: 'bottle'
        });
        if (isInteractive) {
            bottleSlot.onclick = () => handleBottleClick(index);
        }
        return bottleSlot;
    }
    
    // Fallback if component is not loaded yet
    const bottleSrc = getSelectedBottleSkinSrc();
    console.log("GAME IS USING SELECTED SKIN:", bottleSrc);

    const bottle = document.createElement('div');
    bottle.className = `bottle-slot bottle skin-image ${color || ''} ${skinId}`;
    if (isSelected) {
        bottle.classList.add('selected');
    }
    if (isInteractive) {
        bottle.onclick = () => handleBottleClick(index);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 70;
    canvas.height = 95;
    canvas.className = 'bottle-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    bottle.appendChild(canvas);

    const colorHex = getColorHex(color);

    // Check processed cache first for instant synchronous rendering
    if (bottleSrc === 'classic' || bottleSrc === 'skin-classic' || !bottleSrc) {
        renderBottleToCanvas(canvas, null, colorHex, hidden);
    } else {
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
    }

    if (color) {
        const liquid = document.createElement('div');
        liquid.className = `bottle-liquid liquid ${color}`;
        liquid.style.display = 'none';
        bottle.appendChild(liquid);

        const observer = new MutationObserver(() => {
            const match = liquid.className.match(/color-[a-z]+/);
            const newColor = match ? match[0] : '';
            
            // Remove any existing color- class
            bottle.className = bottle.className.replace(/color-[a-z]+/g, '').trim();
            if (newColor) {
                bottle.classList.add(newColor);
            }

            const newColorHex = getColorHex(liquid.className);
            if (bottleSrc === 'classic' || bottleSrc === 'skin-classic' || !bottleSrc) {
                renderBottleToCanvas(canvas, null, newColorHex, hidden);
            } else {
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
            }
        });
        observer.observe(liquid, { attributes: true });
    }

    if (hidden) {
        bottle.classList.add('hidden-bottle');
        const mystery = document.createElement('div');
        mystery.className = 'mystery-mark';
        mystery.textContent = '?';
        bottle.appendChild(mystery);
    }

    return bottle;
}

function initDragAndDrop(container) {
    if (!container) return;
    
    const slots = Array.from(container.children);
    
    slots.forEach((slot, index) => {
        // Prevent default touch actions (e.g. scrolling, pinch zoom)
        slot.style.touchAction = 'none';
        
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let activePointerId = null;
        let slotRects = [];
        let rectSelected = null;
        
        slot.onpointerdown = (e) => {
            if (!isPlaying) return;
            if (activePointerId !== null) return;
            
            // Caching slot positions
            slotRects = slots.map(s => s.getBoundingClientRect());
            rectSelected = slotRects[index];
            
            startX = e.clientX;
            startY = e.clientY;
            activePointerId = e.pointerId;
            isDragging = false;
            
            try {
                slot.setPointerCapture(e.pointerId);
            } catch(err) {}
            
            // Visual feedback on tap
            slot.classList.add('selected');
            sound.playSelect();
        };
        
        slot.onpointermove = (e) => {
            if (activePointerId !== e.pointerId) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (!isDragging && Math.sqrt(dx*dx + dy*dy) > 6) {
                isDragging = true;
                slot.classList.add('dragging');
                slot.classList.remove('selected');
                document.body.classList.add('drag-active');
            }
            
            if (isDragging) {
                const rotation = Math.max(-8, Math.min(8, dx * 0.04));
                slot.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.15) translateY(-12px) rotate(${rotation}deg)`;
                
                // Track hover target index
                let hoverIndex = -1;
                for (let idx = 0; idx < slotRects.length; idx++) {
                    const rect = slotRects[idx];
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        hoverIndex = idx;
                        break;
                    }
                }
                
                // Styling hover target feedback
                slots.forEach((s, idx) => {
                    if (idx === hoverIndex && idx !== index) {
                        s.classList.add('hover-target');
                    } else {
                        s.classList.remove('hover-target');
                    }
                });
            }
        };
        
        slot.onpointerup = slot.onpointercancel = (e) => {
            if (activePointerId !== e.pointerId) return;
            
            try {
                slot.releasePointerCapture(e.pointerId);
            } catch(err) {}
            
            activePointerId = null;
            document.body.classList.remove('drag-active');
            
            // Clean up hover states
            slots.forEach(s => s.classList.remove('hover-target'));
            
            if (isDragging) {
                slot.classList.remove('dragging');
                
                // Determine release hover index
                let hoverIndex = -1;
                for (let idx = 0; idx < slotRects.length; idx++) {
                    const rect = slotRects[idx];
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        hoverIndex = idx;
                        break;
                    }
                }
                
                if (hoverIndex !== -1 && hoverIndex !== index) {
                    // Check energy first
                    if (!spendEnergy(2.5)) {
                        slot.classList.add('swapping');
                        slot.style.transform = 'translate3d(0px, 0px, 0) scale(1.15) translateY(-12px)';
                        setTimeout(() => {
                            slot.classList.remove('swapping');
                            slot.style.transform = '';
                            selectedIndex = -1;
                            renderBoard();
                        }, 220);
                        return;
                    }
                    
                    // Premium Coordinated Swap Animation
                    const rectTarget = slotRects[hoverIndex];
                    const deltaX = rectTarget.left - rectSelected.left;
                    
                    const slotA = slot;
                    const slotB = slots[hoverIndex];
                    
                    slotA.classList.add('swapping');
                    slotB.classList.add('swapping');
                    
                    slotA.style.transform = `translate3d(${deltaX}px, 0px, 0) scale(1)`;
                    slotB.style.transform = `translate3d(${-deltaX}px, 0px, 0) scale(1)`;
                    
                    setTimeout(() => {
                        slotA.classList.remove('swapping');
                        slotB.classList.remove('swapping');
                        slotA.style.transform = '';
                        slotB.style.transform = '';
                        
                        const oldCorrect = countCorrectBottles();
                        
                        // Perform actual array swap
                        const temp = currentSequence[index];
                        currentSequence[index] = currentSequence[hoverIndex];
                        currentSequence[hoverIndex] = temp;
                        
                        sound.playClick();
                        
                        // Adventure Mode rules
                        const newCorrect = countCorrectBottles();
                        if (currentMode === 'adventure' && newCorrect <= oldCorrect) {
                            lives--;
                            updateLivesDisplay();
                            if (lives <= 0) {
                                gameOver();
                                selectedIndex = -1;
                                renderBoard();
                                return;
                            }
                        }
                        
                        selectedIndex = -1;
                        renderBoard();
                        
                        // Apply settling bounce
                        const newSlots = Array.from(container.children);
                        if (newSlots[index]) {
                            newSlots[index].classList.add('settling');
                            setTimeout(() => newSlots[index].classList.remove('settling'), 150);
                        }
                        if (newSlots[hoverIndex]) {
                            newSlots[hoverIndex].classList.add('settling');
                            setTimeout(() => newSlots[hoverIndex].classList.remove('settling'), 150);
                        }
                        
                        updateFeedback();
                        checkWin();
                    }, 220);
                } else {
                    // visual return animation
                    slot.classList.add('swapping');
                    slot.style.transform = 'translate3d(0px, 0px, 0) scale(1.15) translateY(-12px)';
                    setTimeout(() => {
                        slot.classList.remove('swapping');
                        slot.style.transform = '';
                        selectedIndex = -1;
                        renderBoard();
                    }, 220);
                }
            } else {
                // Simple click/tap behavior
                slot.classList.remove('selected');
                
                if (selectedIndex === -1) {
                    selectedIndex = index;
                    renderBoard();
                } else {
                    if (selectedIndex === index) {
                        selectedIndex = -1;
                        renderBoard();
                    } else {
                        // Check energy first
                        if (!spendEnergy(2.5)) {
                            selectedIndex = -1;
                            renderBoard();
                            return;
                        }
                        
                        // Premium click swap animated slide
                        const oldCorrect = countCorrectBottles();
                        const fromIdx = selectedIndex;
                        const toIdx = index;
                        
                        const slotA = slots[fromIdx];
                        const slotB = slots[toIdx];
                        
                        if (slotA && slotB) {
                            const rectA = slotRects[fromIdx];
                            const rectB = slotRects[toIdx];
                            const deltaX = rectB.left - rectA.left;
                            
                            slotA.classList.add('swapping');
                            slotB.classList.add('swapping');
                            
                            slotA.style.transform = `translate3d(${deltaX}px, 0px, 0) scale(1)`;
                            slotB.style.transform = `translate3d(${-deltaX}px, 0px, 0) scale(1)`;
                            
                            setTimeout(() => {
                                slotA.classList.remove('swapping');
                                slotB.classList.remove('swapping');
                                slotA.style.transform = '';
                                slotB.style.transform = '';
                                
                                const temp = currentSequence[fromIdx];
                                currentSequence[fromIdx] = currentSequence[toIdx];
                                currentSequence[toIdx] = temp;
                                
                                sound.playClick();
                                
                                const newCorrect = countCorrectBottles();
                                if (currentMode === 'adventure' && newCorrect <= oldCorrect) {
                                    lives--;
                                    updateLivesDisplay();
                                    if (lives <= 0) {
                                        gameOver();
                                        selectedIndex = -1;
                                        renderBoard();
                                        return;
                                    }
                                }
                                
                                selectedIndex = -1;
                                renderBoard();
                                
                                const newSlots = Array.from(container.children);
                                if (newSlots[fromIdx]) {
                                    newSlots[fromIdx].classList.add('settling');
                                    setTimeout(() => newSlots[fromIdx].classList.remove('settling'), 150);
                                }
                                if (newSlots[toIdx]) {
                                    newSlots[toIdx].classList.add('settling');
                                    setTimeout(() => newSlots[toIdx].classList.remove('settling'), 150);
                                }
                                
                                updateFeedback();
                                checkWin();
                            }, 220);
                        } else {
                            // fallback click swap if layout clashing
                            const temp = currentSequence[selectedIndex];
                            currentSequence[selectedIndex] = currentSequence[index];
                            currentSequence[index] = temp;
                            selectedIndex = -1;
                            renderBoard();
                            updateFeedback();
                            checkWin();
                        }
                    }
                }
            }
        };
    });
}

function renderBottles(containerId, sequence, isInteractive, hideColors) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.style.justifyContent = 'center';
    
    sequence.forEach((color, index) => {
        const bottleDOM = createBottleDOM({
            color,
            skinId: currentSkin,
            hidden: hideColors,
            isInteractive,
            isSelected: index === selectedIndex,
            index
        });
        container.appendChild(bottleDOM);
    });

    if (containerId === 'top-row' && isInteractive) {
        initDragAndDrop(container);
    }
}

function renderArrows() {
    const container = document.querySelector('.arrows-row');
    container.innerHTML = '';
    container.style.justifyContent = 'center';
    
    for (let i = 0; i < currentNumBottles; i++) {
        const arrow = document.createElement('div');
        arrow.className = 'arrow';
        arrow.textContent = 'â†“';
        container.appendChild(arrow);
    }
}

function handleBottleClick(index) {
    if (!isPlaying) return;
    
    const topRow = document.getElementById('top-row');
    if (!topRow) return;
    
    if (selectedIndex === -1) {
        selectedIndex = index;
        topRow.children[index].classList.add('selected');
        sound.playSelect();
    } else {
        if (selectedIndex === index) {
            topRow.children[index].classList.remove('selected');
            selectedIndex = -1;
            sound.playClick();
        } else {
            // Check energy first
            if (!spendEnergy(2.5)) {
                topRow.children[selectedIndex].classList.remove('selected');
                selectedIndex = -1;
                return;
            }
            
            const oldCorrect = countCorrectBottles();
            
            // Perform instant state swap
            const temp = currentSequence[selectedIndex];
            currentSequence[selectedIndex] = currentSequence[index];
            currentSequence[index] = temp;
            
            sound.playClick();
            
            // Calculate new correct count and apply gameplay rules instantly
            const newCorrect = countCorrectBottles();
            if (currentMode === 'adventure' && newCorrect <= oldCorrect) {
                lives--;
                updateLivesDisplay();
                if (lives <= 0) {
                    gameOver();
                    selectedIndex = -1;
                    renderBoard();
                    return;
                }
            }
            
            selectedIndex = -1;
            renderBoard();
            updateFeedback();
            checkWin();
        }
    }
}

function updateLivesDisplay() {
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += 'â¤ï¸';
    document.getElementById('lives-display').textContent = hearts || 'ðŸ’€';
}

function gameOver() {
    isPlaying = false;
    clearInterval(timerInterval);
    sound.playGameOver();
    
    // Deduct 5 energy on loss
    setEnergy(getEnergy() - LOSE_COST);
    
    document.getElementById('win-message').classList.remove('hidden');
    document.getElementById('win-message').innerHTML = `<h2 style="color:red;">GAME OVER!</h2><p style="font-size:1rem; margin-top:10px;">You ran out of lives.</p><button class="game-btn reset-btn" style="margin-top:15px" onclick="showScreen('main-menu')">Main Menu</button>`;
}

function countCorrectBottles() {
    let count = 0;
    for (let i = 0; i < currentNumBottles; i++) {
        if (targetSequence[i] === currentSequence[i]) {
            count++;
        }
    }
    return count;
}

function updateFeedback() {
    const correctCount = countCorrectBottles();
    const feedbackEl = document.getElementById('feedback-text');
    feedbackEl.textContent = `Correct Bottles: ${correctCount} / ${currentNumBottles}`;
    
    if (correctCount === currentNumBottles) {
        feedbackEl.style.color = '#00e676';
        feedbackEl.style.textShadow = '0 0 10px #00e676';
    } else if (correctCount > 0) {
        feedbackEl.style.color = '#ffb74d';
        feedbackEl.style.textShadow = '0 0 10px #ffb74d';
    } else {
        feedbackEl.style.color = '#fff';
        feedbackEl.style.textShadow = 'none';
    }
}

function checkWin() {
    if (countCorrectBottles() === currentNumBottles) {
        sound.playWin();
        isPlaying = false;
        isHidden = false; // Reveal bottom row colors
        clearInterval(timerInterval);
        
        renderBoard();
        updateFeedback();
        
        if (currentMode === 'multiplayer') {
            if (currentPlayer === 1) {
                player1Time = timeElapsed;
                document.getElementById('p1-time-display').textContent = player1Time;
                
                document.getElementById('intermission-title').textContent = "PLAYER 1 FINISHED!";
                document.getElementById('intermission-time').classList.remove('hidden');
                document.getElementById('intermission-pass-text').textContent = "Pass the device to Player 2.";
                document.getElementById('intermission-btn').textContent = "Start Player 2";
                document.getElementById('intermission-btn').onclick = startPlayer2;
                
                document.getElementById('multiplayer-intermission-modal').classList.remove('hidden');
            } else {
                player2Time = timeElapsed;
                document.getElementById('res-p1-time').textContent = player1Time;
                document.getElementById('res-p2-time').textContent = player2Time;
                
                const winnerText = document.getElementById('mp-winner-text');
                if (player1Time < player2Time) {
                    winnerText.textContent = "PLAYER 1 WINS!";
                    winnerText.style.color = "#00e676";
                } else if (player2Time < player1Time) {
                    winnerText.textContent = "PLAYER 2 WINS!";
                    winnerText.style.color = "#00e5ff";
                } else {
                    winnerText.textContent = "IT'S A TIE!";
                    winnerText.style.color = "#ffea00";
                }
                
                document.getElementById('multiplayer-results-modal').classList.remove('hidden');
            }
            return;
        }

        document.getElementById('win-message').classList.remove('hidden');
        
        if (currentMode === 'adventure' && currentLevel >= 10) {
            document.getElementById('win-message').innerHTML = `<h2 style="color:#00e676;">ADVENTURE CLEARED!</h2><p style="font-size:1rem; margin-top:10px;">You are a bottle master.</p><button class="game-btn reset-btn" style="margin-top:15px" onclick="showScreen('main-menu')">Main Menu</button>`;
            return;
        }
        
        if (currentMode === 'daily') {
            localStorage.setItem('bottleOrderDailyLastPlayed', new Date().toDateString());
            localStorage.setItem('bottleOrderDailyStatus', 'win');
            document.getElementById('win-message').innerHTML = `<h2 style="color:#00e676;">DAILY CLEARED!</h2><p style="font-size:1rem; margin-top:10px;">Come back tomorrow for a new puzzle!</p><button class="game-btn reset-btn" style="margin-top:15px" onclick="showScreen('main-menu')">Main Menu</button>`;
            return;
        }

        if (currentMode === 'knockout') {
            timeLeft += 10; // Bonus time!
            document.getElementById('time-display').textContent = timeLeft;
            document.getElementById('win-message').innerHTML = `<h2 style="color:#ffb74d;">LEVEL ${currentLevel} CLEAR!</h2><h3 style="color:#00e676; margin-top:10px;">+10 SECONDS!</h3><p style="font-size:1rem; margin-top:10px;">Starting next level in 3s...</p>`;
        } else {
            document.getElementById('win-message').innerHTML = `<h2 style="color:#00e676;">LEVEL ${currentLevel} CLEAR!</h2><p style="font-size:1rem; margin-top:10px;">Starting next level in 3s...</p>`;
        }
        
        setTimeout(() => {
            currentLevel++;
            localStorage.setItem('bottleOrderLevel', currentLevel);
            initLevel();
            startLevelPlay();
        }, 3000);
    }
}

function startPlayer2() {
    document.getElementById('multiplayer-intermission-modal').classList.add('hidden');
    currentPlayer = 2;
    initLevel();
    startLevelPlay();
}

function nextMultiplayerRound() {
    document.getElementById('multiplayer-results-modal').classList.add('hidden');
    currentPlayer = 1;
    currentLevel++;
    localStorage.setItem('bottleOrderLevel', currentLevel);
    multiplayerSeed = Math.random().toString();
    
    document.getElementById('intermission-title').textContent = `ROUND ${currentLevel}`;
    document.getElementById('intermission-time').classList.add('hidden');
    document.getElementById('intermission-pass-text').textContent = "Pass the device back to Player 1.";
    document.getElementById('intermission-btn').textContent = "Start Player 1";
    document.getElementById('intermission-btn').onclick = startPlayer1;
    
    document.getElementById('multiplayer-intermission-modal').classList.remove('hidden');
}

function startPlayer1() {
    document.getElementById('multiplayer-intermission-modal').classList.add('hidden');
    initLevel();
    startLevelPlay();
}

window.addEventListener('load', () => {
    updateEnergyUI();
    // Scroll lock removed to enable normal scrolling on menu pages
    // Generate magic particles for the background
    const particlesContainer = document.getElementById('magic-particles');
    if (particlesContainer) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'magic-particle';
            // Random properties
            const size = Math.random() * 4 + 2; // 2px to 6px
            const left = Math.random() * 100; // 0% to 100% vw
            const duration = Math.random() * 5 + 5; // 5s to 10s
            const delay = Math.random() * 5; // 0s to 5s delay
            const colors = ['#fff', '#00E5FF', '#D16BFF', '#A6FF00'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}vw`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.color = color; // For box-shadow
            particle.style.backgroundColor = color;
            
            particlesContainer.appendChild(particle);
        }
    }

    // Add a slight delay so it acts as a true splash screen
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.remove(); // Delete forever so it doesn't block
            }, 600);
        }
    }, 800);

    // Update home and classic screen rank displays
    updateMainMenuRank();
});
