import React from "react";

type VoicePlaybackState = Record<number, { currentTime: number; duration: number }>;

type VoiceAudioHandlers = {
  onLoadedMetadata: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onLoadedData: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onCanPlay: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onDurationChange: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onPlay: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onPause: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  onEnded: () => void;
};

export function useVoicePlayback(selectedChatId: number | null) {
  const [activeVoiceMessageId, setActiveVoiceMessageId] = React.useState<number | null>(null);
  const [voicePlaybackByMessageId, setVoicePlaybackByMessageId] = React.useState<VoicePlaybackState>({});
  const voiceAudioElementsRef = React.useRef<Map<number, HTMLAudioElement>>(new Map());
  const voiceProgressRafRef = React.useRef<number | null>(null);
  const durationProbeInProgressRef = React.useRef<Set<number>>(new Set());

  const formatVoiceTime = React.useCallback((secondsRaw: number) => {
    const normalizedSecondsRaw = Number.isFinite(secondsRaw) ? Math.max(0, secondsRaw) : 0;
    const seconds = normalizedSecondsRaw > 0 && normalizedSecondsRaw < 1
      ? 1
      : Math.floor(normalizedSecondsRaw);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }, []);

  const resolveAudioDuration = React.useCallback((audio: HTMLAudioElement) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }
    if (audio.seekable.length > 0) {
      const seekableEnd = audio.seekable.end(audio.seekable.length - 1);
      if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
        return seekableEnd;
      }
    }
    if (audio.buffered.length > 0) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      if (Number.isFinite(bufferedEnd) && bufferedEnd > 0) {
        return bufferedEnd;
      }
    }
    return 0;
  }, []);

  const setVoicePlaybackSnapshot = React.useCallback((
    messageId: number,
    audio: HTMLAudioElement,
    options?: { force?: boolean },
  ) => {
    if (durationProbeInProgressRef.current.has(messageId) && !options?.force) {
      return;
    }
    const duration = resolveAudioDuration(audio);
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    setVoicePlaybackByMessageId((current) => {
      const previous = current[messageId];
      const safeDuration = Math.max(duration, previous?.duration ?? 0);
      if (previous && Math.abs(previous.currentTime - currentTime) < 0.01 && Math.abs(previous.duration - safeDuration) < 0.01) {
        return current;
      }
      return {
        ...current,
        [messageId]: {
          currentTime,
          duration: safeDuration,
        },
      };
    });
  }, [resolveAudioDuration]);

  const probeVoiceDuration = React.useCallback((messageId: number, audio: HTMLAudioElement) => {
    const knownDuration = resolveAudioDuration(audio);
    if (knownDuration > 0) {
      durationProbeInProgressRef.current.delete(messageId);
      return;
    }
    if (durationProbeInProgressRef.current.has(messageId)) {
      return;
    }
    durationProbeInProgressRef.current.add(messageId);
    const restoreCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

    const clearProbeState = () => {
      durationProbeInProgressRef.current.delete(messageId);
    };

    const handleTimeUpdate = () => {
      try {
        audio.currentTime = restoreCurrentTime;
      } catch {
        // ignore seek restore errors
      }
      setVoicePlaybackSnapshot(messageId, audio, { force: true });
      clearProbeState();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate, { once: true });
    window.setTimeout(() => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      setVoicePlaybackSnapshot(messageId, audio, { force: true });
      clearProbeState();
    }, 1200);

    try {
      audio.currentTime = 24 * 60 * 60;
    } catch {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      setVoicePlaybackSnapshot(messageId, audio, { force: true });
      clearProbeState();
    }
  }, [resolveAudioDuration, setVoicePlaybackSnapshot]);

  const stopVoiceProgressRaf = React.useCallback(() => {
    if (voiceProgressRafRef.current !== null) {
      cancelAnimationFrame(voiceProgressRafRef.current);
      voiceProgressRafRef.current = null;
    }
  }, []);

  const startVoiceProgressRaf = React.useCallback((messageId: number) => {
    stopVoiceProgressRaf();
    const tick = () => {
      const audio = voiceAudioElementsRef.current.get(messageId);
      if (!audio) {
        voiceProgressRafRef.current = null;
        return;
      }
      setVoicePlaybackSnapshot(messageId, audio);
      if (audio.paused || audio.ended) {
        voiceProgressRafRef.current = null;
        return;
      }
      voiceProgressRafRef.current = requestAnimationFrame(tick);
    };
    voiceProgressRafRef.current = requestAnimationFrame(tick);
  }, [setVoicePlaybackSnapshot, stopVoiceProgressRaf]);

  const stopActiveVoiceMessage = React.useCallback(() => {
    const activeId = activeVoiceMessageId;
    if (activeId === null) {
      return;
    }
    const audio = voiceAudioElementsRef.current.get(activeId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setVoicePlaybackSnapshot(activeId, audio);
    }
    stopVoiceProgressRaf();
    setActiveVoiceMessageId(null);
  }, [activeVoiceMessageId, setVoicePlaybackSnapshot, stopVoiceProgressRaf]);

  const toggleVoiceMessagePlayback = React.useCallback((messageId: number) => {
    const targetAudio = voiceAudioElementsRef.current.get(messageId);
    if (!targetAudio) {
      return;
    }

    if (activeVoiceMessageId === messageId) {
      targetAudio.pause();
      targetAudio.currentTime = 0;
      setVoicePlaybackSnapshot(messageId, targetAudio);
      stopVoiceProgressRaf();
      setActiveVoiceMessageId(null);
      return;
    }

    if (activeVoiceMessageId !== null) {
      const previousAudio = voiceAudioElementsRef.current.get(activeVoiceMessageId);
      if (previousAudio) {
        previousAudio.pause();
        previousAudio.currentTime = 0;
        setVoicePlaybackSnapshot(activeVoiceMessageId, previousAudio);
      }
    }

    if (targetAudio.readyState === 0) {
      targetAudio.load();
    }
    setVoicePlaybackSnapshot(messageId, targetAudio);
    void targetAudio.play().then(() => {
      setActiveVoiceMessageId(messageId);
      startVoiceProgressRaf(messageId);
    }).catch(() => {
      setActiveVoiceMessageId(null);
      stopVoiceProgressRaf();
    });
  }, [activeVoiceMessageId, setVoicePlaybackSnapshot, startVoiceProgressRaf, stopVoiceProgressRaf]);

  const registerVoiceAudioElement = React.useCallback((messageId: number, node: HTMLAudioElement | null) => {
    if (node) {
      voiceAudioElementsRef.current.set(messageId, node);
      node.preload = "metadata";
      if (node.readyState === 0) {
        node.load();
      }
      setVoicePlaybackSnapshot(messageId, node);
      probeVoiceDuration(messageId, node);
      return;
    }
    durationProbeInProgressRef.current.delete(messageId);
    voiceAudioElementsRef.current.delete(messageId);
  }, [probeVoiceDuration, setVoicePlaybackSnapshot]);

  const getVoiceAudioHandlers = React.useCallback((messageId: number): VoiceAudioHandlers => ({
    onLoadedMetadata: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
      probeVoiceDuration(messageId, event.currentTarget);
    },
    onLoadedData: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
      probeVoiceDuration(messageId, event.currentTarget);
    },
    onCanPlay: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
      probeVoiceDuration(messageId, event.currentTarget);
    },
    onDurationChange: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
    },
    onTimeUpdate: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
    },
    onPlay: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
      if (activeVoiceMessageId !== messageId) {
        setActiveVoiceMessageId(messageId);
      }
      startVoiceProgressRaf(messageId);
    },
    onPause: (event) => {
      setVoicePlaybackSnapshot(messageId, event.currentTarget);
      if (activeVoiceMessageId === messageId) {
        stopVoiceProgressRaf();
      }
    },
    onEnded: () => {
      if (activeVoiceMessageId === messageId) {
        setActiveVoiceMessageId(null);
      }
      stopVoiceProgressRaf();
    },
  }), [activeVoiceMessageId, probeVoiceDuration, setVoicePlaybackSnapshot, startVoiceProgressRaf, stopVoiceProgressRaf]);

  React.useEffect(() => {
    return () => {
      stopVoiceProgressRaf();
      voiceAudioElementsRef.current.forEach((audio) => {
        audio.pause();
      });
      voiceAudioElementsRef.current.clear();
      durationProbeInProgressRef.current.clear();
    };
  }, [stopVoiceProgressRaf]);

  React.useEffect(() => {
    stopActiveVoiceMessage();
  }, [selectedChatId, stopActiveVoiceMessage]);

  return {
    activeVoiceMessageId,
    voicePlaybackByMessageId,
    formatVoiceTime,
    toggleVoiceMessagePlayback,
    registerVoiceAudioElement,
    getVoiceAudioHandlers,
  };
}
