const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("const node = Array.isArray(devices) ? (devices.find((d:any) => d.node_id === 'kinetic_dummy_01') || devices[0]) : null;", "const nodeArr: any[] = Array.isArray(devices) ? devices : []; const node = nodeArr.find((d:any) => d.node_id === 'kinetic_dummy_01') || nodeArr[0];");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
