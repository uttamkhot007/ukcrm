import { useCallback, useRef } from "react";

export type SoundType = "default" | "chime" | "bell" | "pop" | "none";

// Base64 encoded simple notification sounds (short beeps/tones)
const SOUNDS: Record<SoundType, string | null> = {
  default: "data:audio/wav;base64,UklGRl9vT19telefonoXVBVnRFdGEPCm5hbWU9R2VuZXJhdGVkIFNvdW5k",
  chime: null,
  bell: null,
  pop: null,
  none: null,
};

// Generate simple audio using Web Audio API
function createTone(frequency: number, duration: number, type: OscillatorType = "sine"): Promise<void> {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    oscillator.onended = () => {
      audioContext.close();
      resolve();
    };
  });
}

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);

  const playSound = useCallback(async (soundType: SoundType = "default") => {
    // Debounce sounds (minimum 500ms between plays)
    const now = Date.now();
    if (now - lastPlayedRef.current < 500) return;
    lastPlayedRef.current = now;

    if (soundType === "none") return;

    try {
      switch (soundType) {
        case "default":
          await createTone(800, 0.15, "sine");
          break;
        case "chime":
          await createTone(1200, 0.1, "sine");
          setTimeout(() => createTone(1500, 0.15, "sine"), 100);
          break;
        case "bell":
          await createTone(600, 0.3, "triangle");
          break;
        case "pop":
          await createTone(400, 0.05, "square");
          setTimeout(() => createTone(600, 0.08, "square"), 50);
          break;
      }
    } catch (error) {
      console.warn("Failed to play notification sound:", error);
    }
  }, []);

  const testSound = useCallback((soundType: SoundType) => {
    lastPlayedRef.current = 0; // Reset debounce for testing
    playSound(soundType);
  }, [playSound]);

  return { playSound, testSound };
}

export function isWithinQuietHours(
  quietHoursEnabled: boolean,
  quietHoursStart: string,
  quietHoursEnd: string
): boolean {
  if (!quietHoursEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Parse time strings (format: "HH:MM:SS" or "HH:MM")
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = parseTime(quietHoursStart);
  const endMinutes = parseTime(quietHoursEnd);

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
