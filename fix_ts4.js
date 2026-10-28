const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace("if (track?.id) savePrefs({ currentTrack: track.id });", "if (track && track.id) savePrefs({ currentTrack: track.id as any });");
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
