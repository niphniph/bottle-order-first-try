import { getSelectedBottleSkinSrc } from "../utils/selectedSkin.js";

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
            // Render custom skin silhouette
            // 1. Draw the white outline around the skin shape
            ctx.save();
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(skinImageElement, 0, 0, w, h);
            
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
            ctx.drawImage(skinImageElement, 0, 0, w, h);
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
          d="M44 8 H56 V34 L67 52 V118 Q67 124 61 124 H39 Q33 124 33 118 V52 L44 34 Z"
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
        const cachedProcessed = processedSkinCache[bottleSrc];
        if (cachedProcessed) {
            renderBottleToCanvas(canvas, cachedProcessed, colorHex, hidden);
        } else {
            getSkinImageElement(bottleSrc, (img) => {
                renderBottleToCanvas(canvas, img, colorHex, hidden);
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
                const currentCached = processedSkinCache[bottleSrc];
                if (currentCached) {
                    renderBottleToCanvas(canvas, currentCached, newColorHex, hidden);
                } else {
                    getSkinImageElement(bottleSrc, (img) => {
                        renderBottleToCanvas(canvas, img, newColorHex, hidden);
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
