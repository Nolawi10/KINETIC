const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
// Rewrite the slider line completely
c = c.replace(/<Slider[\s\S]*?onValueChange[\s\S]*?<\/Slider>/, 
  '<Slider value={[typeof currentTime === "number" ? currentTime : 0] as any} max={(typeof duration === "number" ? duration : 100) as any} step={0.1} onValueChange={(v: any) => { const audio = audioRef.current; if (audio) { const t = Array.isArray(v) ? v[0] : v; const tv = Number(t) || 0; (audio as any).currentTime = tv; (setCurrentTime as any)(tv); } }} />');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
