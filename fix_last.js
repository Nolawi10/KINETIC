const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('      if (track && (track as any).id) savePrefs({ currentTrack: (track as any).id });', 
              '      if (track && (track as any).id) savePrefs({ currentTrack: (track as any).id as any });');
c = c.replace('export const useMusicStore = create<MusicState>((set: any, get: any) => {', 
              'export const useMusicStore = create<any>((set: any, get: any) => {');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
