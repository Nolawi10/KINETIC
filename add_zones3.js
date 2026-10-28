const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim-analytics.tsx';
let c = fs.readFileSync(p,'utf8');
if(c.indexOf('HIT ZONES') === -1) {
  const add = "\n      <Instrument title=\"HIT ZONES\" tag=\"DUMMY/MAT\">\n        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',textAlign:'center'}}>\n          <div><div className=\"micro-label\">HEAD</div><strong>-</strong></div>\n          <div><div className=\"micro-label\">CHEST</div><strong>-</strong></div>\n          <div><div className=\"micro-label\">LEFT_WAIST</div><strong>-</strong></div>\n          <div><div className=\"micro-label\">RIGHT_WAIST</div><strong>-</strong></div>\n        </div>\n      </Instrument>\n";
  c = c + add;
  fs.writeFileSync(p,c,'utf8');
  console.log('done');
} else {
  console.log('ok');
}
