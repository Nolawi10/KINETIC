const fs = require('fs');
const s = fs.readFileSync('E:/Kinetic Models/Frontend/src/routes/live.tsx','utf8');
const lines = s.replace(/\r\n/g,'\n').split('\n');
console.log('TOTAL:' + lines.length);
for (let i=16; i<lines.length; i++) {
  console.log((i+1) + ':' + lines[i]);
}
