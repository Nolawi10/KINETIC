const fs = require('fs');
for (const [p, from, to] of [
  ['E:/Kinetic Models/Frontend/src/components/sensor-sim/event-stream.tsx', 'SensorEventStream', 'EventStream'],
  ['E:/Kinetic Models/Frontend/src/components/sensor-sim/dummy-panel.tsx', 'DummyHitPanel', 'DummyPanel'],
]) {
  try {
    let c = fs.readFileSync(p,'utf8');
    if(c.indexOf(from) !== -1 && c.indexOf(to) === -1) {
      c = c.split(from).join(to);
      fs.writeFileSync(p,c,'utf8');
      console.log('renamed', to);
    } else {
      console.log('skip', p);
    }
  } catch(e) { console.log(e.message); }
}
