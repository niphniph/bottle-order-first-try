// Cache for skin images
const skinImageCache = {};
const skinImageCallbacks = {};
const processedSkinCache = {};

function removeSkinBackground(img) {
    const canvas = document.createElement('canvas');
    const w = 512;
    const h = 512;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    // Sample border pixels to find background color candidates
    const borderSamples = [];
    const step = 16;
    for (let x = 0; x < w; x += step) {
        borderSamples.push(getPixel(x, 0));
        borderSamples.push(getPixel(x, h - 1));
    }
    for (let y = 0; y < h; y += step) {
        borderSamples.push(getPixel(0, y));
        borderSamples.push(getPixel(w - 1, y));
    }
    
    function getPixel(x, y) {
        const idx = (y * w + x) * 4;
        return [data[idx], data[idx + 1], data[idx + 2]];
    }
    
    const visited = new Uint8Array(w * h);
    const queue = [];
    
    // Initialize BFS with all border pixels
    for (let x = 0; x < w; x++) {
        const idxTop = 0 * w + x;
        visited[idxTop] = 1;
        queue.push(idxTop);
        
        const idxBottom = (h - 1) * w + x;
        visited[idxBottom] = 1;
        queue.push(idxBottom);
    }
    for (let y = 1; y < h - 1; y++) {
        const idxLeft = y * w + 0;
        visited[idxLeft] = 1;
        queue.push(idxLeft);
        
        const idxRight = y * w + (w - 1);
        visited[idxRight] = 1;
        queue.push(idxRight);
    }
    
    function colorDistance(c1, c2) {
        return Math.sqrt(
            (c1[0] - c2[0]) ** 2 +
            (c1[1] - c2[1]) ** 2 +
            (c1[2] - c2[2]) ** 2
        );
    }
    
    const threshold = 85; // Aggressive background sample matching threshold
    
    let head = 0;
    while (head < queue.length) {
        const idx = queue[head++];
        const x = idx % w;
        const y = Math.floor(idx / w);
        
        const offset = idx * 4;
        const color = [data[offset], data[offset + 1], data[offset + 2]];
        
        let isBg = false;
        // Check matching with border samples
        for (const sample of borderSamples) {
            if (colorDistance(color, sample) < threshold) {
                isBg = true;
                break;
            }
        }
        // OR check if pixel is off-white (aggressively removes solid white/off-white frames)
        if (!isBg) {
            if (color[0] > 180 && color[1] > 180 && color[2] > 180) {
                isBg = true;
            }
        }
        
        if (isBg) {
            data[offset + 3] = 0; // make 100% transparent
            
            // Push neighbors
            if (x > 0 && !visited[idx - 1]) { visited[idx - 1] = 1; queue.push(idx - 1); }
            if (x < w - 1 && !visited[idx + 1]) { visited[idx + 1] = 1; queue.push(idx + 1); }
            if (y > 0 && !visited[idx - w]) { visited[idx - w] = 1; queue.push(idx - w); }
            if (y < h - 1 && !visited[idx + w]) { visited[idx + w] = 1; queue.push(idx + w); }
        }
    }
    
    // Erode edge halos and off-white anti-aliasing residues thoroughly with digital defringing (4 passes)
    for (let pass = 0; pass < 4; pass++) {
        const tempAlpha = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
            tempAlpha[i] = data[i * 4 + 3];
        }
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                if (tempAlpha[idx] > 0) {
                    const hasTransNeighbor = 
                        tempAlpha[idx - 1] === 0 || 
                        tempAlpha[idx + 1] === 0 || 
                        tempAlpha[idx - w] === 0 || 
                        tempAlpha[idx + w] === 0 ||
                        tempAlpha[idx - 1 - w] === 0 ||
                        tempAlpha[idx + 1 - w] === 0 ||
                        tempAlpha[idx - 1 + w] === 0 ||
                        tempAlpha[idx + 1 + w] === 0;
                    
                    if (hasTransNeighbor) {
                        const offset = idx * 4;
                        const color = [data[offset], data[offset + 1], data[offset + 2]];
                        
                        // Pixel defringing: clear edge white fringes and fade out light gray borders
                        if (color[0] > 140 && color[1] > 140 && color[2] > 140) {
                            data[offset + 3] = 0;
                        } else {
                            const brightness = (color[0] + color[1] + color[2]) / 3;
                            if (brightness > 100) {
                                const factor = (255 - brightness) / 155;
                                data[offset + 3] = Math.round(data[offset + 3] * factor);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Convert to grayscale and apply brightness/contrast adjustments on the CPU
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip fully transparent pixels
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        let v = 0.299 * r + 0.587 * g + 0.114 * b;
        v = v * 1.25;
        v = (v - 128) * 1.15 + 128;
        v = Math.max(0, Math.min(255, v));
        
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
    }
    
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

function getSkinImageElement(src, callback) {
    if (processedSkinCache[src]) {
        callback(processedSkinCache[src]);
        return processedSkinCache[src];
    }
    
    if (skinImageCache[src]) {
        const img = skinImageCache[src];
        if (img.complete) {
            if (!processedSkinCache[src]) {
                processedSkinCache[src] = removeSkinBackground(img);
            }
            callback(processedSkinCache[src]);
        } else {
            if (!skinImageCallbacks[src]) {
                skinImageCallbacks[src] = [];
            }
            skinImageCallbacks[src].push(callback);
        }
        return img;
    }
    
    const img = new Image();
    skinImageCache[src] = img;
    skinImageCallbacks[src] = [callback];
    
    img.onload = () => {
        const processedCanvas = removeSkinBackground(img);
        processedSkinCache[src] = processedCanvas;
        if (skinImageCallbacks[src]) {
            skinImageCallbacks[src].forEach(cb => cb(processedCanvas));
            delete skinImageCallbacks[src];
        }
    };
    img.onerror = () => {
        img.src = '/skins/skin1.png';
    };
    img.src = src;
    return img;
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
    const cachedProcessed = processedSkinCache[bottleSrc];
    if (cachedProcessed) {
        renderBottleToCanvas(canvas, cachedProcessed, colorHex, hidden);
    } else {
        getSkinImageElement(bottleSrc, (img) => {
            renderBottleToCanvas(canvas, img, colorHex, hidden);
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
            const currentCached = processedSkinCache[bottleSrc];
            if (currentCached) {
                renderBottleToCanvas(canvas, currentCached, newColorHex, hidden);
            } else {
                getSkinImageElement(bottleSrc, (img) => {
                    renderBottleToCanvas(canvas, img, newColorHex, hidden);
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
