const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('            <Slider\n              value={[currentTime || 0]}\n              max={duration || 100}\n              step={0.1}\n              onValueChange={(v: number[]) => {\n                const audio = audioRef.current;\n                if (audio) {\n                  audio.currentTime = v[0] || 0;\n                  setCurrentTime(v[0] || 0);\n                }\n              }}\n            />',
              '            <Slider\n              value={[currentTime || 0] as any}\n              max={(duration || 100) as any}\n              step={0.1}\n              onValueChange={(v: any) => {\n                const audio = audioRef.current;\n                if (audio) {\n                  audio.currentTime = v[0] || 0;\n                  setCurrentTime(v[0] || 0);\n                }\n              }}\n            />');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
