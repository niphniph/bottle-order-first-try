const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = {
    addEventListener: () => {}
};
global.Image = function() {
    return {
        onload: () => {},
        onerror: () => {},
        src: ''
    };
};
global.MutationObserver = function() {
    return {
        observe: () => {},
        disconnect: () => {}
    };
};
global.document = {
    getElementById: () => ({
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {} },
        textContent: '',
        style: {}
    }),
    querySelector: () => ({
        innerHTML: '',
        style: {},
        appendChild: () => {}
    }),
    createElement: (tag) => {
        return {
            tagName: tag,
            appendChild: () => {},
            classList: { add: () => {}, remove: () => {} },
            style: {},
            getContext: () => ({
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                clip: () => {},
                fillRect: () => {},
                drawImage: () => {},
                stroke: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                quadraticCurveTo: () => {}
            })
        };
    },
    addEventListener: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.SoundSystem = function() {
    return { playSelect: () => {}, playClick: () => {} };
};

// Read index.html script tag contents
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.error("Script tag not found in index.html");
    process.exit(1);
}

let scriptCode = scriptMatch[1];
// Intercept rendering functions to print inputs
scriptCode = scriptCode
  .replace("const processedSkinCache = {};", "const processedSkinCache = {}; global.processedSkinCache = processedSkinCache;")
  .replace("function renderBottleToCanvas(canvas, skinImageElement, colorHex, isHidden) {", 
           "function renderBottleToCanvas(canvas, skinImageElement, colorHex, isHidden) { console.log('-> renderBottleToCanvas colorHex:', colorHex);")
  .replace("function BottleImage({ color, hidden, isSelected = false, className = '' }) {",
           "function BottleImage({ color, hidden, isSelected = false, className = '' }) { console.log('-> BottleImage color:', color);");

// Eval the script code to load functions and variables
eval(scriptCode);

// Test initLevel
console.log("Initializing level...");
currentMode = 'classic';
currentLevel = 4;
processedSkinCache['/skins/skin1.png'] = document.createElement('canvas');
// Force mock elements to print appends
document.getElementById = (id) => {
    return {
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {} },
        textContent: '',
        style: {}
    };
};
initLevel();

process.exit(0);
