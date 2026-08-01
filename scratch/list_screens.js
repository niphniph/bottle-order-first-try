const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const regex = /<div\s+[^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*screen/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log(match[1]);
}
