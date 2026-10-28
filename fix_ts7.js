const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace('    currentTrack: null as any,', '    currentTrack: null,');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
