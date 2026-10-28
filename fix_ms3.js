const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('      if (track && track.id) savePrefs({ currentTrack: track.id });', '      if (track && (track as any).id) savePrefs({ currentTrack: (track as any).id });');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
