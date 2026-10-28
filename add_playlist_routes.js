const fs = require('fs');
const path = 'E:/Kinetic Models/backend/app.py';
let c = fs.readFileSync(path, 'utf8');

const routes = `

# Music Playlist API
@app.route('/api/playlist', methods=['GET'])
def get_playlist():
    try:
        playlist_dir = PLAYLIST_DIR
        tracks = []
        if os.path.exists(playlist_dir):
            for fname in sorted(os.listdir(playlist_dir)):
                fpath = os.path.join(playlist_dir, fname)
                if os.path.isfile(fpath):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in MUSIC_EXTS:
                        # Try to extract basic info
                        title = os.path.splitext(fname)[0]
                        # Remove common prefixes
                        tracks.append({
                            'id': fname,
                            'filename': fname,
                            'title': title,
                            'artist': '',
                            'duration': None,
                            'url': f'/api/playlist/stream/{fname}'
                        })
        return jsonify({'tracks': tracks, 'directory': playlist_dir})
    except Exception as e:
        return jsonify({'error': str(e), 'tracks': []}), 200


@app.route('/api/playlist/stream/<path:filename>', methods=['GET'])
def stream_playlist_file(filename):
    try:
        playlist_dir = PLAYLIST_DIR
        # Prevent path traversal
        safe_path = safe_join(playlist_dir, filename)
        if not safe_path or not os.path.abspath(safe_path).startswith(os.path.abspath(playlist_dir)):
            return jsonify({'error': 'Invalid path'}), 403
        if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
            return jsonify({'error': 'File not found'}), 404
        ext = os.path.splitext(safe_path)[1].lower()
        if ext not in MUSIC_EXTS:
            return jsonify({'error': 'Invalid file type'}), 403
        mimetype = mimetypes.guess_type(safe_path)[0] or 'audio/mpeg'
        return send_file(safe_path, mimetype=mimetype, as_attachment=False, conditional=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/playlist/refresh', methods=['POST'])
def refresh_playlist():
    try:
        playlist_dir = PLAYLIST_DIR
        exists = os.path.exists(playlist_dir)
        return jsonify({'success': True, 'exists': exists, 'directory': playlist_dir})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

`;

if (c.indexOf('/api/playlist') === -1) {
  // Add before the last routes or at the end
  c = c + routes;
}
fs.writeFileSync(path, c, 'utf8');
console.log('ok');
