import Sound from "react-native-sound";

Sound.setCategory("Playback", true);

let alertSound: Sound | null = null;

export function startBookingAlertSound() {
  stopBookingAlertSound();
  const sound = new Sound("lexho_booking_alert.wav", Sound.MAIN_BUNDLE, (error) => {
    if (error) return;
    sound.setNumberOfLoops(-1);
    sound.setVolume(1);
    sound.play();
  });
  alertSound = sound;
}

export function stopBookingAlertSound() {
  if (!alertSound) return;
  alertSound.stop();
  alertSound.release();
  alertSound = null;
}
