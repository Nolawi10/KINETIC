const fs=require('fs');
const p='E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx';
const c=fs.readFileSync(p,'utf8');
console.log(c.split('\n').length);
console.log(c.slice(0,2000));
