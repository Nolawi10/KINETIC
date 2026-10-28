const fs = require('fs');
const s = fs.readFileSync('E:/Kinetic Models/dumplive_out.txt','utf8');
const lines = s.split(/\r?\n/);
for (let i = Math.max(0, lines.length-200); i < lines.length; i++) {
  console.log(lines[i]);
}
