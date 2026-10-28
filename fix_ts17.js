const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('              value={[(currentTime || 0)] as any}\n              max={(duration || 100) as any}\n              step={0.1}\n              onValueChange={(v: any) => {\n                const audio = audioRef.current;\n                if (audio) {\n                  const t = Array.isArray(v) ? v[0] : v;\n                  audio.currentTime = t || 0;\n                  setCurrentTime(t || 0);\n                }\n              }}\n            />',
              '              value={[currentTime || 0] as any}\n              max={(duration || 100) as any}\n              step={0.1}\n              onValueChange={(v: any) => {\n                const audio = audioRef.current;\n                if (audio) {\n                  const t = Array.isArray(v) ? v[0] : v;\n                  const tv = Number(t) || 0;\n                  audio.currentTime = tv;\n                  setCurrentTime(tv);\n                }\n              }}\n            />');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
