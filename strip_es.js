const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim/event-stream.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace(/\nexport\s+\{[^}]+\};?\n*$/s, '\n');
c = c.replace(/\nexport\s+default\s+[^\n]+;?\n*$/s, '\n');
if(c.indexOf('export default EventStream') === -1) {
  c = c.trim() + '\n\nexport default EventStream;\n';
}
fs.writeFileSync(p,c,'utf8');
console.log('ok');
