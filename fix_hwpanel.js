const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("typeof delta === 'number' && delta > 0 ? '#ef4444' : typeof delta === 'number' && delta < 0 ? '#f59e0b' : 'inherit'", "typeof delta === 'number' && delta > 0 ? '#ef4444' : typeof delta === 'number' && delta < 0 ? '#f59e0b' : 'inherit'");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
