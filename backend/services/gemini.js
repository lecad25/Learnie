// gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '../config.js';

export class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.imageModel = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });
  }

  async generateEducationalContent(topic, customPrompt = '', topicId = null) {
    try {
      const systemPrompt = `You are an expert teacher creating focused lecture slides for children. Create concise, visual lecture content that teaches specific concepts step-by-step.

      Structure your response as a JSON object with the following format:
      {
        "title": "Lecture Title",
        "slides": [
          {
            "title": "Slide Title",
            "content": "Focused teaching content for this specific slide - what the teacher is explaining",
            "imagePrompt": "Detailed visual description of what should be shown on this slide to support the teaching"
          }
        ],
        "script": "Complete teaching script where the teacher actually explains each slide's content in detail"
      }
      
      LECTURE GUIDELINES:
      - Create 2-3 focused slides maximum (keep it short!)
      - Each slide should teach ONE specific concept
      - Content should be what the teacher is explaining, not summaries
      - Images should visually support what's being taught
      - Use clear, direct teaching language
      - Make each slide build on the previous one
      - Focus on the core concept being taught
      - CUSTOMIZE based on specific requirements provided
      - NEVER include references to "tell me in chat", "ask me questions", or similar interactive elements
      - The script should be a complete lecture that works without user interaction
      - Use engaging, educational language appropriate for children
      - Keep scripts SHORT - maximum 300-400 characters total
      - Each slide explanation should be 1-2 sentences maximum
      
      CUSTOM INSTRUCTIONS INTEGRATION (PRIORITY):
      - Custom instructions are the PRIMARY driver of content generation
      - If custom instructions are provided, they should completely shape the lesson
      - Use custom themes, characters, examples, and teaching approaches throughout
      - Custom instructions can override default topic content - follow them completely
      - Make custom elements the main focus of slides, content, and voice script
      - If custom instructions specify length, style, or approach, prioritize those over defaults
      - Custom instructions should be the foundation, not just additions
      
      For "Fractions with Pizza":
      - Slide 1: Show whole pizza, explain what fractions are
      - Slide 2: Show pizza cut in half, teach 1/2 concept
      - Slide 3: Show pizza cut in quarters, teach 1/4 concept
      - Slide 4: Compare different fractions visually
      - Slide 5: Practice with real examples`;

      const userPrompt = `Topic: ${topic}
      ${customPrompt ? `
      🎯 CUSTOM INSTRUCTIONS (MANDATORY): ${customPrompt}
      
      These custom instructions should COMPLETELY DRIVE the lesson creation. Use them as the primary foundation for:
      - Lesson structure and content
      - Teaching approach and style  
      - Examples and demonstrations
      - Visual descriptions and imagery
      - Voice script and narration
      - Overall lesson theme and tone
      
      The custom instructions take priority over any default topic content. Build the entire lesson around these requirements.` : ''}
      
      Create an engaging, educational lesson that uses specific examples and visual demonstrations. 
      Make it interactive and fun for children to learn.`;

      const result = await this.model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const response = await result.response;
      const content = response.text();
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedContent = JSON.parse(jsonMatch[0]);
        // Convert fractions to words in the script for better voice reading
        if (parsedContent.script) {
          parsedContent.script = parsedContent.script
            .replace(/\b1\/2\b/g, 'one half')
            .replace(/\b1\/3\b/g, 'one third')
            .replace(/\b1\/4\b/g, 'one quarter')
            .replace(/\b1\/5\b/g, 'one fifth')
            .replace(/\b1\/6\b/g, 'one sixth')
            .replace(/\b1\/7\b/g, 'one seventh')
            .replace(/\b1\/8\b/g, 'one eighth')
            .replace(/\b2\/3\b/g, 'two thirds')
            .replace(/\b2\/4\b/g, 'two quarters')
            .replace(/\b3\/4\b/g, 'three quarters')
            .replace(/\b2\/5\b/g, 'two fifths')
            .replace(/\b3\/5\b/g, 'three fifths')
            .replace(/\b4\/5\b/g, 'four fifths')
            .replace(/\b2\/6\b/g, 'two sixths')
            .replace(/\b3\/6\b/g, 'three sixths')
            .replace(/\b4\/6\b/g, 'four sixths')
            .replace(/\b5\/6\b/g, 'five sixths')
            .replace(/\b2\/8\b/g, 'two eighths')
            .replace(/\b3\/8\b/g, 'three eighths')
            .replace(/\b4\/8\b/g, 'four eighths')
            .replace(/\b5\/8\b/g, 'five eighths')
            .replace(/\b6\/8\b/g, 'six eighths')
            .replace(/\b7\/8\b/g, 'seven eighths');
        }
        
        // Extract voice instructions from custom prompt
        const voiceInstructions = this.extractVoiceInstructions(customPrompt);
        parsedContent.voiceInstructions = voiceInstructions;
        
        return parsedContent;
      } else {
        // Fallback if JSON parsing fails
        const fallbackContent = {
          title: `Lesson: ${topic}`,
          slides: [
            {
              title: `Introduction to ${topic}`,
              content: `Welcome to our lesson about ${topic}. Let's explore this fascinating topic together!`,
              imagePrompt: `Educational illustration about ${topic}, colorful and engaging for learning`
            }
          ],
          script: `Welcome to our lesson about ${topic}. This is an exciting topic that we'll explore together.`
        };
        
        // Extract voice instructions from custom prompt
        const voiceInstructions = this.extractVoiceInstructions(customPrompt);
        fallbackContent.voiceInstructions = voiceInstructions;
        
        return fallbackContent;
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      console.error('Error details:', error.message);
      console.error('API Key (first 10 chars):', GEMINI_API_KEY.substring(0, 10));
      
          // Return fallback content with specific examples based on topic
          const fallbackContent = this.getFallbackContent(topic, customPrompt, topicId);
          return fallbackContent;
    }
  }

  // Helper method to extract voice instructions from custom prompt
  extractVoiceInstructions(customPrompt) {
    if (!customPrompt || !customPrompt.trim()) return '';
    
    const voiceKeywords = [
      'excited', 'energetic', 'enthusiastic', 'calm', 'gentle', 'soft',
      'dramatic', 'theatrical', 'expressive', 'monotone', 'flat', 'boring',
      'slow', 'slower', 'fast', 'faster', 'emphatic', 'emphasis', 'strong',
      'paused', 'suspenseful', 'unique', 'creative', 'different', 'consistent',
      'same', 'familiar', 'moderate', 'balanced'
    ];
    
    const words = customPrompt.toLowerCase().split(/\s+/);
    const voiceInstructions = words.filter(word => 
      voiceKeywords.some(keyword => word.includes(keyword))
    );
    
    return voiceInstructions.join(' ');
  }

  getFallbackContent(topic, customPrompt = '', topicId = null) {
    // Create specific fallback content based on the topic
    const topicLower = topic.toLowerCase();
    const hasCustomRequirements = customPrompt && customPrompt.trim().length > 0;
    
    // Helper function to integrate custom instructions into content
    const integrateCustomInstructions = (baseContent, customPrompt, context = 'content') => {
      if (!customPrompt || !customPrompt.trim()) return baseContent;
      
      const customLower = customPrompt.toLowerCase();
      
      // Enhanced theme detection and integration
      if (customLower.includes('space') || customLower.includes('astronaut') || customLower.includes('galaxy')) {
        return baseContent
          .replace(/pizza/gi, 'space pizza')
          .replace(/apple/gi, 'space apple')
          .replace(/Let's learn/gi, 'Let\'s blast off and learn')
          .replace(/Today we're/gi, 'Today we\'re launching into space to')
          .replace(/Welcome to/gi, 'Welcome to the cosmic journey of');
      } else if (customLower.includes('pirate') || customLower.includes('treasure') || customLower.includes('ship')) {
        return baseContent
          .replace(/Let's learn/gi, 'Ahoy matey! Let\'s learn')
          .replace(/apple/gi, 'treasure')
          .replace(/pizza/gi, 'treasure map')
          .replace(/Today we're/gi, 'Today we\'re sailing the seven seas to')
          .replace(/Welcome to/gi, 'Welcome aboard our pirate ship to learn about');
      } else if (customLower.includes('princess') || customLower.includes('castle') || customLower.includes('royal')) {
        return baseContent
          .replace(/Let's learn/gi, 'Your majesty, let\'s learn')
          .replace(/apple/gi, 'royal apple')
          .replace(/pizza/gi, 'royal pizza')
          .replace(/Today we're/gi, 'Today in our royal kingdom, we\'re')
          .replace(/Welcome to/gi, 'Welcome to the royal court to learn about');
      } else if (customLower.includes('dinosaur') || customLower.includes('prehistoric') || customLower.includes('jurassic')) {
        return baseContent
          .replace(/Let's learn/gi, 'Roar! Let\'s learn')
          .replace(/apple/gi, 'dino apple')
          .replace(/pizza/gi, 'dino pizza')
          .replace(/Today we're/gi, 'Today we\'re traveling back in time to')
          .replace(/Welcome to/gi, 'Welcome to the prehistoric world of');
      } else if (customLower.includes('superhero') || customLower.includes('super') || customLower.includes('hero')) {
        return baseContent
          .replace(/Let's learn/gi, 'Up, up, and away! Let\'s learn')
          .replace(/apple/gi, 'super apple')
          .replace(/pizza/gi, 'super pizza')
          .replace(/Today we're/gi, 'Today we\'re using our superpowers to')
          .replace(/Welcome to/gi, 'Welcome to superhero academy to learn about');
      } else if (customLower.includes('magic') || customLower.includes('wizard') || customLower.includes('spell')) {
        return baseContent
          .replace(/Let's learn/gi, 'Abracadabra! Let\'s learn')
          .replace(/Today we're/gi, 'Today we\'re casting magical spells to')
          .replace(/Welcome to/gi, 'Welcome to the magical world of');
      } else if (customLower.includes('adventure') || customLower.includes('explorer') || customLower.includes('journey')) {
        return baseContent
          .replace(/Let's learn/gi, 'Adventure awaits! Let\'s learn')
          .replace(/Today we're/gi, 'Today we\'re embarking on an exciting adventure to')
          .replace(/Welcome to/gi, 'Welcome to our grand adventure learning about');
      }
      
      // For length instructions, don't modify content
      if (customLower.includes('longer') || customLower.includes('shorter') || customLower.includes('brief') || customLower.includes('quick') || customLower.includes('extended') || customLower.includes('detailed') || customLower.includes('comprehensive')) {
        return baseContent;
      }
      
      // For titles, don't prepend custom instructions
      if (context === 'title') {
        return baseContent;
      }
      
      // For other content, integrate naturally without prepending
      return baseContent;
    };

    // Helper function to convert fractions to words for better voice reading
    const convertFractionsToWords = (text) => {
      return text
        .replace(/\b1\/2\b/g, 'one half')
        .replace(/\b1\/3\b/g, 'one third')
        .replace(/\b1\/4\b/g, 'one quarter')
        .replace(/\b1\/5\b/g, 'one fifth')
        .replace(/\b1\/6\b/g, 'one sixth')
        .replace(/\b1\/7\b/g, 'one seventh')
        .replace(/\b1\/8\b/g, 'one eighth')
        .replace(/\b2\/3\b/g, 'two thirds')
        .replace(/\b2\/4\b/g, 'two quarters')
        .replace(/\b3\/4\b/g, 'three quarters')
        .replace(/\b2\/5\b/g, 'two fifths')
        .replace(/\b3\/5\b/g, 'three fifths')
        .replace(/\b4\/5\b/g, 'four fifths')
        .replace(/\b2\/6\b/g, 'two sixths')
        .replace(/\b3\/6\b/g, 'three sixths')
        .replace(/\b4\/6\b/g, 'four sixths')
        .replace(/\b5\/6\b/g, 'five sixths')
        .replace(/\b2\/8\b/g, 'two eighths')
        .replace(/\b3\/8\b/g, 'three eighths')
        .replace(/\b4\/8\b/g, 'four eighths')
        .replace(/\b5\/8\b/g, 'five eighths')
        .replace(/\b6\/8\b/g, 'six eighths')
        .replace(/\b7\/8\b/g, 'seven eighths');
    };

    // Helper function to extract voice instructions from custom prompt
    const extractVoiceInstructions = (customPrompt) => {
      if (!customPrompt || !customPrompt.trim()) return '';
      
      const voiceKeywords = [
        'excited', 'energetic', 'enthusiastic', 'calm', 'gentle', 'soft',
        'dramatic', 'theatrical', 'expressive', 'monotone', 'flat', 'boring',
        'slow', 'slower', 'fast', 'faster', 'emphatic', 'emphasis', 'strong',
        'paused', 'suspenseful', 'unique', 'creative', 'different', 'consistent',
        'same', 'familiar', 'moderate', 'balanced'
      ];
      
      const words = customPrompt.toLowerCase().split(/\s+/);
      const voiceInstructions = words.filter(word => 
        voiceKeywords.some(keyword => word.includes(keyword))
      );
      
      return voiceInstructions.join(' ');
    };

    // Helper function to determine lesson length based on custom instructions
    const getLessonLength = (customPrompt) => {
      if (!customPrompt || !customPrompt.trim()) return 'normal';
      
      const customLower = customPrompt.toLowerCase();
      
      if (customLower.includes('longer') || customLower.includes('more slides') || customLower.includes('extended')) {
        return 'long';
      } else if (customLower.includes('shorter') || customLower.includes('brief') || customLower.includes('quick')) {
        return 'short';
      } else if (customLower.includes('very long') || customLower.includes('detailed') || customLower.includes('comprehensive')) {
        return 'very_long';
      }
      
      return 'normal';
    };
    
    if (topicLower.includes('fraction')) {
      const lessonLength = getLessonLength(customPrompt);
      
      let baseContent;
      
      if (lessonLength === 'short') {
        baseContent = {
          title: "🍕 Learning Fractions",
          slides: [
            {
              title: "What is a Fraction?",
              content: "A fraction shows parts of a whole. Look at this pizza - it's one whole pizza. When we cut it into equal pieces, each piece is a fraction.",
              imagePrompt: "A whole pizza with the number 1/1 written next to it"
            },
            {
              title: "Cutting in Half",
              content: "Now I'm cutting the pizza in half. Each piece is 1/2. The 2 means 2 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut in half with one slice highlighted and labeled '1/2'"
            }
          ],
          script: "Let's learn about fractions! A fraction shows parts of a whole. Look at this pizza - it's one whole pizza, which we write as 1/1. Now I'm cutting it in half. Each piece is 1/2 - that means 1 out of 2 pieces. The 2 at the bottom tells us there are 2 total pieces, and the 1 at the top tells us we have 1 piece. That's how fractions work!"
        };
      } else if (lessonLength === 'long') {
        baseContent = {
          title: "🍕 Learning Fractions",
          slides: [
            {
              title: "What is a Fraction?",
              content: "A fraction shows parts of a whole. Look at this pizza - it's one whole pizza. When we cut it into equal pieces, each piece is a fraction.",
              imagePrompt: "A whole pizza with the number 1/1 written next to it"
            },
            {
              title: "Cutting in Half",
              content: "Now I'm cutting the pizza in half. Each piece is 1/2. The 2 means 2 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut in half with one slice highlighted and labeled '1/2'"
            },
            {
              title: "Cutting in Quarters",
              content: "Now I'm cutting it into 4 equal pieces. Each piece is 1/4. The 4 means 4 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut into 4 quarters with one slice highlighted and labeled '1/4'"
            },
            {
              title: "Cutting in Eighths",
              content: "Now I'm cutting it into 8 equal pieces. Each piece is 1/8. The 8 means 8 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut into 8 eighths with one slice highlighted and labeled '1/8'"
            },
            {
              title: "Comparing Fractions",
              content: "1/2 is bigger than 1/4, and 1/4 is bigger than 1/8. The bigger the bottom number, the smaller each piece becomes.",
              imagePrompt: "Three pizzas side by side showing 1/2, 1/4, and 1/8 with size comparison"
            }
          ],
          script: "Let's learn about fractions! A fraction shows parts of a whole. Look at this pizza - it's one whole pizza, which we write as 1/1. Now I'm cutting it in half. Each piece is 1/2 - that means 1 out of 2 pieces. The 2 at the bottom tells us there are 2 total pieces, and the 1 at the top tells us we have 1 piece. Now I'm cutting the pizza into 4 equal pieces. Each piece is 1/4 - that's 1 out of 4 pieces. Now I'm cutting it into 8 equal pieces. Each piece is 1/8 - that's 1 out of 8 pieces. Notice that 1/2 is bigger than 1/4, and 1/4 is bigger than 1/8. The bigger the bottom number, the smaller each piece becomes. That's how fractions work!"
        };
      } else if (lessonLength === 'very_long') {
        baseContent = {
          title: "🍕 Learning Fractions",
          slides: [
            {
              title: "What is a Fraction?",
              content: "A fraction shows parts of a whole. Look at this pizza - it's one whole pizza. When we cut it into equal pieces, each piece is a fraction.",
              imagePrompt: "A whole pizza with the number 1/1 written next to it"
            },
            {
              title: "Cutting in Half",
              content: "Now I'm cutting the pizza in half. Each piece is 1/2. The 2 means 2 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut in half with one slice highlighted and labeled '1/2'"
            },
            {
              title: "Cutting in Quarters",
              content: "Now I'm cutting it into 4 equal pieces. Each piece is 1/4. The 4 means 4 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut into 4 quarters with one slice highlighted and labeled '1/4'"
            },
            {
              title: "Cutting in Eighths",
              content: "Now I'm cutting it into 8 equal pieces. Each piece is 1/8. The 8 means 8 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut into 8 eighths with one slice highlighted and labeled '1/8'"
            },
            {
              title: "Comparing Fractions",
              content: "1/2 is bigger than 1/4, and 1/4 is bigger than 1/8. The bigger the bottom number, the smaller each piece becomes.",
              imagePrompt: "Three pizzas side by side showing 1/2, 1/4, and 1/8 with size comparison"
            },
            {
              title: "Adding Fractions",
              content: "When we add 1/4 + 1/4, we get 2/4, which is the same as 1/2. Fractions with the same bottom number are easy to add.",
              imagePrompt: "Two 1/4 pizza slices being combined to make 1/2"
            },
            {
              title: "Practice with Fractions",
              content: "Let's practice! If I have 3/4 of a pizza and eat 1/4, how much is left? 3/4 - 1/4 = 2/4 = 1/2.",
              imagePrompt: "A 3/4 pizza with 1/4 being removed, showing 2/4 remaining"
            }
          ],
          script: "Let's learn about fractions! A fraction shows parts of a whole. Look at this pizza - it's one whole pizza, which we write as 1/1. Now I'm cutting it in half. Each piece is 1/2 - that means 1 out of 2 pieces. The 2 at the bottom tells us there are 2 total pieces, and the 1 at the top tells us we have 1 piece. Now I'm cutting the pizza into 4 equal pieces. Each piece is 1/4 - that's 1 out of 4 pieces. Now I'm cutting it into 8 equal pieces. Each piece is 1/8 - that's 1 out of 8 pieces. Notice that 1/2 is bigger than 1/4, and 1/4 is bigger than 1/8. The bigger the bottom number, the smaller each piece becomes. When we add 1/4 + 1/4, we get 2/4, which is the same as 1/2. Fractions with the same bottom number are easy to add. Let's practice! If I have 3/4 of a pizza and eat 1/4, how much is left? 3/4 - 1/4 = 2/4 = 1/2. That's how fractions work!"
        };
      } else {
        // Normal length (3 slides)
        baseContent = {
          title: "🍕 Learning Fractions",
          slides: [
            {
              title: "What is a Fraction?",
              content: "A fraction shows parts of a whole. Look at this pizza - it's one whole pizza. When we cut it into equal pieces, each piece is a fraction.",
              imagePrompt: "A whole pizza with the number 1/1 written next to it"
            },
            {
              title: "Cutting in Half",
              content: "Now I'm cutting the pizza in half. Each piece is 1/2. The 2 means 2 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut in half with one slice highlighted and labeled '1/2'"
            },
            {
              title: "Cutting in Quarters",
              content: "Now I'm cutting it into 4 equal pieces. Each piece is 1/4. The 4 means 4 total pieces, the 1 means we have 1 piece.",
              imagePrompt: "A pizza cut into 4 quarters with one slice highlighted and labeled '1/4'"
            }
          ],
          script: "Let's learn about fractions! A fraction shows parts of a whole. Look at this pizza - it's one whole pizza, which we write as 1/1. Now I'm cutting it in half. Each piece is 1/2 - that means 1 out of 2 pieces. The 2 at the bottom tells us there are 2 total pieces, and the 1 at the top tells us we have 1 piece. Now I'm cutting the pizza into 4 equal pieces. Each piece is 1/4 - that's 1 out of 4 pieces. Notice that 1/2 is bigger than 1/4 because half a pizza is bigger than a quarter of a pizza. That's how fractions work!"
        };
      }
      
      // Apply custom instructions if provided
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('alphabet') || topicId === 'topic-1') {
      const baseContent = {
        title: "🔤 Learning the Alphabet",
        slides: [
          {
            title: "Letter A",
            content: "This is the letter A. A says 'ah' like in apple. Let's trace the letter A together.",
            imagePrompt: "Large letter A with an apple next to it"
          },
          {
            title: "Letter B",
            content: "This is the letter B. B says 'buh' like in ball. Let's trace the letter B together.",
            imagePrompt: "Large letter B with a ball next to it"
          },
          {
            title: "Letter C",
            content: "This is the letter C. C says 'kuh' like in cat. Let's trace the letter C together.",
            imagePrompt: "Large letter C with a cat next to it"
          }
        ],
        script: "Let's learn the alphabet! This is the letter A. A says 'ah' like in apple. Let's trace the letter A together - start at the top, go down, then across. This is the letter B. B says 'buh' like in ball. Let's trace the letter B together - start at the top, go down, then make two bumps. This is the letter C. C says 'kuh' like in cat. Let's trace the letter C together - start at the top and make a curve."
      };
      
      // Apply custom instructions if provided
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('counting') || topicId === 'topic-2') {
      const baseContent = {
        title: "🔢 Learning to Count",
        slides: [
          {
            title: "Number 1",
            content: "This is the number 1. Let's count 1 apple. One apple.",
            imagePrompt: "Large number 1 with one apple next to it"
          },
          {
            title: "Number 2",
            content: "This is the number 2. Let's count 2 apples. One, two apples.",
            imagePrompt: "Large number 2 with two apples next to it"
          },
          {
            title: "Number 3",
            content: "This is the number 3. Let's count 3 apples. One, two, three apples.",
            imagePrompt: "Large number 3 with three apples next to it"
          }
        ],
        script: "Let's learn to count! This is the number 1. Let's count 1 apple. One apple. This is the number 2. Let's count 2 apples. One, two apples. This is the number 3. Let's count 3 apples. One, two, three apples. Great job counting!"
      };
      
      // Apply custom instructions if provided
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('solar system') || topicId === 'topic-3') {
      const baseContent = {
        title: "🌍 Our Solar System",
        slides: [
          {
            title: "The Sun",
            content: "This is the Sun. The Sun is a star. It gives us light and heat. All the planets orbit around the Sun.",
            imagePrompt: "The Sun in the center with rays of light coming out"
          },
          {
            title: "Planet Earth",
            content: "This is Earth, our planet. Earth is where we live. It has land and water. Earth orbits around the Sun.",
            imagePrompt: "Planet Earth showing blue oceans and green land"
          },
          {
            title: "The Moon",
            content: "This is the Moon. The Moon orbits around Earth. It changes shape each night. Sometimes it's full, sometimes it's a crescent.",
            imagePrompt: "The Moon in different phases - full moon and crescent moon"
          }
        ],
        script: "Let's explore our solar system! This is the Sun. The Sun is a star that gives us light and heat. All the planets orbit around the Sun. This is Earth, our planet. Earth is where we live. It has land and water. Earth orbits around the Sun. This is the Moon. The Moon orbits around Earth. It changes shape each night. Sometimes it's full, sometimes it's a crescent."
      };
      
      // Apply custom instructions if provided
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('fraction') || topicId === 'topic-4') {
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      if (lessonLength === 'short') {
        baseContent = {
          title: "🍕 Learning Fractions with Pizza",
          slides: [
            {
              title: "Whole Pizza",
              content: "This is a whole pizza! When we have the entire pizza, we say we have 1 whole pizza.",
              imagePrompt: "A complete round pizza showing it as one whole"
            },
            {
              title: "Half Pizza",
              content: "When we cut the pizza in half, we get 2 equal pieces. Each piece is one half of the pizza!",
              imagePrompt: "A pizza cut in half showing two equal pieces"
            }
          ],
          script: "Let's learn about fractions with pizza! This is a whole pizza. When we have the entire pizza, we say we have 1 whole pizza. When we cut the pizza in half, we get 2 equal pieces. Each piece is one half of the pizza!"
        };
      } else {
        baseContent = {
          title: "🍕 Learning Fractions with Pizza",
          slides: [
            {
              title: "Whole Pizza",
              content: "This is a whole pizza! When we have the entire pizza, we say we have 1 whole pizza.",
              imagePrompt: "A complete round pizza showing it as one whole"
            },
            {
              title: "Half Pizza",
              content: "When we cut the pizza in half, we get 2 equal pieces. Each piece is one half of the pizza!",
              imagePrompt: "A pizza cut in half showing two equal pieces"
            },
            {
              title: "Quarter Pizza",
              content: "When we cut the pizza into 4 equal pieces, each piece is one quarter of the pizza!",
              imagePrompt: "A pizza cut into 4 equal quarters"
            }
          ],
          script: "Let's learn about fractions with pizza! This is a whole pizza. When we have the entire pizza, we say we have 1 whole pizza. When we cut the pizza in half, we get 2 equal pieces. Each piece is one half of the pizza! When we cut the pizza into 4 equal pieces, each piece is one quarter of the pizza!"
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('shape') || topicId === 'topic-5') {
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      if (lessonLength === 'short') {
        baseContent = {
          title: "🔷 Learning Shapes",
          slides: [
            {
              title: "Circle",
              content: "This is a circle. A circle is round like a ball. It has no corners or edges.",
              imagePrompt: "A large circle with the word 'Circle' written below it"
            },
            {
              title: "Square",
              content: "This is a square. A square has 4 equal sides and 4 corners. It looks like a box.",
              imagePrompt: "A large square with the word 'Square' written below it"
            }
          ],
          script: "Let's learn about shapes! This is a circle. A circle is round like a ball. It has no corners or edges. This is a square. A square has 4 equal sides and 4 corners. It looks like a box."
        };
      } else {
        baseContent = {
          title: "🔷 Learning Shapes",
          slides: [
            {
              title: "Circle",
              content: "This is a circle. A circle is round like a ball. It has no corners or edges.",
              imagePrompt: "A large circle with the word 'Circle' written below it"
            },
            {
              title: "Square",
              content: "This is a square. A square has 4 equal sides and 4 corners. It looks like a box.",
              imagePrompt: "A large square with the word 'Square' written below it"
            },
            {
              title: "Triangle",
              content: "This is a triangle. A triangle has 3 sides and 3 corners. It looks like a slice of pizza.",
              imagePrompt: "A large triangle with the word 'Triangle' written below it"
            }
          ],
          script: "Let's learn about shapes! This is a circle. A circle is round like a ball. It has no corners or edges. This is a square. A square has 4 equal sides and 4 corners. It looks like a box. This is a triangle. A triangle has 3 sides and 3 corners. It looks like a slice of pizza."
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('weather') || topicId === 'topic-6') {
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      if (lessonLength === 'short') {
        baseContent = {
          title: "🌤️ Learning About Weather",
          slides: [
            {
              title: "Sunny Day",
              content: "This is a sunny day. The sun is shining bright and it's warm outside. Perfect for playing!",
              imagePrompt: "A bright sun with rays in a blue sky"
            },
            {
              title: "Rainy Day",
              content: "This is a rainy day. Rain falls from the clouds and helps plants grow. Don't forget your umbrella!",
              imagePrompt: "Clouds with rain falling down"
            }
          ],
          script: "Let's learn about weather! This is a sunny day. The sun is shining bright and it's warm outside. Perfect for playing! This is a rainy day. Rain falls from the clouds and helps plants grow. Don't forget your umbrella!"
        };
      } else {
        baseContent = {
          title: "🌤️ Learning About Weather",
          slides: [
            {
              title: "Sunny Day",
              content: "This is a sunny day. The sun is shining bright and it's warm outside. Perfect for playing!",
              imagePrompt: "A bright sun with rays in a blue sky"
            },
            {
              title: "Rainy Day",
              content: "This is a rainy day. Rain falls from the clouds and helps plants grow. Don't forget your umbrella!",
              imagePrompt: "Clouds with rain falling down"
            },
            {
              title: "Snowy Day",
              content: "This is a snowy day. Snow falls from the sky and covers everything in white. Time to build a snowman!",
              imagePrompt: "Snowflakes falling with snow on the ground"
            }
          ],
          script: "Let's learn about weather! This is a sunny day. The sun is shining bright and it's warm outside. Perfect for playing! This is a rainy day. Rain falls from the clouds and helps plants grow. Don't forget your umbrella! This is a snowy day. Snow falls from the sky and covers everything in white. Time to build a snowman!"
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('animal') || topicId === 'topic-7') {
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      if (lessonLength === 'short') {
        baseContent = {
          title: "🐾 Learning About Animals",
          slides: [
            {
              title: "Farm Animals",
              content: "These are farm animals. Cows say 'moo', pigs say 'oink', and chickens say 'cluck cluck'!",
              imagePrompt: "A farm scene with a cow, pig, and chicken"
            },
            {
              title: "Wild Animals",
              content: "These are wild animals. Lions roar, elephants trumpet, and monkeys chatter in the jungle!",
              imagePrompt: "A jungle scene with a lion, elephant, and monkey"
            }
          ],
          script: "Let's learn about animals! These are farm animals. Cows say 'moo', pigs say 'oink', and chickens say 'cluck cluck'! These are wild animals. Lions roar, elephants trumpet, and monkeys chatter in the jungle!"
        };
      } else {
        baseContent = {
          title: "🐾 Learning About Animals",
          slides: [
            {
              title: "Farm Animals",
              content: "These are farm animals. Cows say 'moo', pigs say 'oink', and chickens say 'cluck cluck'!",
              imagePrompt: "A farm scene with a cow, pig, and chicken"
            },
            {
              title: "Wild Animals",
              content: "These are wild animals. Lions roar, elephants trumpet, and monkeys chatter in the jungle!",
              imagePrompt: "A jungle scene with a lion, elephant, and monkey"
            },
            {
              title: "Ocean Animals",
              content: "These are ocean animals. Fish swim, whales sing, and dolphins jump and play!",
              imagePrompt: "An ocean scene with fish, a whale, and dolphins"
            }
          ],
          script: "Let's learn about animals! These are farm animals. Cows say 'moo', pigs say 'oink', and chickens say 'cluck cluck'! These are wild animals. Lions roar, elephants trumpet, and monkeys chatter in the jungle! These are ocean animals. Fish swim, whales sing, and dolphins jump and play!"
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('time') || topicId === 'topic-8') {
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      if (lessonLength === 'short') {
        baseContent = {
          title: "⏰ Learning About Time",
          slides: [
            {
              title: "Clock Face",
              content: "This is a clock. It has numbers 1 through 12 and two hands - a short hand and a long hand.",
              imagePrompt: "A simple clock face showing 12 numbers and two hands"
            },
            {
              title: "Telling Time",
              content: "The short hand points to the hour. The long hand points to the minutes. What time is it?",
              imagePrompt: "A clock showing 3 o'clock with the short hand on 3 and long hand on 12"
            }
          ],
          script: "Let's learn about time! This is a clock. It has numbers 1 through 12 and two hands - a short hand and a long hand. The short hand points to the hour. The long hand points to the minutes. What time is it?"
        };
      } else {
        baseContent = {
          title: "⏰ Learning About Time",
          slides: [
            {
              title: "Clock Face",
              content: "This is a clock. It has numbers 1 through 12 and two hands - a short hand and a long hand.",
              imagePrompt: "A simple clock face showing 12 numbers and two hands"
            },
            {
              title: "Telling Time",
              content: "The short hand points to the hour. The long hand points to the minutes. What time is it?",
              imagePrompt: "A clock showing 3 o'clock with the short hand on 3 and long hand on 12"
            },
            {
              title: "Different Times",
              content: "We wake up in the morning, eat lunch at noon, and go to bed at night. Time helps us plan our day!",
              imagePrompt: "Three clocks showing morning, noon, and night times"
            }
          ],
          script: "Let's learn about time! This is a clock. It has numbers 1 through 12 and two hands - a short hand and a long hand. The short hand points to the hour. The long hand points to the minutes. What time is it? We wake up in the morning, eat lunch at noon, and go to bed at night. Time helps us plan our day!"
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('money') || topicId === 'topic-9') {
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      if (lessonLength === 'short') {
        baseContent = {
          title: "💰 Learning About Money",
          slides: [
            {
              title: "Coins",
              content: "These are coins. Pennies are worth 1 cent, nickels are worth 5 cents, and dimes are worth 10 cents.",
              imagePrompt: "Different coins - penny, nickel, and dime with their values"
            },
            {
              title: "Dollar Bills",
              content: "These are dollar bills. A one dollar bill is worth 100 cents. We use money to buy things we need.",
              imagePrompt: "A one dollar bill and a five dollar bill"
            }
          ],
          script: "Let's learn about money! These are coins. Pennies are worth 1 cent, nickels are worth 5 cents, and dimes are worth 10 cents. These are dollar bills. A one dollar bill is worth 100 cents. We use money to buy things we need."
        };
      } else {
        baseContent = {
          title: "💰 Learning About Money",
          slides: [
            {
              title: "Coins",
              content: "These are coins. Pennies are worth 1 cent, nickels are worth 5 cents, and dimes are worth 10 cents.",
              imagePrompt: "Different coins - penny, nickel, and dime with their values"
            },
            {
              title: "Dollar Bills",
              content: "These are dollar bills. A one dollar bill is worth 100 cents. We use money to buy things we need.",
              imagePrompt: "A one dollar bill and a five dollar bill"
            },
            {
              title: "Counting Money",
              content: "We can count money by adding up the value of coins and bills. 5 pennies plus 1 nickel equals 10 cents!",
              imagePrompt: "5 pennies and 1 nickel showing they equal 10 cents"
            }
          ],
          script: "Let's learn about money! These are coins. Pennies are worth 1 cent, nickels are worth 5 cents, and dimes are worth 10 cents. These are dollar bills. A one dollar bill is worth 100 cents. We use money to buy things we need. We can count money by adding up the value of coins and bills. 5 pennies plus 1 nickel equals 10 cents!"
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      // Add voice instructions to baseContent
      baseContent.voiceInstructions = this.extractVoiceInstructions(customPrompt);
      return baseContent;
    } else if (topicLower.includes('custom') || customPrompt.toLowerCase().includes(topic.toLowerCase())) {
      // Handle custom topics - extract the actual topic from the custom prompt
      const customTopicName = customPrompt.split(' - ')[0] || topic;
      const lessonLength = getLessonLength(customPrompt);
      let baseContent;
      
      if (lessonLength === 'short') {
        baseContent = {
          title: `🎓 Learning About ${customTopicName}`,
          slides: [
            {
              title: `What is ${customTopicName}?`,
              content: `Let's learn about ${customTopicName}! This is a fascinating topic that we'll explore together.`,
              imagePrompt: `Educational illustration about ${customTopicName}, colorful and engaging for children`
            },
            {
              title: `Key Concepts of ${customTopicName}`,
              content: `Here are the main ideas about ${customTopicName} that will help us understand it better.`,
              imagePrompt: `Visual breakdown of key concepts related to ${customTopicName}`
            }
          ],
          script: `Let's learn about ${customTopicName}! This is a fascinating topic that we'll explore together. Here are the main ideas about ${customTopicName} that will help us understand it better.`
        };
      } else {
        baseContent = {
          title: `🎓 Learning About ${customTopicName}`,
          slides: [
            {
              title: `Introduction to ${customTopicName}`,
              content: `Welcome to our lesson about ${customTopicName}! This is an exciting topic that we'll explore together.`,
              imagePrompt: `Educational illustration about ${customTopicName}, colorful and engaging for children`
            },
            {
              title: `What is ${customTopicName}?`,
              content: `${customTopicName} is a fascinating subject that we encounter in our daily lives. Let's discover what makes it special and important!`,
              imagePrompt: `Clear visual explanation of ${customTopicName} with examples and illustrations`
            },
            {
              title: `Key Concepts`,
              content: `Let's explore the main ideas and concepts that help us understand ${customTopicName} better. Each concept builds our knowledge step by step!`,
              imagePrompt: `Visual breakdown of key concepts related to ${customTopicName}`
            }
          ],
          script: `Welcome to our lesson about ${customTopicName}! This is an exciting topic that we'll explore together. ${customTopicName} is a fascinating subject that we encounter in our daily lives. Let's discover what makes it special and important! Let's explore the main ideas and concepts that help us understand ${customTopicName} better. Each concept builds our knowledge step by step!`
        };
      }
      
      if (hasCustomRequirements) {
        baseContent.title = integrateCustomInstructions(baseContent.title, customPrompt, 'title');
        baseContent.slides = baseContent.slides.map(slide => ({
          ...slide,
          content: integrateCustomInstructions(slide.content, customPrompt, 'content'),
          imagePrompt: integrateCustomInstructions(slide.imagePrompt, customPrompt, 'image')
        }));
        baseContent.script = convertFractionsToWords(integrateCustomInstructions(baseContent.script, customPrompt, 'script'));
      }
      
      return baseContent;
    } else {
      // Generic fallback for other topics
          return {
        title: `🎓 Learning About ${topic}`,
            slides: [
              {
            title: `Welcome to ${topic}!`,
            content: `Hello there! Today we're going to explore the amazing world of ${topic}. Get ready for an exciting learning adventure!`,
            imagePrompt: `Educational illustration about ${topic}, colorful and engaging for children`
              },
              {
                title: `What is ${topic}?`,
            content: `${topic} is a fascinating subject that we encounter in our daily lives. Let's discover what makes it special and important!`,
            imagePrompt: `Clear visual explanation of ${topic} with examples and illustrations`
          },
          {
            title: `Key Concepts`,
            content: `Let's explore the main ideas and concepts that help us understand ${topic} better. Each concept builds our knowledge step by step!`,
            imagePrompt: `Visual breakdown of key concepts related to ${topic}`
          },
          {
            title: `Real World Examples`,
            content: `Here are some examples from real life that show how ${topic} works in the world around us. Can you think of other examples?`,
            imagePrompt: `Real-world examples and applications of ${topic} in everyday life`
          },
          {
            title: `Why It Matters`,
            content: `Understanding ${topic} helps us in many ways! It makes us smarter and helps us solve problems in our daily lives.`,
            imagePrompt: `Illustration showing the importance and benefits of learning about ${topic}`
          },
          {
            title: `You Did It!`,
            content: `Congratulations! You've learned about ${topic} and are now ready to use this knowledge in your everyday life. Keep learning and exploring!`,
            imagePrompt: `Celebration scene with children learning about ${topic}`
          }
        ],
        script: `Welcome to our exciting lesson about ${topic}! Today we'll explore what ${topic} is, learn about its key concepts, see real-world examples, and understand why it's important. By the end of our journey, you'll have a great understanding of ${topic} and how it applies to your life. Let's start learning!`
          };
    }
  }

  async generateImage(prompt) {
    try {
      // Try to use Gemini for actual image generation
      try {
        console.log('Attempting Gemini image generation for:', prompt);
        
        // Try using the regular Gemini model for image generation
        const imageResponse = await this.model.generateContent([
          `Create a detailed description for an educational image: ${prompt}. 
          
          The image should be:
          - Colorful and engaging for children
          - Visually clear and educational
          - Show concrete examples and visual representations
          - Suitable for learning and teaching
          - High quality and professional looking
          
          Provide a very detailed description that could be used to create this image.`
        ]);
        
        if (imageResponse.response && imageResponse.response.candidates && imageResponse.response.candidates[0]) {
          const candidate = imageResponse.response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            // Look for text description from Gemini
            for (const part of candidate.content.parts) {
              if (part.text) {
                console.log('✅ Gemini generated detailed image description!');
                console.log('Description:', part.text);
                const svg = this.createEducationalSVGFromDescription(prompt, part.text);
                console.log('Using enhanced SVG with Gemini description for image:', prompt);
                return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
              }
            }
          }
        }
      } catch (geminiError) {
        console.log('Gemini image generation failed, using enhanced SVG...');
        console.error('Gemini error:', geminiError.message);
      }

      // Enhanced SVG fallback with topic-specific content
      const svg = this.createEducationalSVG(prompt);
      console.log('Using enhanced SVG for image:', prompt);
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    } catch (error) {
      console.error('Image generation error:', error);
      // Return a simple fallback
      return `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#667eea"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
            Educational Content
          </text>
        </svg>
      `).toString('base64')}`;
    }
  }

  createEducationalSVGFromDescription(prompt, description) {
    // Create SVG based on Gemini's detailed description
    const promptLower = prompt.toLowerCase();
    
    // Extract key elements from the description
    const hasPizza = description.toLowerCase().includes('pizza') || promptLower.includes('pizza');
    const hasFractions = description.toLowerCase().includes('fraction') || promptLower.includes('fraction');
    const hasHalf = description.toLowerCase().includes('half') || promptLower.includes('half') || promptLower.includes('1/2');
    const hasQuarter = description.toLowerCase().includes('quarter') || promptLower.includes('quarter') || promptLower.includes('1/4');
    const hasEighth = description.toLowerCase().includes('eighth') || promptLower.includes('eighth') || promptLower.includes('1/8');
    
    if (hasPizza && hasFractions) {
      return this.createPizzaFractionSVG(prompt);
    } else if (promptLower.includes('alphabet') || promptLower.includes('letter')) {
      return this.createAlphabetSVG(prompt);
    } else if (promptLower.includes('counting') || promptLower.includes('number')) {
      return this.createCountingSVG(prompt);
    } else if (promptLower.includes('solar system') || promptLower.includes('sun') || promptLower.includes('earth') || promptLower.includes('moon')) {
      return this.createSolarSystemSVG(prompt);
    } else if (promptLower.includes('shape') || promptLower.includes('circle') || promptLower.includes('square') || promptLower.includes('triangle')) {
      return this.createShapesSVG(prompt);
    } else if (promptLower.includes('weather') || promptLower.includes('rain') || promptLower.includes('sunny') || promptLower.includes('cloud')) {
      return this.createWeatherSVG(prompt);
    } else if (promptLower.includes('animal') || promptLower.includes('dog') || promptLower.includes('cat') || promptLower.includes('bird')) {
      return this.createAnimalsSVG(prompt);
    } else if (promptLower.includes('time') || promptLower.includes('clock') || promptLower.includes('hour') || promptLower.includes('minute')) {
      return this.createTimeSVG(prompt);
    } else if (promptLower.includes('money') || promptLower.includes('coin') || promptLower.includes('dollar') || promptLower.includes('cent')) {
      return this.createMoneySVG(prompt);
    } else if (promptLower.includes('math') || promptLower.includes('number')) {
      return this.createMathSVG(prompt);
    } else if (promptLower.includes('science') || promptLower.includes('experiment')) {
      return this.createScienceSVG(prompt);
    } else {
      return this.createGenericEducationalSVG(prompt);
    }
  }

  createEducationalSVG(prompt) {
    // Create topic-specific educational SVG based on the prompt
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('fraction') || promptLower.includes('pizza')) {
      return this.createPizzaFractionSVG(prompt);
    } else if (promptLower.includes('alphabet') || promptLower.includes('letter')) {
      return this.createAlphabetSVG(prompt);
    } else if (promptLower.includes('counting') || promptLower.includes('number')) {
      return this.createCountingSVG(prompt);
    } else if (promptLower.includes('solar system') || promptLower.includes('sun') || promptLower.includes('earth') || promptLower.includes('moon')) {
      return this.createSolarSystemSVG(prompt);
    } else {
      return this.createGenericEducationalSVG(prompt);
    }
  }

  createPizzaFractionSVG(prompt) {
    const promptLower = prompt.toLowerCase();
    const isHalf = promptLower.includes('half') || promptLower.includes('1/2');
    const isQuarter = promptLower.includes('quarter') || promptLower.includes('1/4');
    const isEighth = promptLower.includes('eighth') || promptLower.includes('1/8');
    const isCompare = promptLower.includes('compare');
    const isWhole = promptLower.includes('whole') || promptLower.includes('1/1');
    
    let pizzaSlices = '';
    let fractionLabel = '';
    let highlightSlice = '';
    
    if (isWhole) {
      pizzaSlices = '<circle cx="512" cy="512" r="300" fill="#ffd93d" stroke="#ff6b6b" stroke-width="8"/>';
      fractionLabel = '1/1';
    } else if (isHalf) {
      pizzaSlices = '<path d="M512,200 L512,824 M200,512 L824,512" stroke="#ff6b6b" stroke-width="8" fill="none"/>';
      fractionLabel = '1/2';
      highlightSlice = '<path d="M200,200 L824,200 L824,512 L200,512 Z" fill="#ff6b6b" opacity="0.3"/>';
    } else if (isQuarter) {
      pizzaSlices = '<path d="M512,200 L512,824 M200,512 L824,512 M200,200 L824,824 M824,200 L200,824" stroke="#ff6b6b" stroke-width="6" fill="none"/>';
      fractionLabel = '1/4';
      highlightSlice = '<path d="M200,200 L512,200 L512,512 L200,512 Z" fill="#ff6b6b" opacity="0.3"/>';
    } else if (isEighth) {
      pizzaSlices = '<path d="M512,200 L512,824 M200,512 L824,512 M200,200 L824,824 M824,200 L200,824 M512,200 L200,512 M512,200 L824,512 M512,824 L200,512 M512,824 L824,512" stroke="#ff6b6b" stroke-width="4" fill="none"/>';
      fractionLabel = '1/8';
      highlightSlice = '<path d="M200,200 L512,200 L512,356 L200,356 Z" fill="#ff6b6b" opacity="0.3"/>';
    } else if (isCompare) {
      // Show two pizzas for comparison
      return `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <!-- Left pizza - half -->
          <circle cx="300" cy="400" r="200" fill="#ffd93d" stroke="#ff6b6b" stroke-width="6"/>
          <path d="M300,200 L300,600 M200,400 L400,400" stroke="#ff6b6b" stroke-width="6" fill="none"/>
          <path d="M200,200 L400,200 L400,400 L200,400 Z" fill="#ff6b6b" opacity="0.3"/>
          <text x="300" y="150" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold">1/2</text>
          
          <!-- Right pizza - quarter -->
          <circle cx="724" cy="400" r="200" fill="#ffd93d" stroke="#ff6b6b" stroke-width="6"/>
          <path d="M724,200 L724,600 M624,400 L824,400 M624,200 L824,600 M824,200 L624,600" stroke="#ff6b6b" stroke-width="4" fill="none"/>
          <path d="M624,200 L724,200 L724,400 L624,400 Z" fill="#ff6b6b" opacity="0.3"/>
          <text x="724" y="150" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold">1/4</text>
          
          <!-- Comparison arrow -->
          <path d="M550,400 L650,400" stroke="white" stroke-width="8" fill="none" marker-end="url(#arrowhead)"/>
          <text x="600" y="380" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">1/2 > 1/4</text>
        </svg>
      `;
    } else {
      pizzaSlices = '<circle cx="512" cy="512" r="300" fill="#ffd93d" stroke="#ff6b6b" stroke-width="8"/>';
      fractionLabel = '🍕';
    }
    
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="white"/>
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="512" cy="512" r="300" fill="#ffd93d" stroke="#ff6b6b" stroke-width="8"/>
        ${pizzaSlices}
        ${highlightSlice}
        <circle cx="400" cy="400" r="12" fill="#ff6b6b"/>
        <circle cx="624" cy="400" r="12" fill="#ff6b6b"/>
        <circle cx="400" cy="624" r="12" fill="#ff6b6b"/>
        <circle cx="624" cy="624" r="12" fill="#ff6b6b"/>
        <circle cx="512" cy="512" r="12" fill="#ff6b6b"/>
        <text x="512" y="200" font-family="Arial, sans-serif" font-size="72" fill="white" text-anchor="middle" font-weight="bold">
          ${fractionLabel}
        </text>
        <text x="512" y="850" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">
          Pizza Fractions
        </text>
      </svg>
    `;
  }

  createAlphabetSVG(prompt) {
    const promptLower = prompt.toLowerCase();
    let letter = 'A';
    let object = '🍎';
    
    if (promptLower.includes('letter a') || promptLower.includes('apple')) {
      letter = 'A';
      object = '🍎';
    } else if (promptLower.includes('letter b') || promptLower.includes('ball')) {
      letter = 'B';
      object = '⚽';
    } else if (promptLower.includes('letter c') || promptLower.includes('cat')) {
      letter = 'C';
      object = '🐱';
    }
    
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <text x="512" y="400" font-family="Arial, sans-serif" font-size="200" fill="white" text-anchor="middle" font-weight="bold">${letter}</text>
        <text x="512" y="600" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle">${object}</text>
        <text x="512" y="750" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle">
          Letter ${letter}
        </text>
      </svg>
    `;
  }

  createCountingSVG(prompt) {
    const promptLower = prompt.toLowerCase();
    let number = '1';
    let count = 1;
    
    if (promptLower.includes('number 1') || promptLower.includes('one')) {
      number = '1';
      count = 1;
    } else if (promptLower.includes('number 2') || promptLower.includes('two')) {
      number = '2';
      count = 2;
    } else if (promptLower.includes('number 3') || promptLower.includes('three')) {
      number = '3';
      count = 3;
    }
    
    let apples = '';
    for (let i = 0; i < count; i++) {
      const x = 300 + (i * 150);
      apples += `<text x="${x}" y="600" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">🍎</text>`;
    }
    
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <text x="512" y="400" font-family="Arial, sans-serif" font-size="200" fill="white" text-anchor="middle" font-weight="bold">${number}</text>
        ${apples}
        <text x="512" y="750" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle">
          Number ${number}
        </text>
      </svg>
    `;
  }

  createSolarSystemSVG(prompt) {
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('sun')) {
      return `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#000428;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#004e92;stop-opacity:1" />
            </linearGradient>
            <radialGradient id="sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#ffff00;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#ff8c00;stop-opacity:1" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <circle cx="512" cy="512" r="150" fill="url(#sun)"/>
          <path d="M362,512 L462,512 M562,512 L662,512 M512,362 L512,462 M512,562 L512,662" stroke="#ffff00" stroke-width="8" fill="none"/>
          <text x="512" y="750" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
            The Sun
          </text>
        </svg>
      `;
    } else if (promptLower.includes('earth')) {
      return `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#000428;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#004e92;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <circle cx="512" cy="512" r="200" fill="#4a90e2"/>
          <path d="M312,400 Q512,350 712,400 Q512,450 312,400" fill="#228b22"/>
          <path d="M312,500 Q512,450 712,500 Q512,550 312,500" fill="#228b22"/>
          <text x="512" y="750" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
            Planet Earth
          </text>
        </svg>
      `;
    } else if (promptLower.includes('moon')) {
      return `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#000428;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#004e92;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <circle cx="400" cy="400" r="120" fill="#c0c0c0"/>
          <circle cx="450" cy="350" r="100" fill="#000428"/>
          <circle cx="600" cy="600" r="80" fill="#c0c0c0"/>
          <circle cx="650" cy="550" r="60" fill="#000428"/>
          <text x="512" y="750" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
            The Moon
          </text>
        </svg>
      `;
    }
    
    return this.createGenericEducationalSVG(prompt);
  }


  createMathSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <text x="512" y="300" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle" font-weight="bold">1</text>
        <text x="512" y="450" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">+</text>
        <text x="512" y="600" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle" font-weight="bold">2</text>
        <text x="512" y="750" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">=</text>
        <text x="512" y="900" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle" font-weight="bold">3</text>
      </svg>
    `;
  }

  createScienceSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="512" cy="400" r="80" fill="#ff6b6b"/>
        <circle cx="400" cy="600" r="60" fill="#4facfe"/>
        <circle cx="624" cy="600" r="60" fill="#6bcf7f"/>
        <text x="512" y="800" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">
          Science Discovery
        </text>
      </svg>
    `;
  }

  createGenericEducationalSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="512" cy="400" r="100" fill="white" opacity="0.3"/>
        <text x="512" y="500" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">
          📚
        </text>
        <text x="512" y="700" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">
          Educational Content
        </text>
        <text x="512" y="750" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle">
          ${prompt.substring(0, 50)}...
        </text>
      </svg>
    `;
  }

  createShapesSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <!-- Circle -->
        <circle cx="200" cy="300" r="80" fill="#ffd93d" stroke="white" stroke-width="4"/>
        <text x="200" y="420" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">Circle</text>
        <!-- Square -->
        <rect x="400" y="220" width="160" height="160" fill="#6bcf7f" stroke="white" stroke-width="4"/>
        <text x="480" y="420" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">Square</text>
        <!-- Triangle -->
        <path d="M600,220 L680,380 L520,380 Z" fill="#ff8a80" stroke="white" stroke-width="4"/>
        <text x="600" y="420" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">Triangle</text>
        <!-- Rectangle -->
        <rect x="200" y="500" width="200" height="120" fill="#a8e6cf" stroke="white" stroke-width="4"/>
        <text x="300" y="700" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">Rectangle</text>
        <!-- Star -->
        <path d="M500,500 L520,560 L580,560 L530,590 L550,650 L500,620 L450,650 L470,590 L420,560 L480,560 Z" fill="#ffd93d" stroke="white" stroke-width="4"/>
        <text x="500" y="700" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">Star</text>
        <text x="512" y="800" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
          Learning Shapes!
        </text>
      </svg>
    `;
  }

  createWeatherSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#87ceeb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#98d8e8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <!-- Sun -->
        <circle cx="200" cy="200" r="60" fill="#ffd700"/>
        <line x1="200" y1="100" x2="200" y2="80" stroke="#ffd700" stroke-width="4"/>
        <line x1="200" y1="320" x2="200" y2="340" stroke="#ffd700" stroke-width="4"/>
        <line x1="100" y1="200" x2="80" y2="200" stroke="#ffd700" stroke-width="4"/>
        <line x1="320" y1="200" x2="340" y2="200" stroke="#ffd700" stroke-width="4"/>
        <text x="200" y="300" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">Sunny</text>
        <!-- Cloud -->
        <ellipse cx="500" cy="200" rx="80" ry="40" fill="white"/>
        <ellipse cx="480" cy="180" rx="50" ry="30" fill="white"/>
        <ellipse cx="520" cy="180" rx="50" ry="30" fill="white"/>
        <text x="500" y="280" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">Cloudy</text>
        <!-- Rain -->
        <path d="M200,500 Q220,520 200,540 Q180,520 200,500" fill="#4a90e2" stroke="#4a90e2" stroke-width="2"/>
        <path d="M250,500 Q270,520 250,540 Q230,520 250,500" fill="#4a90e2" stroke="#4a90e2" stroke-width="2"/>
        <path d="M300,500 Q320,520 300,540 Q280,520 300,500" fill="#4a90e2" stroke="#4a90e2" stroke-width="2"/>
        <text x="250" y="580" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">Rainy</text>
        <!-- Snow -->
        <text x="500" y="500" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle">❄</text>
        <text x="500" y="520" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle">❄</text>
        <text x="500" y="540" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle">❄</text>
        <text x="500" y="580" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">Snowy</text>
        <text x="512" y="700" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
          Weather Types
        </text>
      </svg>
    `;
  }

  createAnimalsSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <!-- Dog -->
        <ellipse cx="200" cy="300" rx="60" ry="40" fill="#8b4513"/>
        <circle cx="180" cy="280" r="8" fill="black"/>
        <circle cx="220" cy="280" r="8" fill="black"/>
        <ellipse cx="200" cy="300" rx="15" ry="8" fill="black"/>
        <text x="200" y="380" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">🐕 Dog</text>
        <!-- Cat -->
        <ellipse cx="500" cy="300" rx="50" ry="35" fill="#ffa500"/>
        <circle cx="485" cy="285" r="6" fill="black"/>
        <circle cx="515" cy="285" r="6" fill="black"/>
        <ellipse cx="500" cy="300" rx="12" ry="6" fill="black"/>
        <text x="500" y="380" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">🐱 Cat</text>
        <!-- Bird -->
        <ellipse cx="800" cy="300" rx="40" ry="25" fill="#4169e1"/>
        <circle cx="790" cy="290" r="4" fill="black"/>
        <path d="M760,300 Q740,280 720,300" fill="orange" stroke="orange" stroke-width="3"/>
        <text x="800" y="380" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">🐦 Bird</text>
        <!-- Fish -->
        <ellipse cx="200" cy="600" rx="50" ry="30" fill="#ff69b4"/>
        <path d="M150,600 Q130,580 110,600 Q130,620 150,600" fill="#ff69b4"/>
        <circle cx="190" cy="590" r="3" fill="black"/>
        <text x="200" y="680" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">🐠 Fish</text>
        <!-- Elephant -->
        <ellipse cx="500" cy="600" rx="70" ry="45" fill="#c0c0c0"/>
        <path d="M430,600 Q410,580 390,600 Q410,620 430,600" fill="#c0c0c0"/>
        <circle cx="485" cy="585" r="4" fill="black"/>
        <text x="500" y="680" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">🐘 Elephant</text>
        <!-- Lion -->
        <ellipse cx="800" cy="600" rx="60" ry="40" fill="#daa520"/>
        <circle cx="785" cy="585" r="5" fill="black"/>
        <circle cx="815" cy="585" r="5" fill="black"/>
        <ellipse cx="800" cy="600" rx="15" ry="8" fill="black"/>
        <text x="800" y="680" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">🦁 Lion</text>
        <text x="512" y="800" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
          Amazing Animals!
        </text>
      </svg>
    `;
  }

  createTimeSVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <!-- Clock 1 - 3 o'clock -->
        <circle cx="200" cy="300" r="80" fill="white" stroke="#333" stroke-width="4"/>
        <line x1="200" y1="300" x2="200" y2="240" stroke="#333" stroke-width="6"/>
        <line x1="200" y1="300" x2="240" y2="300" stroke="#333" stroke-width="4"/>
        <text x="200" y="420" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">3:00</text>
        <!-- Clock 2 - 6 o'clock -->
        <circle cx="500" cy="300" r="80" fill="white" stroke="#333" stroke-width="4"/>
        <line x1="500" y1="300" x2="500" y2="360" stroke="#333" stroke-width="6"/>
        <line x1="500" y1="300" x2="500" y2="280" stroke="#333" stroke-width="4"/>
        <text x="500" y="420" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">6:00</text>
        <!-- Clock 3 - 9 o'clock -->
        <circle cx="800" cy="300" r="80" fill="white" stroke="#333" stroke-width="4"/>
        <line x1="800" y1="300" x2="800" y2="240" stroke="#333" stroke-width="6"/>
        <line x1="800" y1="300" x2="760" y2="300" stroke="#333" stroke-width="4"/>
        <text x="800" y="420" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">9:00</text>
        <!-- Clock 4 - 12 o'clock -->
        <circle cx="200" cy="600" r="80" fill="white" stroke="#333" stroke-width="4"/>
        <line x1="200" y1="600" x2="200" y2="540" stroke="#333" stroke-width="6"/>
        <line x1="200" y1="600" x2="200" y2="580" stroke="#333" stroke-width="4"/>
        <text x="200" y="720" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">12:00</text>
        <!-- Digital Clock -->
        <rect x="400" y="520" width="200" height="80" fill="#000" stroke="#333" stroke-width="4"/>
        <text x="500" y="570" font-family="Arial, sans-serif" font-size="36" fill="#00ff00" text-anchor="middle">2:30</text>
        <text x="500" y="720" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">Digital Time</text>
        <text x="512" y="800" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
          Learning Time!
        </text>
      </svg>
    `;
  }

  createMoneySVG(prompt) {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ffed4e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <!-- Penny -->
        <circle cx="200" cy="300" r="50" fill="#cd7f32" stroke="#8b4513" stroke-width="3"/>
        <text x="200" y="290" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">1¢</text>
        <text x="200" y="310" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">Penny</text>
        <text x="200" y="380" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">1 cent</text>
        <!-- Nickel -->
        <circle cx="400" cy="300" r="55" fill="#c0c0c0" stroke="#808080" stroke-width="3"/>
        <text x="400" y="290" font-family="Arial, sans-serif" font-size="24" fill="black" text-anchor="middle">5¢</text>
        <text x="400" y="310" font-family="Arial, sans-serif" font-size="16" fill="black" text-anchor="middle">Nickel</text>
        <text x="400" y="380" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">5 cents</text>
        <!-- Dime -->
        <circle cx="600" cy="300" r="45" fill="#c0c0c0" stroke="#808080" stroke-width="3"/>
        <text x="600" y="290" font-family="Arial, sans-serif" font-size="20" fill="black" text-anchor="middle">10¢</text>
        <text x="600" y="310" font-family="Arial, sans-serif" font-size="14" fill="black" text-anchor="middle">Dime</text>
        <text x="600" y="380" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">10 cents</text>
        <!-- Quarter -->
        <circle cx="800" cy="300" r="60" fill="#c0c0c0" stroke="#808080" stroke-width="3"/>
        <text x="800" y="290" font-family="Arial, sans-serif" font-size="24" fill="black" text-anchor="middle">25¢</text>
        <text x="800" y="310" font-family="Arial, sans-serif" font-size="16" fill="black" text-anchor="middle">Quarter</text>
        <text x="800" y="380" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">25 cents</text>
        <!-- Dollar Bill -->
        <rect x="300" y="500" width="120" height="60" fill="#90ee90" stroke="#228b22" stroke-width="2"/>
        <text x="360" y="520" font-family="Arial, sans-serif" font-size="20" fill="black" text-anchor="middle">$1</text>
        <text x="360" y="540" font-family="Arial, sans-serif" font-size="12" fill="black" text-anchor="middle">ONE DOLLAR</text>
        <text x="300" y="600" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">1 dollar = 100 cents</text>
        <!-- Five Dollar Bill -->
        <rect x="500" y="500" width="120" height="60" fill="#ffb6c1" stroke="#ff69b4" stroke-width="2"/>
        <text x="560" y="520" font-family="Arial, sans-serif" font-size="20" fill="black" text-anchor="middle">$5</text>
        <text x="560" y="540" font-family="Arial, sans-serif" font-size="12" fill="black" text-anchor="middle">FIVE DOLLARS</text>
        <text x="500" y="600" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">5 dollars = 500 cents</text>
        <text x="512" y="700" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
          Learning Money!
        </text>
      </svg>
    `;
  }

  extractKeywords(prompt) {
    // Extract pizza and fraction-related keywords for better image matching
    const keywords = [];
    if (prompt.toLowerCase().includes('pizza')) keywords.push('food');
    if (prompt.toLowerCase().includes('fraction')) keywords.push('math');
    if (prompt.toLowerCase().includes('half')) keywords.push('divide');
    if (prompt.toLowerCase().includes('quarter')) keywords.push('four');
    if (prompt.toLowerCase().includes('eighth')) keywords.push('eight');
    if (prompt.toLowerCase().includes('slice')) keywords.push('cut');
    if (prompt.toLowerCase().includes('compare')) keywords.push('side');
    if (prompt.toLowerCase().includes('real world')) keywords.push('everyday');
    if (prompt.toLowerCase().includes('expert')) keywords.push('success');
    
    return keywords.length > 0 ? keywords.join(',') : 'education';
  }
}
