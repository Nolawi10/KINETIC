const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(((duration && typeof duration === "number") ? duration : 0) as any)}</span>\n      </div>',
              '<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime((duration && typeof duration === "number") ? duration : 0)}</span>\n      </div>');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
