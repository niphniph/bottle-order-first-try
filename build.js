const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Recursive copy helper
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItem => {
            copyDir(path.join(src, childItem), path.join(dest, childItem));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Files to copy from root
const filesToCopy = [
    'index.html',
    'style.css',
    'script.js',
    'shop.html'
];

// Add all media files from the root
const files = fs.readdirSync(__dirname);
files.forEach(file => {
    if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.svg') || file.endsWith('.webp') || file.endsWith('.mp3') || file.endsWith('.wav')) {
        filesToCopy.push(file);
    }
});

console.log('Building to dist directory...');

// Copy root files
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file}`);
    } else {
        console.warn(`Warning: File not found - ${file}`);
    }
});

// Copy contents of public/ to dist/ (e.g. public/skins -> dist/skins)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
    fs.readdirSync(publicDir).forEach(child => {
        copyDir(path.join(publicDir, child), path.join(distDir, child));
    });
    console.log('Copied public/ contents to dist/');
}

// Copy src/ to dist/src/
const srcDir = path.join(__dirname, 'src');
if (fs.existsSync(srcDir)) {
    copyDir(srcDir, path.join(distDir, 'src'));
    console.log('Copied src/ to dist/src/');
}

console.log('Build complete!');

// Copy all compiled assets from dist/ to dist/tracker/ for subpath hosting
const trackerDir = path.join(distDir, 'tracker');
if (!fs.existsSync(trackerDir)) {
    fs.mkdirSync(trackerDir, { recursive: true });
}
fs.readdirSync(distDir).forEach(item => {
    if (item === 'tracker') return;
    copyDir(path.join(distDir, item), path.join(trackerDir, item));
});
console.log('Duplicated build folder to dist/tracker/ for subpath hosting');
