const fs=require('fs');
const s=fs.readFileSync('E:/Kinetic Models/Frontend/src/routes/live.tsx','utf8');
const idx = s.indexOf('return');
if(idx>=0) {
  console.log(s.substring(idx, idx+1200));
}
