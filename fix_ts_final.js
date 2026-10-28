const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/lib/music-store.ts';
let c = fs.readFileSync(p, 'utf8');
// Replace nextTrack and prevTrack with simpler versions
c = c.replace(/nextTrack: \(\) => \{[\s\S]*?\},\n    prevTrack:/, 
              `nextTrack: () => {
      const { tracks, currentTrack, shuffle, repeat } = get() as any;
      if (tracks.length === 0) return;
      if (shuffle) {
        const idx = Math.floor(Math.random() * tracks.length);
        set({ currentTrack: tracks[idx] as any, currentTime: 0 } as any);
        return;
      }
      const idx = tracks.findIndex((t: any) => t.id === currentTrack?.id);
      if (idx === -1) {
        set({ currentTrack: tracks[0] as any, currentTime: 0 } as any);
        return;
      }
      if (repeat === 'one') {
        set({ currentTime: 0 } as any);
        return;
      }
      const nextIdx = (idx + 1) % tracks.length;
      if (nextIdx === 0 && repeat === 'off') {
        set({ isPlaying: false } as any);
        return;
      }
      set({ currentTrack: tracks[nextIdx] as any, currentTime: 0 } as any);
    },
    prevTrack:`);
c = c.replace(/prevTrack: \(\) => \{[\s\S]*?\}\n  \};/, 
              `prevTrack: () => {
      const { tracks, currentTrack } = get() as any;
      if (tracks.length === 0) return;
      const idx = tracks.findIndex((t: any) => t.id === currentTrack?.id);
      if (idx <= 0) {
        set({ currentTrack: (tracks[tracks.length - 1]) as any, currentTime: 0 } as any);
        return;
      }
      set({ currentTrack: tracks[idx - 1] as any, currentTime: 0 } as any);
    }
  };`);
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
