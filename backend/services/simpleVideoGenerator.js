// simpleVideoGenerator.js
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElevenLabsService } from './elevenlabs.js';
import { OpenAIService } from './openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SimpleVideoGenerator {
  constructor() {
    this.elevenlabs = new ElevenLabsService();
    this.openai = new OpenAIService();
    this.outputDir = path.join(__dirname, '../output');
  }

  async generateVideo(voiceId, topicId, customPrompt = '') {
    try {
      // Get topic name
      const topics = {
        'topic-1': 'Alphabet Adventure',
        'topic-2': 'Counting with Critters',
        'topic-3': 'Solar System Safari',
        'topic-4': 'Fractions with Pizza',
        'topic-5': 'Habitats & Animals'
      };
      
      const topicName = topics[topicId] || 'Educational Topic';
      
      // Generate educational content
      console.log('Generating educational content...');
      const content = await this.openai.generateEducationalContent(topicName, customPrompt);
      
      // Generate images for each slide
      console.log('Generating images...');
      const slideImages = [];
      for (let i = 0; i < content.slides.length; i++) {
        const slide = content.slides[i];
        const imageUrl = await this.openai.generateImage(slide.imagePrompt);
        slideImages.push(imageUrl);
      }
      
      // Download images and save them
      console.log('Downloading and saving images...');
      const imageFiles = [];
      for (let i = 0; i < slideImages.length; i++) {
        const imageFile = await this.downloadImage(slideImages[i], i);
        imageFiles.push(imageFile);
      }
      
      // Generate speech
      console.log('Generating speech...');
      const audioBuffer = await this.elevenlabs.generateSpeech(content.script, voiceId);
      const audioFile = path.join(this.outputDir, `temp_audio_${Date.now()}.mp3`);
      await fs.writeFile(audioFile, audioBuffer);
      
      // For now, just return the first image and audio as a simple solution
      // In a full implementation, you would use FFmpeg to create a video
      const videoFile = path.join(this.outputDir, `${voiceId}_${topicId}.mp4`);
      
      // Create a simple HTML file that can play the content
      const htmlContent = this.createVideoHTML(content, imageFiles, audioFile);
      const htmlFile = path.join(this.outputDir, `${voiceId}_${topicId}.html`);
      await fs.writeFile(htmlFile, htmlContent);
      
      // Cleanup temp files
      await fs.unlink(audioFile);
      
      return `/videos/${path.basename(htmlFile)}`;
    } catch (error) {
      console.error('Video generation error:', error);
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

  createVideoHTML(content, imageFiles, audioFile) {
    const imagePaths = imageFiles.map(file => `/videos/${path.basename(file)}`);
    const audioPath = `/videos/${path.basename(audioFile)}`;
    
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
        .slide {
            display: none;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .slide.active {
            display: block;
        }
        .slide img {
            max-width: 100%;
            height: auto;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .slide h2 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #fff;
        }
        .slide p {
            font-size: 1.5rem;
            line-height: 1.6;
            margin: 20px 0;
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
        audio {
            width: 100%;
            margin: 20px 0;
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
    </style>
</head>
<body>
    <div class="container">
        <h1>${content.title}</h1>
        <audio controls>
            <source src="${audioPath}" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>
        
        <div class="controls">
            <button class="btn" onclick="previousSlide()" id="prevBtn">Previous</button>
            <button class="btn" onclick="nextSlide()" id="nextBtn">Next</button>
            <button class="btn" onclick="togglePlayPause()" id="playBtn">Play</button>
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
    </div>

    <script>
        let currentSlide = 0;
        const totalSlides = ${content.slides.length};
        const audio = document.querySelector('audio');
        let isPlaying = false;
        
        function showSlide(n) {
            const slides = document.querySelectorAll('.slide');
            slides.forEach(slide => slide.classList.remove('active'));
            
            if (n >= totalSlides) currentSlide = 0;
            if (n < 0) currentSlide = totalSlides - 1;
            
            slides[currentSlide].classList.add('active');
            document.getElementById('currentSlide').textContent = currentSlide + 1;
            
            document.getElementById('prevBtn').disabled = currentSlide === 0;
            document.getElementById('nextBtn').disabled = currentSlide === totalSlides - 1;
        }
        
        function nextSlide() {
            currentSlide++;
            showSlide(currentSlide);
        }
        
        function previousSlide() {
            currentSlide--;
            showSlide(currentSlide);
        }
        
        function togglePlayPause() {
            if (isPlaying) {
                audio.pause();
                document.getElementById('playBtn').textContent = 'Play';
                isPlaying = false;
            } else {
                audio.play();
                document.getElementById('playBtn').textContent = 'Pause';
                isPlaying = true;
            }
        }
        
        // Auto-advance slides based on audio time
        audio.addEventListener('timeupdate', function() {
            const slideDuration = audio.duration / totalSlides;
            const newSlide = Math.floor(audio.currentTime / slideDuration);
            if (newSlide !== currentSlide && newSlide < totalSlides) {
                currentSlide = newSlide;
                showSlide(currentSlide);
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') previousSlide();
            if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
            }
        });
        
        // Initialize
        showSlide(0);
    </script>
</body>
</html>`;
  }
}
