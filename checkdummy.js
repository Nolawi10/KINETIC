const fs=require('fs');
const s=fs.readFileSync('E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx','utf8');
const lines=s.split('\n');
console.log(lines.length);
for (let i=29; i<lines.length && i<150; i++) console.log((i+1)+':'+lines[i]);
