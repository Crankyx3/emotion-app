import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let recording = null;
let recordingUri = null;

/**
 * Request microphone permissions
 */
export async function requestAudioPermissions() {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
}

/**
 * Check if we have recording permissions
 */
export async function hasAudioPermissions() {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking audio permissions:', error);
    return false;
  }
}

/**
 * Start audio recording
 */
export async function startRecording() {
  try {
    // Check permissions
    const hasPermission = await hasAudioPermissions();
    if (!hasPermission) {
      const granted = await requestAudioPermissions();
      if (!granted) {
        throw new Error('Mikrofonzugriff wurde verweigert');
      }
    }

    // Set audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Create recording
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
    console.log('🎙️ Recording started');
    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
}

/**
 * Stop audio recording and return file URI
 */
export async function stopRecording() {
  try {
    if (!recording) {
      throw new Error('No active recording');
    }

    console.log('⏹️ Stopping recording');
    await recording.stopAndUnloadAsync();

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    recordingUri = recording.getURI();
    recording = null;

    console.log('✅ Recording stopped, saved to:', recordingUri);
    return recordingUri;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    throw error;
  }
}

/**
 * Get recording duration in milliseconds
 */
export async function getRecordingDuration() {
  try {
    if (!recording) return 0;
    const status = await recording.getStatusAsync();
    return status.durationMillis || 0;
  } catch (error) {
    console.error('Error getting recording duration:', error);
    return 0;
  }
}

/**
 * Cancel recording without saving
 */
export async function cancelRecording() {
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      recording = null;
      recordingUri = null;
      console.log('❌ Recording cancelled');
    }
  } catch (error) {
    console.error('Error cancelling recording:', error);
  }
}

/**
 * Check if currently recording
 */
export function isRecording() {
  return recording !== null;
}

/**
 * Read audio file as base64 for API upload
 */
export async function getRecordingBase64(uri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error reading audio file:', error);
    throw error;
  }
}
