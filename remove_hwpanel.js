const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("import LiveHardwarePanel from '@/components/live-hardware-panel'\n", "");
c = c.replace("<div style={{marginBottom:\"12px\"}}><LiveHardwarePanel /></div>", "");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
