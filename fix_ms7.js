const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('      const tid = (track && (track as any).id) ? (track as any).id : undefined; if (tid) (savePrefs as any)({ currentTrack: tid });',
              '      const tid = (track && (track as any).id) ? (track as any).id : undefined; if (tid) { try { localStorage.setItem(\'kinetic-music-prefs\', JSON.stringify({ ...(JSON.parse(localStorage.getItem(\'kinetic-music-prefs\')||\'{}\')), currentTrack: tid })); } catch(e){} }');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
