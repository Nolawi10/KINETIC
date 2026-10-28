import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMusicStore } from '@/lib/music-store';

export default function MusicPlayer({ compact = false }: { compact?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const {
    tracks, currentTrack, isPlaying, volume, muted, shuffle, repeat,
    setCurrentTrack, setIsPlaying, setVolume, setCurrentTime, setDuration,
    setShuffle, setRepeat, nextTrack, prevTrack, setTracks
  } = useMusicStore();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/playlist');
        if (res.ok) {
          const data = await res.json();
          setTracks(data.tracks || []);
        }
      } catch {}
    };
    load();
  }, [setTracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying && currentTrack) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(Number(audio.duration)||0);
    }
  };

  const handleEnded = () => {
    const { repeat } = useMusicStore.getState();
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }
    nextTrack();
  };

  const formatTime = (t: any) => {
    if (typeof t !== "number") return "0:00";
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const state = useMusicStore.getState();
  const currentTime = (state.currentTime !== undefined && state.currentTime !== null) ? state.currentTime : 0;
  const duration = (state.duration !== undefined && state.duration !== null) ? state.duration : 0;

  if (compact) {
    return (
      <div className="music-player-compact" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
        <audio
          ref={audioRef}
          src={currentTrack ? currentTrack.url : undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
        <Music size={14} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTrack ? currentTrack.title : 'No track selected'}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => prevTrack()} disabled={tracks.length === 0}>
          <SkipBack size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsPlaying(!isPlaying)} disabled={!currentTrack && tracks.length === 0}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => nextTrack()} disabled={tracks.length === 0}>
          <SkipForward size={14} />
        </Button>
      </div>
    );
  }

  return (
    <div className="music-player" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <audio
        ref={audioRef}
        src={currentTrack ? currentTrack.url : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>{currentTrack ? currentTrack.title : 'No track selected'}</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>{currentTrack?.artist || ''}</div>
        </div>
        <Button size="sm" variant={shuffle ? 'default' : 'ghost'} onClick={() => setShuffle(!shuffle)}>
          <Shuffle size={14} />
        </Button>
        <Button size="sm" variant={repeat !== 'off' ? 'default' : 'ghost'} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}>
          <Repeat size={14} />
        </Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', minWidth: '40px' }}>{formatTime(useMusicStore.getState().currentTime)}</span>
        <Slider
          value={[useMusicStore.getState().currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={(v) => {
            const audio = audioRef.current;
            if (audio) {
              audio.currentTime = v[0];
              setCurrentTime(v[0]);
            }
          }}
        />
        <span style={{ fontSize: '11px', minWidth: '40px' }}>{formatTime(duration)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        <Button size="sm" variant="ghost" onClick={prevTrack} disabled={tracks.length === 0}><SkipBack size={16} /></Button>
        <Button onClick={() => setIsPlaying(!isPlaying)} disabled={!currentTrack && tracks.length === 0}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={nextTrack} disabled={tracks.length === 0}><SkipForward size={16} /></Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button size="sm" variant="ghost" onClick={() => useMusicStore.getState().setMuted(!muted)}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </Button>
        <Slider
          value={[muted ? 0 : volume] as any}
          max={1}
          step={0.01}
          onValueChange={(v: any) => setVolume(Array.isArray(v) ? v[0] : v)}
        />
      </div>
      <Button variant="outline" size="sm" onClick={() => setShowPlaylist(!showPlaylist)}>
        {showPlaylist ? 'Hide Playlist' : `Show Playlist (${tracks.length})`}
      </Button>
      {showPlaylist && (
        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tracks.length === 0 && <div style={{ fontSize: '11px', opacity: 0.6 }}>No tracks found</div>}
          {tracks.map(track => (
            <Button
              key={track.id}
              variant={currentTrack?.id === track.id ? 'default' : 'ghost'}
              size="sm"
              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => {
                setCurrentTrack(track);
                setIsPlaying(true);
              }}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.title}
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
