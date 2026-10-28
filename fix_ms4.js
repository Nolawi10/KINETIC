const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('      if (track && (track as any).id) savePrefs({ currentTrack: (track as any).id });',
              '      const tid = (track && (track as any).id) ? (track as any).id : undefined; if (tid) savePrefs({ currentTrack: tid as any });');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
