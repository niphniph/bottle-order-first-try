const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('HTML length:', html.length);
console.log('Contains global-back-menu-button:', html.includes('id="global-back-menu-button"'));
console.log('Contains top: 90px:', html.includes('top: 90px !important;'));
console.log('Contains left: 20px:', html.includes('left: 20px !important;'));
console.log('Contains z-index: 999999:', html.includes('z-index: 999999 !important;'));
