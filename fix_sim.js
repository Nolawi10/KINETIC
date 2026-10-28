const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-simulator.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace('SensorEventStream', 'EventStream');
fs.writeFileSync(p,c,'utf8');
console.log('ok');
