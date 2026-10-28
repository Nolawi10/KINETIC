const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('      setDuration(audio.duration);', '      setDuration(Number(audio.duration)||0);');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
