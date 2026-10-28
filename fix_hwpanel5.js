const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("const node = nodeArr.find((d:any) => d.node_id === 'kinetic_dummy_01') || nodeArr[0];", "const node = (nodeArr as any[]).find((d:any) => d.node_id === 'kinetic_dummy_01') || (nodeArr as any[])[0];");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
