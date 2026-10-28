const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('        <Slider\n          value={[muted ? 0 : volume]}\n          max={1}\n          step={0.01}\n          onValueChange={(v) => setVolume(v[0])}\n        />',
              '        <Slider\n          value={[muted ? 0 : volume]}\n          max={1}\n          step={0.01}\n          onValueChange={(v: number[]) => setVolume(v[0])}\n        />');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
