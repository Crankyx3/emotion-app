import * as FileSystem from 'expo-file-system';
import { OPENAI_API_KEY } from '../config';

/**
 * Transcribe audio file using OpenAI Whisper API
 * @param {string} audioUri - Local file URI of the audio recording
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioUri) {
  try {
    console.log('🎤 Starting transcription for:', audioUri);

    // Prepare form data for OpenAI API
    const formData = new FormData();

    // Add the audio file
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a', // expo-av records as m4a on iOS
      name: 'recording.m4a',
    });

    // Whisper model
    formData.append('model', 'whisper-1');

    // Language hint (optional, helps with accuracy)
    formData.append('language', 'de'); // German

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const transcription = data.text;

    console.log('✅ Transcription successful:', transcription.substring(0, 100) + '...');
    return transcription;
  } catch (error) {
    console.error('❌ Transcription failed:', error);
    throw error;
  }
}

/**
 * Transcribe audio with retry logic
 * @param {string} audioUri - Local file URI of the audio recording
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudioWithRetry(audioUri, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      return await transcribeAudio(audioUri);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
    }
  }

  throw lastError;
}

/**
 * Get estimated cost for transcription
 * @param {number} durationMs - Duration in milliseconds
 * @returns {number} - Estimated cost in USD
 */
export function getTranscriptionCost(durationMs) {
  // OpenAI Whisper costs $0.006 per minute
  const minutes = durationMs / 1000 / 60;
  return minutes * 0.006;
}
