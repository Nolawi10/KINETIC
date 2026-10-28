const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim/event-stream.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("const { state, actions } = useSensorSim();", "const sim = useSensorSim() as any; const state = sim.state || sim; const actions = sim.actions || { setSourceFilter: (f:any)=>sim.setSourceFilter && sim.setSourceFilter(f) };");
c = c.replace("events.filter((event) => event.source === sourceFilter)", "events.filter((event:any) => event.source === sourceFilter)");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
