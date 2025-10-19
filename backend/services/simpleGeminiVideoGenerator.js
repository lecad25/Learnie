// simpleGeminiVideoGenerator.js
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GeminiService } from './gemini.js';
import { ElevenLabsService } from './elevenlabs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SimpleGeminiVideoGenerator {
  constructor() {
    this.gemini = new GeminiService();
    this.elevenlabs = new ElevenLabsService();
    this.outputDir = path.join(__dirname, '../output');
    this.imageCache = new Map(); // Cache for image hashes
  }

  async generateVideo(voiceId, topicId, customPrompt = '') {
    try {
      // Get topic name
      const topics = {
        'topic-1': 'Alphabet',
        'topic-2': 'Counting',
        'topic-3': 'Solar System',
        'topic-4': 'Fractions',
        'topic-5': 'Shapes',
        'topic-6': 'Weather',
        'topic-7': 'Animals',
        'topic-8': 'Time',
        'topic-9': 'Money',
        'custom': 'Custom Topic'
      };
      
      // Map voice IDs to actual ElevenLabs voice IDs
      // These are real ElevenLabs voice IDs for different character types
      const voiceMapping = {
        'voice-1': 'EXAVITQu4vr4xnSDxMaL', // Sarah (Female, American) - Teacher
        'voice-2': 'IKne3meq5aSn9XLyUdCD', // Charlie (Male, American) - Coach
        'voice-3': 'JBFqnCBsd6RMkjVDRZzb', // George (Male, American) - Scientist
        'voice-4': 'N2lVS1w4EtoT3dr4eOWO', // Callum (Male, British) - Explorer
        'voice-5': 'XrExE9yKIg1WjnnlVkGX'  // Matilda (Female, American) - Chef Mia
      };
      
      // Try to get available voices from ElevenLabs
      try {
        const availableVoices = await this.elevenlabs.getVoices();
        console.log('Available ElevenLabs voices:', availableVoices.map(v => ({ id: v.voice_id, name: v.name, category: v.category })));
      } catch (error) {
        console.log('Could not fetch available voices:', error.message);
      }
      
      const actualVoiceId = voiceMapping[voiceId] || voiceId;
      const topicName = topics[topicId] || 'Educational Topic';
      
      console.log(`Using voice ID: ${actualVoiceId} for voice: ${voiceId}`);
      console.log(`Generating content for topic: ${topicName}`);
      
      // Generate educational content using Gemini
      console.log('Generating educational content with Gemini...');
      const content = await this.gemini.generateEducationalContent(topicName, customPrompt, topicId);
      
      // Debug: Log the generated content
      console.log('Generated content:', JSON.stringify(content, null, 2));
      console.log(`Content has ${content.slides.length} slides`);
      console.log(`Script length: ${content.script.length} characters`);
      
      // Generate images for each slide
      console.log('Generating images...');
      const slideImages = [];
      for (let i = 0; i < content.slides.length; i++) {
        const slide = content.slides[i];
        console.log(`Generating image for slide ${i + 1}: ${slide.title}`);
        const imageUrl = await this.gemini.generateImage(slide.imagePrompt);
        slideImages.push(imageUrl);
      }
      
      // Save images to files
      console.log('Saving images...');
      const imageFiles = [];
      for (let i = 0; i < slideImages.length; i++) {
        const imageFile = await this.saveImage(slideImages[i], i);
        imageFiles.push(imageFile);
      }
      
      // Generate voiceover using ElevenLabs
      console.log('Generating voiceover...');
      let audioFile = null;
      try {
        console.log(`Generating speech with voice ID: ${actualVoiceId}`);
        console.log(`Script length: ${content.script.length} characters`);
        console.log(`Script content: ${content.script.substring(0, 100)}...`);
        
        const audioBuffer = await this.elevenlabs.generateSpeech(content.script, actualVoiceId, content.voiceInstructions || '');
        audioFile = path.join(this.outputDir, `audio_${voiceId}_${topicId}.mp3`);
        await fs.writeFile(audioFile, audioBuffer);
        console.log(`Audio saved to: ${audioFile}`);
        
        // Verify the file was created
        const stats = await fs.stat(audioFile);
        console.log(`Audio file size: ${stats.size} bytes`);
      } catch (error) {
        console.error('Voice generation failed:', error);
        console.error('Error details:', error.message);
        // Continue without audio
      }
      
      // Create a simple HTML presentation
      const htmlFile = path.join(this.outputDir, `${voiceId}_${topicId}.html`);
      const htmlContent = await this.createVideoHTML(content, imageFiles, voiceId, audioFile);
      await fs.writeFile(htmlFile, htmlContent);
      
      // Clean up old images (older than 24 hours) after successful generation
      try {
        await this.cleanupOldImages(24);
      } catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError.message);
      }
      
      return `/videos/${path.basename(htmlFile)}`;
    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    }
  }

  async saveImage(imageData, index) {
    try {
      let imageBuffer;
      let extension = 'jpg';
      
      if (imageData.startsWith('data:image/svg+xml')) {
        // Handle SVG data URI
        const base64Data = imageData.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
        extension = 'svg';
      } else if (imageData.startsWith('data:image/')) {
        // Handle other data URI (base64 encoded image)
        const base64Data = imageData.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
        // Determine extension from MIME type
        if (imageData.includes('data:image/png')) {
          extension = 'png';
        } else if (imageData.includes('data:image/jpeg')) {
          extension = 'jpg';
        }
      } else if (imageData.startsWith('http')) {
        // Handle URL - download the image
        const response = await axios.get(imageData, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(response.data);
      } else {
        throw new Error('Unsupported image format');
      }
      
      // Generate hash for caching
      const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
      const cacheKey = `${hash}_${index}`;
      
      // Check if image already exists in cache
      if (this.imageCache.has(cacheKey)) {
        const cachedFile = this.imageCache.get(cacheKey);
        console.log(`Using cached image: ${cachedFile}`);
        return cachedFile;
      }
      
      // Save new image with hash-based filename
      const imageFile = path.join(this.outputDir, `slide_${index}_${hash}.${extension}`);
      await fs.writeFile(imageFile, imageBuffer);
      
      // Cache the file path
      this.imageCache.set(cacheKey, imageFile);
      console.log(`Saved new image: ${imageFile}`);
      
      return imageFile;
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  }

  async downloadImage(imageUrl, index) {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageFile = path.join(this.outputDir, `slide_${index}_${Date.now()}.jpg`);
      await fs.writeFile(imageFile, response.data);
      return imageFile;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }

  async createVideoHTML(content, imageFiles, voiceId, audioFile = null) {
    // Use data URIs for images instead of file paths
    const imagePaths = await Promise.all(imageFiles.map(async (file) => {
      try {
        const imageData = await fs.readFile(file);
        const extension = path.extname(file).toLowerCase();
        
        // Determine MIME type based on file extension
        let mimeType = 'image/jpeg'; // default
        if (extension === '.svg') {
          mimeType = 'image/svg+xml';
        } else if (extension === '.png') {
          mimeType = 'image/png';
        } else if (extension === '.jpg' || extension === '.jpeg') {
          mimeType = 'image/jpeg';
        }
        
        return `data:${mimeType};base64,${imageData.toString('base64')}`;
      } catch (error) {
        console.error('Error reading image file:', error);
        // Fallback to a simple SVG
        return `data:image/svg+xml;base64,${Buffer.from(`
          <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#667eea"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
              Educational Content
            </text>
          </svg>
        `).toString('base64')}`;
      }
    }));
    
    // Get voice name for display
    const voices = {
      'voice-1': 'Teacher Ava',
      'voice-2': 'Coach Max', 
      'voice-3': 'Scientist Joe',
      'voice-4': 'Explorer Kai',
      'voice-5': 'Chef Mia'
    };
    const voiceName = voices[voiceId] || 'Voice';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            text-align: center;
        }
        .container h1 {
            font-size: 3rem;
            font-weight: bold;
            color: #ffffff;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            margin: 20px 0 30px 0;
        }
        .slide {
            display: none;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            margin: 10px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-height: 90vh;
            overflow-y: auto;
        }
        .slide.active {
            display: block;
        }
        .slide img {
            max-width: 100%;
            max-height: 60vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: block;
            margin: 0 auto;
        }
        .slide h2 {
            font-size: 2rem;
            margin-bottom: 15px;
            color: #fff;
        }
        .slide p {
            font-size: 1.2rem;
            line-height: 1.5;
            margin: 15px 0;
        }
        .controls {
            margin: 20px 0;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1.1rem;
            margin: 0 10px;
            transition: transform 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Custom Audio Player Styles */
        .audio-player-container {
            margin: 20px 0;
        }
        
        .audio-player {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .audio-controls {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        
        .play-pause-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 18px;
        }
        
        .play-pause-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .audio-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .time-display {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
        }
        
        .progress-container {
            width: 100%;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 3px;
            width: 0%;
            transition: width 0.1s ease;
        }
        
        .volume-control {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 120px;
        }
        
        .volume-control span {
            font-size: 16px;
        }
        
        .volume-control input[type="range"] {
            width: 80px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            outline: none;
            -webkit-appearance: none;
        }
        
        .volume-control input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            cursor: pointer;
        }
        
        .volume-control input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            cursor: pointer;
            border: none;
        }
        
        .audio-description {
            text-align: center;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 5px;
        }
        .slide-counter {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 1.2rem;
        }
        .voice-info {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-size: 1.2rem;
        }
        .script-display {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            font-size: 1.1rem;
            line-height: 1.6;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: white; text-align: center; margin-bottom: 20px; font-size: 2.5rem; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);">${content.title}</h1>
        
        <div class="voice-info">
            <strong>Voice:</strong> ${voiceName}
        </div>
        
        ${audioFile ? `
        <div class="audio-player-container">
            <div class="audio-player">
                <div class="audio-controls">
                    <button class="play-pause-btn" id="playPauseBtn" onclick="togglePlayPause()">
                        <span id="playIcon">▶️</span>
                    </button>
                    <div class="audio-info">
                        <div class="time-display">
                            <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar" id="progressBar" onclick="seekTo(event)">
                                <div class="progress-fill" id="progressFill"></div>
                            </div>
                        </div>
                    </div>
                    <div class="volume-control">
                        <span>🔊</span>
                        <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="1" onchange="setVolume(this.value)">
                    </div>
                </div>
            </div>
            <audio id="audioPlayer" preload="metadata">
                <source src="/videos/${path.basename(audioFile)}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        </div>
        ` : `
        <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
            <strong>Note:</strong> Audio generation failed. Use the "Play Voiceover" button for text-to-speech.
        </div>
        `}
        
        <div class="controls">
            <button class="btn" onclick="previousSlide()" id="prevBtn">Previous</button>
            <button class="btn" onclick="nextSlide()" id="nextBtn">Next</button>
            ${audioFile ? `
            <button class="btn" onclick="toggleAudio()" id="audioBtn">Play Audio</button>
            ` : `
            <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                <strong>Note:</strong> Audio generation failed. Use the "Play Audio" button for text-to-speech.
            </div>
            `}
            <button class="btn" onclick="toggleScript()" id="scriptBtn">Show Script</button>
        </div>
        
        <div class="slide-counter">
            <span id="currentSlide">1</span> / <span id="totalSlides">${content.slides.length}</span>
        </div>
        
        ${content.slides.map((slide, index) => `
            <div class="slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
                <h2>${slide.title}</h2>
                <img src="${imagePaths[index]}" alt="${slide.title}">
                <p>${slide.content}</p>
            </div>
        `).join('')}
        
        <div class="script-display" id="scriptDisplay" style="display: none;">
            <h3>Narration Script:</h3>
            <p>${content.script}</p>
        </div>
    </div>

    <script>
        let currentSlide = 0;
        const totalSlides = ${content.slides.length};
        let scriptVisible = false;
        let isPlaying = false;
        const hasAudio = ${audioFile ? 'true' : 'false'};
        const audioPlayer = document.getElementById('audioPlayer');
        
        function showSlide(n) {
            const slides = document.querySelectorAll('.slide');
            slides.forEach(slide => slide.classList.remove('active'));
            
            if (n >= totalSlides) currentSlide = 0;
            if (n < 0) currentSlide = totalSlides - 1;
            
            slides[currentSlide].classList.add('active');
            document.getElementById('currentSlide').textContent = currentSlide + 1;
            
            // Update button states
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            if (prevBtn) prevBtn.disabled = currentSlide === 0;
            if (nextBtn) nextBtn.disabled = currentSlide === totalSlides - 1;
            
            // Audio will be handled by the custom audio player
        }
        
        function nextSlide() {
            if (currentSlide < totalSlides - 1) {
                currentSlide++;
                showSlide(currentSlide);
            }
        }
        
        function previousSlide() {
            if (currentSlide > 0) {
                currentSlide--;
                showSlide(currentSlide);
            }
        }
        
        
        function toggleAudio() {
            const audioBtn = document.getElementById('audioBtn');
            
            if (audioPlayer.paused) {
                audioPlayer.play();
                audioBtn.textContent = 'Pause Audio';
            } else {
                audioPlayer.pause();
                audioBtn.textContent = 'Play Audio';
            }
        }
        
        
        function toggleScript() {
            const scriptDisplay = document.getElementById('scriptDisplay');
            const scriptBtn = document.getElementById('scriptBtn');
            
            if (scriptVisible) {
                scriptDisplay.style.display = 'none';
                scriptBtn.textContent = 'Show Script';
                scriptVisible = false;
            } else {
                scriptDisplay.style.display = 'block';
                scriptBtn.textContent = 'Hide Script';
                scriptVisible = true;
            }
        }
        
        // Keyboard controls
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') previousSlide();
            if (e.key === ' ') {
                e.preventDefault();
                if (hasAudio) {
                    toggleAudio();
                }
            }
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                toggleScript();
            }
        });
        
        // Custom Audio Player Functions
        function togglePlayPause() {
            const audioPlayer = document.getElementById('audioPlayer');
            const playIcon = document.getElementById('playIcon');
            
            if (isPlaying) {
                audioPlayer.pause();
                playIcon.textContent = '▶️';
                isPlaying = false;
            } else {
                audioPlayer.play();
                playIcon.textContent = '⏸️';
                isPlaying = true;
            }
        }
        
        function seekTo(event) {
            const audioPlayer = document.getElementById('audioPlayer');
            const progressBar = document.getElementById('progressBar');
            const rect = progressBar.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const width = rect.width;
            const percentage = clickX / width;
            const newTime = percentage * audioPlayer.duration;
            
            audioPlayer.currentTime = newTime;
        }
        
        function setVolume(value) {
            const audioPlayer = document.getElementById('audioPlayer');
            audioPlayer.volume = value;
        }
        
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
        
        // Initialize custom audio player
        if (hasAudio && audioPlayer) {
            const playIcon = document.getElementById('playIcon');
            const currentTimeEl = document.getElementById('currentTime');
            const durationEl = document.getElementById('duration');
            const progressFill = document.getElementById('progressFill');
            
            audioPlayer.addEventListener('loadedmetadata', function() {
                if (durationEl) durationEl.textContent = formatTime(audioPlayer.duration);
            });
            
            audioPlayer.addEventListener('timeupdate', function() {
                if (currentTimeEl) currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
                if (progressFill) {
                    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                    progressFill.style.width = progress + '%';
                }
                
                // Auto-advance slides based on audio progress
                const slideDuration = audioPlayer.duration / totalSlides;
                const newSlide = Math.floor(audioPlayer.currentTime / slideDuration);
                if (newSlide !== currentSlide && newSlide < totalSlides) {
                    currentSlide = newSlide;
                    showSlide(currentSlide);
                }
            });
            
            audioPlayer.addEventListener('ended', function() {
                if (playIcon) playIcon.textContent = '▶️';
                isPlaying = false;
            });
        } else {
            // Fallback: Auto-advance slides every 15 seconds
            setInterval(() => {
                if (currentSlide < totalSlides - 1) {
                    nextSlide();
                }
            }, 15000);
        }
        
        // Initialize
        showSlide(0);
        
        // Load voices when they become available
    </script>
