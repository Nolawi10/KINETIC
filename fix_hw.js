const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/hardware.tsx';
let s = fs.readFileSync(p,'utf8');
s = s.replace('    } catch (e) {\n      setNotice(\'Failed to save\')\n    }', '    } catch (e:any) {\n      setNotice(e?.message || \'Failed to save\')\n    }');
s = s.replace('setForm({ ...form, node_id: node.node_id, ...node.config })', 'setForm({ ...form, node_id: node.node_id, ...(node.config||{}) })');
fs.writeFileSync(p,s,'utf8');
console.log('ok');
