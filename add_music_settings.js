const fs = require('fs');
const path = 'E:/Kinetic Models/Frontend/src/routes/settings.tsx';
let c = fs.readFileSync(path, 'utf8');
if (c.indexOf('Music') === -1) {
  c = c.replace("import { Save,Wifi,ScanLine,Bluetooth,Heart,Target,Swords,Footprints,Zap } from 'lucide-react';", 
                "import { Save,Wifi,ScanLine,Bluetooth,Heart,Target,Swords,Footprints,Zap,Music,Volume2 } from 'lucide-react';");
}
const music_section = `<div className="settings-band"><div className="settings-intro"><span className="section-index">04 // MUSIC & AUDIO</span><h2>PLAYLIST & AUDIO</h2><p>Configure music playback for training sessions.</p></div><div className="settings-content"><Instrument title="PLAYLIST" tag="AUDIO"><div style={{display:'flex',flexDirection:'column',gap:'10px'}}><div><strong>Playlist Directory:</strong> E:\\\\Kinetic Models\\\\Playlist</div><Button variant="outline" onClick={()=>{fetch('/api/playlist/refresh',{method:'POST'}).then(r=>r.json()).then(d=>setNotice(d.exists?'Playlist refreshed':'Playlist directory not found')).catch(()=>setNotice('Failed to refresh playlist'));}}><Music/>Refresh Playlist</Button><p className="micro-label">Place MP3, WAV, M4A, AAC, OGG files in the playlist directory</p></div></Instrument><Instrument title="AUDIO PREFERENCES" tag="SETTINGS"><div style={{display:'flex',flexDirection:'column',gap:'10px'}}><div className="sensor-row"><Volume2/><div><strong>Autoplay on session start</strong><small>Start music automatically when entering Live Session</small></div><Switch aria-label="Autoplay music" checked={(p as any).autoplayMusic||false} onCheckedChange={v=>update('autoplayMusic' as any,v)}/></div><div className="sensor-row"><Music/><div><strong>Pause during coaching</strong><small>Lower volume during coach announcements</small></div><Switch aria-label="Pause during coaching" checked={(p as any).pauseDuringCoaching!==false} onCheckedChange={v=>update('pauseDuringCoaching' as any,v)}/></div></div></Instrument></div></div>`;
if (c.indexOf('MUSIC & AUDIO') === -1) {
  c = c.replace('</TacticalShell>;', music_section + '</TacticalShell>;');
}
fs.writeFileSync(path, c, 'utf8');
console.log('ok');
