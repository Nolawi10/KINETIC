const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
// Try to use controlled component differently
c = c.replace('        <div style={{flex:1, minWidth: 0, overflow: "hidden"}}><Slider\n              value={[ (typeof currentTime === "number" ? currentTime : 0) ] as any}\n              max={ (typeof duration === "number" ? duration : 100) as any}\n              step={0.1}\n              onValueChange={(v: any) => {\n                const audio = audioRef.current;\n                if (audio) {\n                  const t = Array.isArray(v) ? v[0] : v;\n                  const tv = Number(t) || 0;\n                  if (audio) { (audio as any).currentTime = tv; }\n                  (setCurrentTime as any)(tv);\n                }\n              }}\n            /></div>',
              '<div style={{flex:1, minWidth: 0, overflow: "hidden"}}><input type="range" min="0" max={duration||100} step="0.1" value={currentTime||0} onChange={(e:any)=>{const audio=audioRef.current;if(audio){audio.currentTime=Number(e.target.value);setCurrentTime(Number(e.target.value));}}} style={{width:"100%"}} /></div>');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
