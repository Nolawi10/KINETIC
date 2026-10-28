const fs = require('fs');
const c = fs.readFileSync('E:/Kinetic Models/Frontend/src/routes/live.tsx','utf8');
const lines = c.split('\n');
console.log(lines.length);
for (let i = 200; i < Math.min(lines.length, 250); i++) {
  console.log((i+1) + ': ' + lines[i]);
}