</body>
</html>`;
  }

  // Cleanup methods for managing image files
  async cleanupOldImages(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
      
      let cleanedCount = 0;
      let totalSize = 0;
      
      for (const file of files) {
        if (file.startsWith('slide_') && (file.endsWith('.jpg') || file.endsWith('.svg') || file.endsWith('.png'))) {
          const filePath = path.join(this.outputDir, file);
          const stats = await fs.stat(filePath);
          
          // Check if file is older than maxAge
          if (now - stats.mtime.getTime() > maxAge) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            cleanedCount++;
            console.log(`Cleaned up old image: ${file}`);
          }
        }
      }
      
      console.log(`Cleanup completed: ${cleanedCount} files removed, ${(totalSize / 1024 / 1024).toFixed(2)} MB freed`);
      return { cleanedCount, totalSize };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  async getImageStats() {
    try {
      const files = await fs.readdir(this.outputDir);
      const imageFiles = files.filter(file => 
        file.startsWith('slide_') && (file.endsWith('.jpg') || file.endsWith('.svg') || file.endsWith('.png'))
      );
      
      let totalSize = 0;
      const fileStats = [];
      
      for (const file of imageFiles) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        fileStats.push({
          name: file,
          size: stats.size,
          created: stats.mtime
        });
      }
      
      return {
        totalFiles: imageFiles.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        files: fileStats.sort((a, b) => b.created - a.created) // Sort by newest first
      };
    } catch (error) {
      console.error('Error getting image stats:', error);
      throw error;
    }
  }

  async clearImageCache() {
    this.imageCache.clear();
    console.log('Image cache cleared');
  }
}
