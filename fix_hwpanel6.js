const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace('const nodeArr = Array.isArray(devices) ? devices : [];', 'const nodeArr: any[] = Array.isArray(devices) ? devices : [];');
c = c.replace("const node: any = nodeArr.find((d:any)=>d.node_id==='kinetic_dummy_01') || nodeArr[0] || null;", "const node: any = (nodeArr.find((d:any)=>d && d.node_id==='kinetic_dummy_01')) || nodeArr[0] || null;");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
