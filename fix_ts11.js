const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('    setCurrentTrack: (track: any) => {\n      set({ currentTrack: track || null, currentTime: 0 });\n      if (track && track.id) savePrefs({ currentTrack: track.id });\n    },',
              '    setCurrentTrack: (track: any) => {\n      set({ currentTrack: track ? track : null as any, currentTime: 0 });\n      if (track && track.id) savePrefs({ currentTrack: track.id });\n    },');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
