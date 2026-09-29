import { useCallback, useEffect, useRef, useState } from 'react';

// Évite un énorme saut de temps quand l'onglet revient au premier plan.
const MAX_FRAME_DT = 0.1;

/**
 * Horloge musicale. Le temps avance de (dt réel × vitesse) : changer la vitesse
 * modifie la progression de la timeline, pas un scale CSS.
 *
 * Contrat exposé au NoteScroller : `time` en secondes. Quand le lecteur MIDI
 * existera, il suffira de lui faire exposer le même objet à la place de ce hook.
 */
export default function useTimeline({ duration = Infinity, initialSpeed = 1, autoPlay = false, onEnd } = {}) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(initialSpeed);

  const timeRef = useRef(0);
  const speedRef = useRef(initialSpeed);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!playing) return undefined;
    let frame;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_FRAME_DT);
      last = now;
      const next = Math.min(timeRef.current + dt * speedRef.current, duration);
      timeRef.current = next;
      setTime(next);
      if (next >= duration) {
        setPlaying(false);
        onEndRef.current?.();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);

  const seek = useCallback(
    (t) => {
      const clamped = Math.min(Math.max(t, 0), duration);
      timeRef.current = clamped;
      setTime(clamped);
    },
    [duration],
  );

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setPlaying(true);
  }, [duration, seek]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  const restart = useCallback(() => {
    seek(0);
    setPlaying(true);
  }, [seek]);

  return {
    time,
    playing,
    speed,
    duration,
    progress: Number.isFinite(duration) && duration > 0 ? time / duration : 0,
    play,
    pause,
    toggle,
    restart,
    seek,
    setSpeed,
  };
}