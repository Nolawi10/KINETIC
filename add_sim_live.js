const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(p,'utf8');
if(c.indexOf('SensorSimulator') === -1) {
  c = "import SensorSimulator from '@/components/sensor-simulator'\n" + c;
}
const old = '<TacticalCamera paused={paused}/>';
const neu = '<TacticalCamera paused={paused}/><div style={{marginTop:"10px"}}><Instrument title="SENSOR SIMULATOR" tag="DUMMY"><SensorSimulator /></Instrument></div>';
if(c.indexOf(old) !== -1 && c.indexOf('SENSOR SIMULATOR') === -1) {
  c = c.replace(old, neu);
}
fs.writeFileSync(p,c,'utf8');
console.log('ok');
