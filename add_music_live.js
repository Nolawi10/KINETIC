const fs = require('fs');
const path = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let c = fs.readFileSync(path, 'utf8');
if (c.indexOf('MusicPlayer') === -1) {
  c = "import MusicPlayer from '@/components/music-player'\nimport KineticPerformanceCoach from '@/components/kinetic-performance-coach'\n" + c;
}
if (c.indexOf('MUSIC PLAYER') === -1) {
  const panel = "<div style={{marginTop:'10px'}}><Instrument title='MUSIC PLAYER' tag='PLAYLIST'><MusicPlayer /></Instrument></div>";
  c = c.replace("<div style={{marginTop:\"10px\"}}><Instrument title=\"SENSOR SIMULATOR\" tag=\"DUMMY\"><SensorSimulator /></Instrument></div>", 
                "<div style={{marginTop:\"10px\"}}><Instrument title=\"SENSOR SIMULATOR\" tag=\"DUMMY\"><SensorSimulator /></Instrument></div>" + panel);
}
if (c.indexOf('PERFORMANCE COACH') === -1) {
  const coach = "<Instrument title='PERFORMANCE COACH' tag='AI ASSIST'><KineticPerformanceCoach sessionState={{seconds,count,events}} /></Instrument>";
  c = c.replace("<Instrument title=\"AI COACH FEED\" tag=\"SIMULATED PROMPTS\">", coach + "<Instrument title=\"AI COACH FEED\" tag=\"SIMULATED PROMPTS\">");
}
fs.writeFileSync(path, c, 'utf8');
console.log('ok');
