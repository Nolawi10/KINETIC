const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(p,'utf8');
if(c.indexOf('SensorSimulator') === -1) {
  c = "import { SensorSimulator } from '@/components/sensor-simulator'\n" + c;
}
if(c.indexOf('DummyPanel') === -1) {
  c = "import { DummyPanel } from '@/components/sensor-sim/dummy-panel'\n" + c;
}
if(c.indexOf('EventStream') === -1) {
  c = "import { EventStream } from '@/components/sensor-sim/event-stream'\n" + c;
}
const old2 = '<TacticalCamera paused={false} />';
const new2 = '<TacticalCamera paused={false} /><div style={{marginTop:"10px"}}><Instrument title="SENSOR SIMULATOR" tag="DUMMY"><SensorSimulator /></Instrument></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"10px"}}><Instrument title="DUMMY PANEL" tag="IMPACT ZONES"><DummyPanel /></Instrument><Instrument title="EVENT STREAM" tag="LIVE"><EventStream /></Instrument></div>';
if(c.indexOf(old2) !== -1 && c.indexOf('SensorSimulator') === c.indexOf(old2)+old2.length) {
  // check
}
if(c.indexOf(old2) !== -1 && c.split(old2)[0].indexOf('SensorSimulator') === -1) {
  c = c.replace(old2, new2);
}
fs.writeFileSync(p,c,'utf8');
console.log('done');
