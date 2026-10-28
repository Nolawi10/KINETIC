const fs = require('fs');
for (const p of ['E:/Kinetic Models/Frontend/src/components/sensor-sim/event-stream.tsx', 'E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx']) {
  let c = fs.readFileSync(p,'utf8');
  const name = p.includes('event') ? 'EventStream' : 'DummyPanel';
  // remove all trailing export lines
  c = c.replace(/\nexport\s+\{[^}]+\};?\n*/g, '\n');
  c = c.replace(/\nexport\s+default\s+[^\n]+;?\n*/g, '\n');
  // ensure component exported
  if(c.indexOf('export function ' + name) === -1 && c.indexOf('export const ' + name) === -1 && c.indexOf('function ' + name) !== -1) {
    c = c.replace('function ' + name, 'export function ' + name);
  }
  c = c.trim() + '\n\nexport { ' + name + ' };\nexport default ' + name + ';\n';
  fs.writeFileSync(p,c,'utf8');
}
console.log('done');
