const fs=require('fs');
const p='E:/Kinetic Models/Frontend/src/components/sensor-sim/mat-panel.tsx';
console.log(fs.readFileSync(p,'utf8').split('\n').length);
