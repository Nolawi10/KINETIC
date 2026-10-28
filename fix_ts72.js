const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('      if (idx <= 0) {\n        set({ currentTrack: tracks[tracks.length - 1] || null, currentTime: 0 });\n        return;\n      }\n      set({ currentTrack: tracks[idx - 1] || null, currentTime: 0 });', 
              '      if (idx <= 0) {\n        set({ currentTrack: (tracks[tracks.length - 1] ? tracks[tracks.length - 1] : null) as any, currentTime: 0 });\n        return;\n      }\n      set({ currentTrack: (tracks[idx - 1] ? tracks[idx - 1] : null) as any, currentTime: 0 });');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
