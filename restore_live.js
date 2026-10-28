const fs = require('fs');
const AdmZip = require('adm-zip');
const z = new AdmZip('E:/Kinetic Models/.backup/frontend-src-20261022-195741.zip');
const entry = z.getEntry('src/routes/live.tsx');
let s = entry.getData().toString('utf8');
if(s.indexOf('SensorSimulator') === -1) {
  s = "import SensorSimulator from '@/components/sensor-simulator'\n" + s;
}
if(s.indexOf('DummyPanel') === -1) {
  s = "import DummyPanel from '@/components/sensor-sim/dummy-panel'\n" + s;
}
if(s.indexOf('EventStream') === -1) {
  s = "import EventStream from '@/components/sensor-sim/event-stream'\n" + s;
}
const old = '<TacticalCamera paused={false} />';
const neu = '<TacticalCamera paused={false} /><div style={{marginTop:"10px"}}><Instrument title="SENSOR SIMULATOR" tag="DUMMY"><SensorSimulator /></Instrument></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"10px"}}><Instrument title="DUMMY PANEL" tag="IMPACT ZONES"><DummyPanel /></Instrument><Instrument title="EVENT STREAM" tag="LIVE"><EventStream /></Instrument></div>';
if(s.indexOf(old) !== -1 && s.indexOf('SensorSimulator') < s.indexOf(old)) {
  s = s.replace(old, neu);
}
fs.writeFileSync('E:/Kinetic Models/Frontend/src/routes/live.tsx', s, 'utf8');
console.log('done');
