// elevenlabs.js
import axios from 'axios';
import { ELEVENLABS_API_KEY, ELEVENLABS_BASE_URL } from '../config.js';

export class ElevenLabsService {
  constructor() {
    this.apiKey = ELEVENLABS_API_KEY;
    this.baseURL = ELEVENLABS_BASE_URL;
  }

  async generateSpeech(text, voiceId, voiceInstructions = '') {
    try {
      // First, try to get the voice details to check if it's a voice design
      let voiceSettings = {
        stability: 0.5,
        similarity_boost: 0.5
      };

      // Check if this is a voice design (custom voice) or predefined voice
      try {
        const voiceResponse = await axios.get(`${this.baseURL}/voices/${voiceId}`, {
          headers: {
            'xi-api-key': this.apiKey
          }
        });
        
        const voice = voiceResponse.data;
        console.log('Voice details:', voice);
        
        // If it's a voice design, use enhanced settings
        if (voice.category === 'voice_design' || voice.category === 'custom') {
          voiceSettings = {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true
          };
        }
      } catch (voiceError) {
        console.log('Could not fetch voice details, using default settings');
      }

      // Parse voice instructions to adjust voice settings
      if (voiceInstructions && voiceInstructions.trim()) {
        const instructions = voiceInstructions.toLowerCase();
        console.log('Voice instructions:', voiceInstructions);
        
        // Adjust stability (0.0 = more variable, 1.0 = more consistent)
        if (instructions.includes('excited') || instructions.includes('energetic') || instructions.includes('enthusiastic')) {
          voiceSettings.stability = Math.max(0.2, voiceSettings.stability - 0.2);
        } else if (instructions.includes('calm') || instructions.includes('gentle') || instructions.includes('soft')) {
          voiceSettings.stability = Math.min(0.8, voiceSettings.stability + 0.2);
        } else if (instructions.includes('dramatic') || instructions.includes('theatrical')) {
          voiceSettings.stability = Math.max(0.1, voiceSettings.stability - 0.3);
        }
        
        // Adjust similarity boost (0.0 = more creative, 1.0 = more similar to original)
        if (instructions.includes('unique') || instructions.includes('creative') || instructions.includes('different')) {
          voiceSettings.similarity_boost = Math.max(0.2, voiceSettings.similarity_boost - 0.2);
        } else if (instructions.includes('consistent') || instructions.includes('same') || instructions.includes('familiar')) {
          voiceSettings.similarity_boost = Math.min(0.9, voiceSettings.similarity_boost + 0.2);
        }
        
        // Add style parameter for more expressive delivery
        if (instructions.includes('expressive') || instructions.includes('dramatic') || instructions.includes('theatrical')) {
          voiceSettings.style = 0.8;
        } else if (instructions.includes('monotone') || instructions.includes('flat') || instructions.includes('boring')) {
          voiceSettings.style = 0.0;
        } else if (instructions.includes('moderate') || instructions.includes('balanced')) {
          voiceSettings.style = 0.4;
        }
        
        // Adjust speed through text modification
        if (instructions.includes('slow') || instructions.includes('slower')) {
          // Add pauses to slow down speech
          text = text.replace(/\./g, '...').replace(/,/g, ',..');
        } else if (instructions.includes('fast') || instructions.includes('faster')) {
          // Remove some punctuation to speed up
          text = text.replace(/\.\.\./g, '.').replace(/,\.\./g, ',');
        }
        
        // Add emphasis through text modification
        if (instructions.includes('emphatic') || instructions.includes('emphasis') || instructions.includes('strong')) {
          // Add emphasis to key words
          text = text.replace(/\b(important|key|main|primary|essential)\b/gi, '**$1**');
        }
        
        // Add pauses for dramatic effect
        if (instructions.includes('dramatic') || instructions.includes('paused') || instructions.includes('suspenseful')) {
          text = text.replace(/\./g, '...').replace(/!/g, '!...');
        }
        
        console.log('Adjusted voice settings:', voiceSettings);
        console.log('Modified text for voice:', text);
      }

      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: "eleven_multilingual_v2", // Use the latest model
          voice_settings: voiceSettings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('ElevenLabs API error:', error.response?.data || error.message);
      throw new Error('Failed to generate speech');
    }
  }

  async getVoices() {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error.response?.data || error.message);
      throw new Error('Failed to fetch voices');
    }
  }

  async createVoiceDesign(name, description, files) {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      
      // Add audio files for voice cloning
      files.forEach((file, index) => {
        formData.append(`files`, file, `voice_sample_${index}.wav`);
      });

      const response = await axios.post(
        `${this.baseURL}/voice-design`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating voice design:', error.response?.data || error.message);
      throw new Error('Failed to create voice design');
    }
  }

  async getVoiceDesign(voiceId) {
    try {
      const response = await axios.get(`${this.baseURL}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching voice design:', error.response?.data || error.message);
      throw new Error('Failed to fetch voice design');
    }
  }
}
