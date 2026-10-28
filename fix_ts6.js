const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace('    setCurrentTrack: (track: Track | null) => {\n      set({ currentTrack: track as any, currentTime: 0 });\n      if (track && (track as any).id) savePrefs({ currentTrack: (track as any).id });\n    },',
              '    setCurrentTrack: (track: any) => {\n      set({ currentTrack: track || null, currentTime: 0 });\n      if (track && track.id) savePrefs({ currentTrack: track.id });\n    },');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
