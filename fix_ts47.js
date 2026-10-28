const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(typeof duration === "number" ? duration : 0)}</span>',
              '<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(typeof duration === "number" ? duration : 0)}</span>');
c = c.replace('const formatTime = (t: number) => {', 'const formatTime = (t: any) => {\n    if (typeof t !== "number") return "0:00";');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
