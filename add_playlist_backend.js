const fs = require('fs');
const path = 'E:/Kinetic Models/backend/app.py';
let c = fs.readFileSync(path, 'utf8');
if (c.indexOf('send_file') === -1) {
  c = c.replace("from flask import Flask, request, jsonify\n", "from flask import Flask, request, jsonify, send_file\n");
}
if (c.indexOf('safe_join') === -1) {
  c = c.replace("from flask import Flask, request, jsonify, send_file\n", "from flask import Flask, request, jsonify, send_file\nfrom werkzeug.utils import safe_join\n");
}
if (c.indexOf("import mimetypes") === -1) {
  c = c.replace("import time\n", "import time\nimport mimetypes\n");
}
if (c.indexOf('PLAYLIST_DIR') === -1) {
  c = c.replace("app.config.from_object(Config)\n", "app.config.from_object(Config)\n\n# Playlist configuration\nPLAYLIST_DIR = os.environ.get('KINETIC_PLAYLIST_DIR', r'E:\\Kinetic Models\\Playlist')\nMUSIC_EXTS = {'.mp3', '.wav', '.m4a', '.aac', '.ogg'}\n\n");
}
fs.writeFileSync(path, c, 'utf8');
console.log('ok');
