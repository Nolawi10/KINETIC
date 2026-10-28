const fs = require('fs');
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(ms, 'utf8');
c = c.replace('    setCurrentTrack: (track: any) => {\n      set({ currentTrack: track ? track : null as any, currentTime: 0 });\n      if (track && track.id) savePrefs({ currentTrack: track.id });\n    },',
              '    setCurrentTrack: (track: any) => {\n      if (track) {\n        set({ currentTrack: track, currentTime: 0 });\n        if (track.id) savePrefs({ currentTrack: track.id });\n      } else {\n        set({ currentTrack: null as any, currentTime: 0 });\n      }\n    },');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
