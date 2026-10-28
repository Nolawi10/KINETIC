const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('            onLoadedMetadata={handleLoadedMetadata}', '            onLoadedMetadata={handleLoadedMetadata}');
c = c.replace('  const { currentTime, duration } = useMusicStore.getState();', '  const state = useMusicStore.getState();\n  const currentTime = state.currentTime || 0;\n  const duration = state.duration || 0;');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
