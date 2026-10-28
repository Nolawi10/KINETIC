const fs = require('fs');
const AdmZip = require('adm-zip');
const z = new AdmZip('E:/Kinetic Models/.backup/frontend-src-20261022-195741.zip');
let s = z.getEntry('src/routes/live.tsx').getData().toString('utf8');
s = "import SensorSimulator from '@/components/sensor-simulator'\n" + s;
s = s.replace('<TacticalCamera paused={false} />', '<TacticalCamera paused={false} /><div style={{marginTop:"10px"}}><Instrument title="SENSOR SIMULATOR" tag="DUMMY"><SensorSimulator /></Instrument></div>');
fs.writeFileSync('E:/Kinetic Models/Frontend/src/routes/live.tsx', s, 'utf8');
console.log('ok');
