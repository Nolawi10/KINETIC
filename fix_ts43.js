const fs = require('fs');
const mp = 'E:/Kinetic Models/Frontend/src/components/music-player.tsx';
let c = fs.readFileSync(mp, 'utf8');
c = c.replace('<div style={{flex:1, minWidth: 0, overflow: "hidden"}}><input type="range" min="0" max={duration||100} step="0.1" value={currentTime||0} onChange={(e:any)=>{const audio=audioRef.current;if(audio){audio.currentTime=Number(e.target.value);setCurrentTime(Number(e.target.value));}}} style={{width:"100%"}} /></div>',
              '<div style={{flex:1, minWidth: 0, overflow: "hidden"}}><input type="range" min="0" max={(duration||100) as any} step="0.1" value={Number(currentTime)||0} onChange={(e:any)=>{const audio=audioRef.current;if(audio){const v=Number(e.target.value)||0;(audio as any).currentTime=v;(setCurrentTime as any)(v);}}} style={{width:"100%"}} /></div>');
fs.writeFileSync(mp, c, 'utf8');
console.log('ok');
