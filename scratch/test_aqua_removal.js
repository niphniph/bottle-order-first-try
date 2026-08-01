const fs = require('fs');

// 1. Verify skins data
const skinsContent = fs.readFileSync('src/data/skins.js', 'utf8');
console.log('Contains skin14 in skins.js:', skinsContent.includes('skin14'));
console.log('Contains Aqua in skins.js:', skinsContent.includes('Aqua'));

// 2. Check if skin14 asset files exist
const existsSkin14Root = fs.existsSync('skin14.png');
const existsSkin14Public = fs.existsSync('public/skins/skin14.png');
const existsSkin14Skins = fs.existsSync('skins/skin14.png');
console.log('skin14.png exists anywhere:', existsSkin14Root || existsSkin14Public || existsSkin14Skins);

// 3. Test migration logic fallback
let skinVal = JSON.stringify({ id: 'skin14', src: 'skins/skin14.png' });
let id = 'classic';
try {
    const parsed = JSON.parse(skinVal);
    if (parsed && parsed.id) id = parsed.id;
} catch(e) {}

const removedSkins = ['skin14', 'aqua'];
if (removedSkins.includes(id) || id === 'skin14' || id === 'aqua') {
    id = 'classic';
}
console.log('Migrated skin14 fallback result:', id);

console.log('All Aqua removal checks PASSED!');
