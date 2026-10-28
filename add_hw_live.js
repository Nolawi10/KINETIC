const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(p,'utf8');
if(c.indexOf('LiveHardwarePanel') === -1) {
  c = "import LiveHardwarePanel from '@/components/live-hardware-panel'\n" + c;
}
const old = '<div className="live-layout">';
const neu = '<div style={{marginBottom:"12px"}}><LiveHardwarePanel /></div><div className="live-layout">';
if(c.indexOf(old) !== -1 && c.indexOf('LiveHardwarePanel') < c.indexOf(old)) {
  c = c.replace(old, neu);
}
fs.writeFileSync(p,c,'utf8');
console.log('ok');
