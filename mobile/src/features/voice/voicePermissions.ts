/**
 * Voice registration belongs to Phase 2 (SPEC RF-021).
 *
 * The permission flow is structured here so the feature can be enabled later
 * without touching the navigation. The camera and the microphone are only
 * requested at the moment the user starts a voice capture, never upfront.
 */
export type VoicePermissionOutcome = 'granted' | 'denied' | 'unavailable';

export type VoicePermissionResult = {
  camera: VoicePermissionOutcome;
  microphone: VoicePermissionOutcome;
};

/** The voice capture is not part of the current release. */
export const VOICE_FEATURE_ENABLED = false;

export async function requestVoicePermissions(): Promise<VoicePermissionResult> {
  return { camera: 'unavailable', microphone: 'unavailable' };
}

/** Manual entry stays available as the alternative to voice capture (SPEC 6.3). */
export const VOICE_FALLBACK_MESSAGE =
  'O registro por voz chega em uma próxima fase. O preenchimento manual continua disponível.';
