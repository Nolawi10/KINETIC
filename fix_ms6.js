const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('      const tid = (track && (track as any).id) ? (track as any).id : undefined; if (tid) savePrefs({ currentTrack: tid as any });',
              '      const tid = (track && (track as any).id) ? (track as any).id : undefined; if (tid) (savePrefs as any)({ currentTrack: tid });');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
