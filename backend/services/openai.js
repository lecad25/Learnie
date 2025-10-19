// openai.js
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config.js';

export class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
  }

  async generateEducationalContent(topic, customPrompt = '') {
    try {
      const systemPrompt = `You are an expert educational content creator. Create engaging, age-appropriate educational content for the given topic. 
      Structure your response as a JSON object with the following format:
      {
        "title": "Lesson Title",
        "slides": [
          {
            "title": "Slide Title",
            "content": "Main content for this slide",
            "imagePrompt": "Detailed prompt for AI image generation that matches the slide content"
          }
        ],
        "script": "Complete narration script that covers all slides"
      }
      
      Make the content engaging, educational, and suitable for learning. Each slide should have clear, focused content.`;

      const userPrompt = `Topic: ${topic}
      ${customPrompt ? `Additional instructions: ${customPrompt}` : ''}
      
      Create educational content for this topic.`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate educational content');
    }
  }

  async generateImage(prompt) {
    try {
      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1
      });

      return response.data[0].url;
    } catch (error) {
      console.error('OpenAI Image API error:', error);
      throw new Error('Failed to generate image');
    }
  }
}
