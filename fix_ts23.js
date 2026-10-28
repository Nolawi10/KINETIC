const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('  const currentTime = state.currentTime || 0;\n  const duration = state.duration || 0;',
              '  const currentTime = (state.currentTime !== undefined && state.currentTime !== null) ? state.currentTime : 0;\n  const duration = (state.duration !== undefined && state.duration !== null) ? state.duration : 0;');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
