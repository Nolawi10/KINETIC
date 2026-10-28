import { create } from "zustand";

export interface Track {
  id: string;
  filename: string;
  title: string;
  artist: string;
  duration?: number | null;
  url: string;
}

interface MusicState {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: "off" | "one" | "all";
  autoplay: boolean;
  pauseDuringCoaching: boolean;
  muted: boolean;
  coachMuted: boolean;
  coachVolume: number;
  setTracks: (tracks: Track[]) => void;
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: "off" | "one" | "all") => void;
  setAutoplay: (autoplay: boolean) => void;
  setPauseDuringCoaching: (pause: boolean) => void;
  setMuted: (muted: boolean) => void;
  setCoachMuted: (muted: boolean) => void;
  setCoachVolume: (volume: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const loadPrefs = () => {
  try {
    const prefs = localStorage.getItem("kinetic-music-prefs");
    if (prefs) {
      return JSON.parse(prefs);
    }
  } catch (err) {
    console.error("Failed to load music preferences:", err);
  }
  return {};
};

const savePrefs = (state: Partial<MusicState>) => {
  try {
    const current = loadPrefs();
    localStorage.setItem("kinetic-music-prefs", JSON.stringify({ ...current, ...state }));
  } catch (err) {
    console.error("Failed to save music preferences:", err);
  }
};

export const useMusicStore = create<MusicState>((set, get) => {
  const prefs = loadPrefs();

  return {
    tracks: [],
    currentTrack: null,
    isPlaying: false,
    volume: prefs.volume ?? 0.7,
    currentTime: 0,
    duration: 0,
    shuffle: prefs.shuffle ?? false,
    repeat: prefs.repeat ?? "off",
    autoplay: prefs.autoplay ?? false,
    pauseDuringCoaching: prefs.pauseDuringCoaching ?? true,
    muted: prefs.muted ?? false,
    coachMuted: prefs.coachMuted ?? false,
    coachVolume: prefs.coachVolume ?? 0.8,

    setTracks: (tracks: Track[]) => set({ tracks }),
    setCurrentTrack: (track: Track | null) => {
      set({ currentTrack: track, currentTime: 0 });
      savePrefs({ currentTrack: track?.id });
    },
    setIsPlaying: (playing: boolean) => {
      set({ isPlaying: playing });
      savePrefs({ isPlaying: playing });
    },
    setVolume: (volume: number) => {
      set({ volume });
      savePrefs({ volume });
    },
    setCurrentTime: (time: number) => set({ currentTime: time }),
    setDuration: (duration: number) => set({ duration }),
    setShuffle: (shuffle: boolean) => {
      set({ shuffle });
      savePrefs({ shuffle });
    },
    setRepeat: (repeat: "off" | "one" | "all") => {
      set({ repeat });
      savePrefs({ repeat });
    },
    setAutoplay: (autoplay: boolean) => {
      set({ autoplay });
      savePrefs({ autoplay });
    },
    setPauseDuringCoaching: (pause: boolean) => {
      set({ pauseDuringCoaching: pause });
      savePrefs({ pauseDuringCoaching: pause });
    },
    setMuted: (muted: boolean) => {
      set({ muted });
      savePrefs({ muted });
    },
    setCoachMuted: (muted: boolean) => {
      set({ coachMuted: muted });
      savePrefs({ coachMuted: muted });
    },
    setCoachVolume: (volume: number) => {
      set({ coachVolume: volume });
      savePrefs({ coachVolume: volume });
    },
    nextTrack: () => {
      const { tracks, currentTrack, shuffle, repeat } = get();
      if (tracks.length === 0) return;
      if (shuffle) {
        const idx = Math.floor(Math.random() * tracks.length);
        set({ currentTrack: tracks[idx], currentTime: 0 });
        return;
      }
      const idx = tracks.findIndex((t: Track) => t.id === currentTrack?.id);
      if (idx === -1) {
        set({ currentTrack: tracks[0], currentTime: 0 });
        return;
      }
      if (repeat === "one") {
        set({ currentTime: 0 });
        return;
      }
      const nextIdx = (idx + 1) % tracks.length;
      if (nextIdx === 0 && repeat === "off") {
        set({ isPlaying: false });
        return;
      }
      set({ currentTrack: tracks[nextIdx], currentTime: 0 });
    },
    prevTrack: () => {
      const { tracks, currentTrack } = get();
      if (tracks.length === 0) return;
      const idx = tracks.findIndex((t: Track) => t.id === currentTrack?.id);
      if (idx <= 0) {
        set({ currentTrack: tracks[tracks.length - 1], currentTime: 0 });
        return;
      }
      set({ currentTrack: tracks[idx - 1], currentTime: 0 });
    },
  };
});
