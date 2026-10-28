const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx';
const data = fs.readFileSync(p, 'utf8');
const lines = data.split('\n');
const out = [];
out.push(lines.length);
for (let i = 29; i < 170 && i < lines.length; i++) {
  out.push((i+1) + ':' + lines[i]);
}
fs.writeFileSync('E:/Kinetic Models/dummy_out2.txt', out.join('\n'));
console.log('done');
