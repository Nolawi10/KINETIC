const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime((Number(currentTime)||0) as any)}</span>',
              '<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(Number(currentTime)||0)}</span>');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
