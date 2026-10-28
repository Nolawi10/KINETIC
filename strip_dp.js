const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace(/\nexport\s+\{[^}]+\};?\n*$/s, '\n');
c = c.replace(/\nexport\s+default\s+[^\n]+;?\n*$/s, '\n');
c = c.trim() + '\n\nexport default DummyPanel;\n';
fs.writeFileSync(p,c,'utf8');
console.log('ok');
