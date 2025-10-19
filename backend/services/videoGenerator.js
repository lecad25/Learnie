// videoGenerator.js
import ffmpeg from 'fluent-ffmpeg';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElevenLabsService } from './elevenlabs.js';
import { OpenAIService } from './openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VideoGenerator {
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
      
      // Download images and create slide files
      console.log('Creating slide images...');
      const slideFiles = [];
      for (let i = 0; i < slideImages.length; i++) {
        const slideFile = await this.createSlideImage(content.slides[i], slideImages[i], i);
        slideFiles.push(slideFile);
      }
      
      // Generate speech
      console.log('Generating speech...');
      const audioBuffer = await this.elevenlabs.generateSpeech(content.script, voiceId);
      const audioFile = path.join(this.outputDir, `temp_audio_${Date.now()}.mp3`);
      await fs.writeFile(audioFile, audioBuffer);
      
      // Create video from slides and audio
      console.log('Creating video...');
      const videoFile = path.join(this.outputDir, `${voiceId}_${topicId}.mp4`);
      await this.createVideoFromSlides(slideFiles, audioFile, videoFile);
      
      // Cleanup temp files
      await fs.unlink(audioFile);
      for (const slideFile of slideFiles) {
        await fs.unlink(slideFile);
      }
      
      return `/videos/${path.basename(videoFile)}`;
    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    }
  }

  async createSlideImage(slide, imageUrl, index) {
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 1920, 1080);
    
    // Load and draw the AI-generated image
    try {
      const image = await loadImage(imageUrl);
      const imageWidth = 800;
      const imageHeight = 600;
      const imageX = (1920 - imageWidth) / 2;
      const imageY = 200;
      
      ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    } catch (error) {
      console.error('Error loading image:', error);
      // Draw placeholder if image fails to load
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(560, 200, 800, 600);
      ctx.fillStyle = '#6c757d';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Image Loading...', 960, 500);
    }
    
    // Title
    ctx.fillStyle = '#212529';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(slide.title, 960, 100);
    
    // Content
    ctx.fillStyle = '#495057';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    
    // Word wrap for content
    const words = slide.content.split(' ');
    const maxWidth = 1600;
    const lineHeight = 50;
    let y = 900;
    let line = '';
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && line !== '') {
        ctx.fillText(line, 960, y);
        line = word + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 960, y);
    
    // Save slide
    const slideFile = path.join(this.outputDir, `slide_${index}_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(slideFile, buffer);
    
    return slideFile;
  }

  async createVideoFromSlides(slideFiles, audioFile, outputFile) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add each slide as an input
      slideFiles.forEach(slideFile => {
        command.input(slideFile);
      });
      
      // Add audio
      command.input(audioFile);
      
      // Configure output
      command
        .outputOptions([
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-shortest'
        ])
        .output(outputFile)
        .on('end', () => {
          console.log('Video creation completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('Video creation error:', err);
          reject(err);
        })
        .run();
    });
  }
}
