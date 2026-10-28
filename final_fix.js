const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx';
let c = fs.readFileSync(p,'utf8');
// replace last occurrence
const idx = c.lastIndexOf('export default DummyPanel');
if(idx >= 0) {
  // truncate after function end
  // find function end
}
fs.writeFileSync(p,c,'utf8');
console.log('ok');
