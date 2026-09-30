import { useState, useEffect, useCallback } from "react";
import audioPlayer from "../services/audioPlayer";

/**
 * Hook React pour contrôler la lecture de morceaux audio
 */
export function useSongPlayer() {
  const [currentSong, setCurrentSong] = useState(audioPlayer.currentSong);
  const [isPlaying, setIsPlaying] = useState(audioPlayer.isPlaying());
  const [currentTime, setCurrentTime] = useState(audioPlayer.getCurrentTime());
  const [duration, setDuration] = useState(audioPlayer.getDuration());
  const [volume, setVolumeState] = useState(audioPlayer.getVolume());
  const [error, setError] = useState(audioPlayer.error);

  const [playbackRate, setPlaybackRateState] = useState(audioPlayer.getPlaybackRate());
  const [loop, setLoopState] = useState(audioPlayer.getLoop());

  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe((event, data) => {
      switch (event) {
        case "play":
          setIsPlaying(true);
          setError(null);
          if (data?.song) setCurrentSong(data.song);
          break;
        case "pause":
          setIsPlaying(false);
          break;
        case "stop":
          setIsPlaying(false);
          setCurrentTime(0);
          break;
        case "ended":
          setIsPlaying(false);
          break;
        case "timeupdate":
          setCurrentTime(data.currentTime);
          setDuration(data.duration);
          break;
        case "loadedmetadata":
          setDuration(data.duration);
          break;
        case "volumechange":
          setVolumeState(data.volume);
          break;
        case "ratechange":
          setPlaybackRateState(data.playbackRate);
          break;
        case "loopchange":
          setLoopState(data.loop);
          break;
        case "error":
          setError(data.error);
          setIsPlaying(false);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const playSong = useCallback(async (song) => {
    try {
      setError(null);
      setCurrentSong(song);
      await audioPlayer.playSong(song);
      setIsPlaying(true);
    } catch (err) {
      setError(err.message || "Erreur lors du lancement du morceau.");
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    audioPlayer.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    try {
      setError(null);
      await audioPlayer.resume();
      setIsPlaying(true);
    } catch (err) {
      setError(err.message || "Erreur lors de la reprise de lecture.");
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    audioPlayer.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((timeInSeconds) => {
    audioPlayer.seek(timeInSeconds);
    setCurrentTime(timeInSeconds);
  }, []);

  const setVolume = useCallback((volumeLevel) => {
    audioPlayer.setVolume(volumeLevel);
    setVolumeState(volumeLevel);
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    audioPlayer.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, []);

  const setLoop = useCallback((shouldLoop) => {
    audioPlayer.setLoop(shouldLoop);
    setLoopState(shouldLoop);
  }, []);

  const restart = useCallback(() => {
    audioPlayer.seek(0);
    audioPlayer.resume();
  }, []);

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    loop,
    error,
    playSong,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    setLoop,
    restart,
  };
}

export default useSongPlayer;
