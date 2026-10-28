const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace('    setCurrentTrack: (track: Track | null) => {\n      set({ currentTrack: track, currentTime: 0 });\n      if (track?.id) savePrefs({ currentTrack: track.id });\n    },',
              '    setCurrentTrack: (track: Track | null) => {\n      set({ currentTrack: track, currentTime: 0 });\n      if (track?.id) savePrefs({ currentTrack: track.id });\n    },');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
