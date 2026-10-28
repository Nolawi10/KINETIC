const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-simulator.tsx';
let c = fs.readFileSync(p,'utf8');
const lines = c.split('\n');
const out = [];
for (let l of lines) {
  if (l.includes('./sensor-sim/dummy-panel')) continue;
  out.push(l);
}
fs.writeFileSync(p, out.join('\n'), 'utf8');
console.log('ok');
