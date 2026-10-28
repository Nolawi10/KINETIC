const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace('<strong style={{ color: delta > 0 ? \'#ef4444\' : delta < 0 ? \'#f59e0b\' : \'inherit\' }}>{delta}</strong>', '<strong style={{ color: typeof delta === \'number\' && delta > 0 ? \'#ef4444\' : typeof delta === \'number\' && delta < 0 ? \'#f59e0b\' : \'inherit\' }}>{typeof delta === \'number\' ? delta : delta}</strong>');
fs.writeFileSync(p,c,'utf8');
console.log('ok');
