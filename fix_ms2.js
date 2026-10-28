const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('    setCurrentTrack: (track: any) => {\n      if (track) {\n        set({ currentTrack: track, currentTime: 0 } as any);\n        if (track.id) savePrefs({ currentTrack: track.id });\n      } else {\n        set({ currentTrack: null as any, currentTime: 0 } as any);\n      }\n    },',
              '    setCurrentTrack: (track: any) => {\n      if (track) {\n        set({ currentTrack: track || null, currentTime: 0 } as any);\n        if (track.id) savePrefs({ currentTrack: track.id });\n      } else {\n        set({ currentTrack: null, currentTime: 0 } as any);\n      }\n    },');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
