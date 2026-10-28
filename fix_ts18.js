const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
// Replace the entire slider section
c = c.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*<span[^>]*>\{formatTime\(useMusicStore.getState\(\)\.currentTime\)\}<\/span>\s*<Slider[\s\S]*?<\/Slider>\s*<span[^>]*>\{formatTime\(duration\)\}<\/span>\s*<\/div>/,
  `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>\n        <span style={{ fontSize: '11px', minWidth: '40px' }}>{formatTime(currentTime)}</span>\n        <Slider\n          value={[currentTime] as any}\n          max={(duration || 100) as any}\n          step={0.1}\n          onValueChange={(v: any) => {\n            const audio = audioRef.current;\n            if (audio) {\n              const t = Array.isArray(v) ? v[0] : v;\n              const tv = Number(t) || 0;\n              audio.currentTime = tv;\n              setCurrentTime(tv);\n            }\n          }}\n        />\n        <span style={{ fontSize: '11px', minWidth: '40px' }}>{formatTime(duration)}</span>\n      </div>`);
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
