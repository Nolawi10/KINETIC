const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(p,'utf8');
c = c.replace("import { SensorSimulator } from '@/components/sensor-simulator'\n", "import SensorSimulator from '@/components/sensor-simulator'\n");
c = c.replace("import { EventStream } from '@/components/sensor-sim/event-stream'\n", "import EventStream from '@/components/sensor-sim/event-stream'\n");
c = c.replace("import { DummyPanel } from '@/components/sensor-sim/dummy-panel'\n", "import DummyPanel from '@/components/sensor-sim/dummy-panel'\n");
fs.writeFileSync(p,c,'utf8');
console.log('ok');
