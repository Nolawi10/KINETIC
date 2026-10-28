const { spawn } = require('child_process');
const p = spawn('python', ['-c', "import sys; sys.path.insert(0,'E:/Kinetic Models'); import backend.app as m; print([str(x) for x in m.app.url_map.iter_rules() if 'playlist' in str(x)])"], { cwd: 'E:/Kinetic Models' });
p.stdout.on('data', d => { process.stdout.write(d.toString()); });
p.stderr.on('data', d => { process.stderr.write(d.toString()); });
p.on('close', code => { process.exit(code); });
