const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace('      if (track && track.id) savePrefs({ currentTrack: track.id as any });',
              '      if (track && (track as any).id) savePrefs({ currentTrack: (track as any).id });');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
