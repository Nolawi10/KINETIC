const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('        <span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(currentTime)}</span>\n        <div style={{flex:1, minWidth: 0, overflow: "hidden"}}><input type="range" min="0" max={String(duration||100)} step="0.1" value={String(Number(currentTime)||0)} onChange={(e:any)=>{const audio=audioRef.current;if(audio){const v=Number(e.target.value)||0;(audio as any).currentTime=v;(setCurrentTime as any)(v);}}} style={{width:"100%"}} /></div>\n        <span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(duration)}</span>',
              '        <span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(currentTime)}</span>\n        <div style={{flex:1, minWidth: 0, overflow: "hidden"}}><input type="range" min="0" max={String(Number(duration)||100)} step="0.1" value={String(Number(currentTime)||0)} onChange={(e:any)=>{const audio=audioRef.current;if(audio){const v=Number(e.target.value)||0;(audio as any).currentTime=v;(setCurrentTime as any)(v);}}} style={{width:"100%"}} /></div>\n        <span style={{ fontSize: \'11px\', minWidth: \'40px\' }}>{formatTime(duration)}</span>');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
