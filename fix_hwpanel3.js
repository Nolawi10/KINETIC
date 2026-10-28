const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("const node = devices.find(d => d.node_id === 'kinetic_dummy_01') || devices[0];", "const node = (devices && Array.isArray(devices)) ? (devices.find((d:any) => d.node_id === 'kinetic_dummy_01') || devices[0]) : null;");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
