const fs = require('fs');
const path = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(path, 'utf8');
// Add types
c = c.replace('    setTracks: (tracks) => set({ tracks }),\n    setCurrentTrack: (track) => {\n      set({ currentTrack: track, currentTime: 0 });\n      savePrefs({ currentTrack: track?.id });\n    },',
              '    setTracks: (tracks: Track[]) => set({ tracks }),\n    setCurrentTrack: (track: Track | null) => {\n      set({ currentTrack: track, currentTime: 0 });\n      savePrefs({ currentTrack: track?.id });\n    },');
c = c.replace('    setIsPlaying: (playing) => {\n      set({ isPlaying: playing });\n      savePrefs({ isPlaying: playing });\n    },',
              '    setIsPlaying: (playing: boolean) => {\n      set({ isPlaying: playing });\n      savePrefs({ isPlaying: playing });\n    },');
c = c.replace('    setVolume: (volume) => {\n      set({ volume });\n      savePrefs({ volume });\n    },',
              '    setVolume: (volume: number) => {\n      set({ volume });\n      savePrefs({ volume });\n    },');
c = c.replace('    setCurrentTime: (time) => set({ currentTime: time }),\n    setDuration: (duration) => set({ duration }),\n    setShuffle: (shuffle) => {\n      set({ shuffle });\n      savePrefs({ shuffle });\n    },',
              '    setCurrentTime: (time: number) => set({ currentTime: time }),\n    setDuration: (duration: number) => set({ duration }),\n    setShuffle: (shuffle: boolean) => {\n      set({ shuffle });\n      savePrefs({ shuffle });\n    },');
c = c.replace('    setRepeat: (repeat) => {\n      set({ repeat });\n      savePrefs({ repeat });\n    },\n    setAutoplay: (autoplay) => {\n      set({ autoplay });\n      savePrefs({ autoplay });\n    },\n    setPauseDuringCoaching: (pause) => {\n      set({ pauseDuringCoaching: pause });\n      savePrefs({ pauseDuringCoaching: pause });\n    },\n    setMuted: (muted) => {\n      set({ muted });\n      savePrefs({ muted });\n    },\n    setCoachMuted: (muted) => {\n      set({ coachMuted: muted });\n      savePrefs({ coachMuted: muted });\n    },\n    setCoachVolume: (volume) => {\n      set({ coachVolume: volume });\n      savePrefs({ coachVolume: volume });\n    },',
              '    setRepeat: (repeat: "off" | "one" | "all") => {\n      set({ repeat });\n      savePrefs({ repeat });\n    },\n    setAutoplay: (autoplay: boolean) => {\n      set({ autoplay });\n      savePrefs({ autoplay });\n    },\n    setPauseDuringCoaching: (pause: boolean) => {\n      set({ pauseDuringCoaching: pause });\n      savePrefs({ pauseDuringCoaching: pause });\n    },\n    setMuted: (muted: boolean) => {\n      set({ muted });\n      savePrefs({ muted });\n    },\n    setCoachMuted: (muted: boolean) => {\n      set({ coachMuted: muted });\n      savePrefs({ coachMuted: muted });\n    },\n    setCoachVolume: (volume: number) => {\n      set({ coachVolume: volume });\n      savePrefs({ coachVolume: volume });\n    },');
c = c.replace('      const idx = tracks.findIndex(t => t.id === currentTrack?.id);',
              '      const idx = tracks.findIndex((t: Track) => t.id === currentTrack?.id);');
c = c.replace('      const idx = tracks.findIndex(t => t.id === currentTrack?.id);',
              '      const idx = tracks.findIndex((t: Track) => t.id === currentTrack?.id);');
fs.writeFileSync(path, c, 'utf8');
console.log('ok');
