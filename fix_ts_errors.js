const fs = require('fs');
// Fix music-player
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('          {tracks.map(track => (', '          {tracks.map((track: any) => ('));
fs.writeFileSync(mp, c, 'utf8');

// Fix music-store
const ms = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
c = fs.readFileSync(ms, 'utf8');
c = c.replace('savePrefs({ currentTrack: track?.id });', 'if (track?.id) savePrefs({ currentTrack: track.id });');
c = c.replace('export const useMusicStore = create<MusicState>((set, get) => {', 'export const useMusicStore = create<MusicState>((set: any, get: any) => {');
fs.writeFileSync(ms, c, 'utf8');
console.log('ok');
