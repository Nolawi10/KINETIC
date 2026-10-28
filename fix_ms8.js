const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('        if (track) {\n        set({ currentTrack: track || null, currentTime: 0 } as any);\n        const tid = (track && (track as any).id) ? (track as any).id : undefined; if (tid) { try { localStorage.setItem(\'kinetic-music-prefs\', JSON.stringify({ ...(JSON.parse(localStorage.getItem(\'kinetic-music-prefs\')||\'{}\')), currentTrack: tid })); } catch(e){} }\n      } else {\n        set({ currentTrack: null, currentTime: 0 } as any);\n      }',
              '        if (track) {\n        set({ currentTrack: track || null, currentTime: 0 } as any);\n        const tid = (track && (track as any).id) ? (track as any).id : undefined;\n        if (tid) { try { const cur = JSON.parse(localStorage.getItem(\'kinetic-music-prefs\')||\'{}\'); localStorage.setItem(\'kinetic-music-prefs\', JSON.stringify({ ...cur, currentTrack: tid })); } catch(e){} }\n      } else {\n        set({ currentTrack: null, currentTime: 0 } as any);\n      }');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
