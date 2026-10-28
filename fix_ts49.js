const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(typeof currentTime === "number" ? currentTime : 0)}</span>',
              '<span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(typeof currentTime === "number" ? currentTime : 0)}</span>');
c = c.replace('<input type="range" min="0" max={String(typeof duration === "number" ? duration : 100)} step="0.1" value={String(typeof currentTime === "number" ? currentTime : 0)} onChange={(e:any)=>{const audio=audioRef.current;if(audio){const v=Number(e.target.value)||0;(audio as any).currentTime=v;(setCurrentTime as any)(v);}}} style={{width:"100%"}} />',
              '<input type="range" min="0" max={String(typeof duration === "number" ? duration : 100)} step="0.1" value={String(typeof currentTime === "number" ? currentTime : 0)} onChange={(e:any)=>{const audio=audioRef.current;if(audio){const v=Number(e.target.value)||0;(audio as any).currentTime=v;(setCurrentTime as any)(v);}}} style={{width:"100%"}} />');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
