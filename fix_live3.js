const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("import DummyPanel from '@/components/sensor-sim/dummy-panel'\n", "");
c = c.replace("import EventStream from '@/components/sensor-sim/event-stream'\n", "");
c = c.replace("<div style={{display:\"grid\",gridTemplateColumns:\"1fr 1fr\",gap:\"10px\",marginTop:\"10px\"}}><Instrument title=\"DUMMY PANEL\" tag=\"IMPACT ZONES\"><DummyPanel /></Instrument><Instrument title=\"EVENT STREAM\" tag=\"LIVE\"><EventStream /></Instrument></div>", "");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
