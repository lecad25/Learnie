// routes/generate.js (ESM)
import express from "express";
import { SimpleGeminiVideoGenerator } from "../services/simpleGeminiVideoGenerator.js";
import { ElevenLabsService } from "../services/elevenlabs.js";

const router = express.Router();
const videoGenerator = new SimpleGeminiVideoGenerator();
const elevenlabs = new ElevenLabsService();

// POST /generate
router.post("/", async (req, res) => {
  try {
    const { voiceId, topicId, customTopic, prompt } = req.body;
    
    console.log("Generate request:", { voiceId, topicId, customTopic, prompt });
    
    if (!voiceId || (!topicId && !customTopic)) {
      return res.status(400).json({
        success: false,
        error: "voiceId and topicId (or customTopic) are required"
      });
    }
    
    // Use custom topic if provided, otherwise use topicId
    const finalTopicId = customTopic ? 'custom' : topicId;
    const finalPrompt = customTopic ? `${customTopic} - ${prompt || ''}`.trim() : prompt;
    
    // Generate the video
    const videoUrl = await videoGenerator.generateVideo(voiceId, finalTopicId, finalPrompt);
    
    res.json({
      success: true,
      videoUrl: videoUrl,
      message: "Video generation completed"
    });
  } catch (error) {
    console.error("Video generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Video generation failed"
    });
  }
});

// GET /voices - Get available voices
router.get("/voices", async (req, res) => {
  try {
    const voices = await elevenlabs.getVoices();
    res.json({
      success: true,
      voices: voices
    });
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch voices"
    });
  }
});

export default router;