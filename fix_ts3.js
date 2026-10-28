const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace('    currentTrack: null,', '    currentTrack: null as any,');
c = c.replace('      set({ currentTrack: track, currentTime: 0 });', '      set({ currentTrack: track as any, currentTime: 0 });');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
