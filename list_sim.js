const fs = require('fs');
const dir = 'E:/Kinetic Models/Frontend/src/lib/sensor-sim';
fs.readdirSync(dir).forEach(f => console.log(f));
