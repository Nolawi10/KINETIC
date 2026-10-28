const fs=require('fs');
const p='E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx';
const c=fs.readFileSync(p,'utf8');
const lines=c.split('\n');
console.log(lines.length);
console.log(lines.slice(200,280).join('\n'));
