import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Frontend → Backend contract (dev defaults with Vite proxy):
 * - POST `${API_PREFIX}/generate-video` with JSON { faceId, topicId, prompt }
 *     → returns { videoUrl } immediately (no polling required for placeholder backend)
 *
 * If your backend changes paths/fields, tweak ENDPOINTS + body in handleGenerate().
 */

const API_PREFIX = "/api"; // via Vite proxy → target http://127.0.0.1:8080

// Voice choices
const VOICES = [
  { id: "voice-1", title: "Teacher Ava", description: "Warm & Educational" },
  { id: "voice-2", title: "Coach Max", description: "Energetic & Motivational" },
  { id: "voice-3", title: "Scientist Joe", description: "Clear & Analytical" },
  { id: "voice-4", title: "Explorer Kai", description: "Adventurous & Curious" },
  { id: "voice-5", title: "Chef Mia", description: "Friendly & Engaging" },
];

// Educational topic choices
const TOPICS = [
  { id: "topic-1", title: "Alphabet" },
  { id: "topic-2", title: "Counting" },
  { id: "topic-3", title: "Solar System" },
  { id: "topic-4", title: "Fractions" },
  { id: "topic-5", title: "Shapes" },
  { id: "topic-6", title: "Weather" },
  { id: "topic-7", title: "Animals" },
  { id: "topic-8", title: "Time" },
  { id: "topic-9", title: "Money" },
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customTopic, setCustomTopic] = useState("");
  const [useCustomTopic, setUseCustomTopic] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [jobId, setJobId] = useState(""); // reserved for future async jobs
  const [status, setStatus] = useState("idle"); // idle | generating | ready | error | polling
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const pollingRef = useRef(null);

  const voiceTitle = useMemo(() => VOICES.find(v => v.id === selectedVoice)?.title || "", [selectedVoice]);
  const topicTitle = useMemo(() => {
    if (useCustomTopic && customTopic.trim()) {
      return customTopic.trim();
    }
    return TOPICS.find(t => t.id === selectedTopic)?.title || "";
  }, [selectedTopic, useCustomTopic, customTopic]);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };

  // If you later support async job polling, wire it here
  const pollJob = (id) => {
    setStatus("polling");
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_PREFIX}/jobs/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`Polling failed (${res.status})`);
        const data = await res.json();
        const { status: s, progress: p = 0, videoUrl: url = "", error: e = "" } = data || {};
        setStatus(s);
        setProgress(typeof p === 'number' ? Math.max(0, Math.min(100, p)) : 0);
        if (s === 'ready' && url) { stopPolling(); setVideoUrl(url); setJobId(""); }
        else if (s === 'failed') { stopPolling(); setError(e || 'The video generation failed.'); setJobId(""); }
      } catch (err) { stopPolling(); setStatus('error'); setError(err.message || 'Polling error'); }
    }, 1500);
  };

  const handleGenerate = async () => {
    setStatus("generating");
    setProgress(0);
    setError("");
    setVideoUrl("");
    setJobId("");

    if (!selectedVoice || (!selectedTopic && !useCustomTopic)) {
      setStatus("error");
      setError("Please select a voice and a topic.");
      return;
    }

    if (useCustomTopic && !customTopic.trim()) {
      setStatus("error");
      setError("Please enter a custom topic.");
      return;
    }

    try {
      const response = await fetch(`${API_PREFIX}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: selectedVoice,
          topicId: useCustomTopic ? 'custom' : selectedTopic,
          customTopic: useCustomTopic ? customTopic.trim() : undefined,
          prompt: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setStatus('ready');
      } else {
        throw new Error('No video URL returned');
      }
    } catch (error) {
      console.error('Error generating video:', error);
      setStatus('error');
      setError(error.message || 'Failed to generate video');
    }
  };




  const isBusy = status === 'generating' || status === 'polling';
  const readyToGenerate = !!selectedVoice && (!!selectedTopic || (useCustomTopic && customTopic.trim())) && !isBusy;

  return (
    <div className="App">
      <h1 style={{ 
        color: 'white',
        fontSize: '3.5rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        textShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        Learnie
      </h1>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.8)', 
        marginTop: 0, 
        fontSize: '1.2rem',
        fontWeight: '300'
      }}>
        Pick a voice and a topic, optionally add instructions, then generate.
      </p>

      {/* VOICE PICKER */}
      <section>
        <h3 style={{ 
          marginBottom: '1rem', 
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.3rem',
          fontWeight: '600'
        }}>
          Choose a Voice
        </h3>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {VOICES.map(voice => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              disabled={isBusy}
              className={`voice-button ${selectedVoice === voice.id ? 'selected' : ''}`}
              aria-pressed={selectedVoice === voice.id}
              title={voice.description}
            >
              <div style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{voice.title}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{voice.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* TOPIC PICKER */}
      <section>
        <h3 style={{ 
          marginBottom: '1rem', 
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.3rem',
          fontWeight: '600'
        }}>
          Choose a Topic
        </h3>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => {
                setSelectedTopic(topic.id);
                setUseCustomTopic(false);
              }}
              disabled={isBusy}
              className={`topic-button ${selectedTopic === topic.id && !useCustomTopic ? 'selected' : ''}`}
              aria-pressed={selectedTopic === topic.id && !useCustomTopic}
            >
              {topic.title}
            </button>
          ))}
        </div>
        
        {/* Custom Topic Input */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <input
              type="checkbox"
              id="useCustomTopic"
              checked={useCustomTopic}
              onChange={(e) => {
                setUseCustomTopic(e.target.checked);
                if (e.target.checked) {
                  setSelectedTopic(null);
                }
              }}
              disabled={isBusy}
              style={{ transform: 'scale(1.2)' }}
            />
            <label htmlFor="useCustomTopic" style={{ 
              color: 'white', 
              fontSize: '1rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              Use custom topic
            </label>
          </div>
          
          {useCustomTopic && (
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Enter your custom topic (e.g., Dinosaurs, Space Exploration, Cooking)"
              disabled={isBusy}
              className="custom-topic-input"
            />
          )}
        </div>
      </section>

      {/* PROMPT */}
      <section>
        <h3 style={{ 
          marginBottom: '1rem', 
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.3rem',
          fontWeight: '600'
        }}>
          Custom Instructions (Optional)
        </h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Add custom instructions (tone, reading level, examples, length, etc.)"
          rows={4}
          style={{ 
            width: '100%', 
            maxWidth: '720px',
            margin: '0 auto',
            display: 'block'
          }}
        />
      </section>


      {/* GENERATE BUTTON */}
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={handleGenerate}
          disabled={!readyToGenerate}
          className="generate-button"
        >
          {isBusy ? 'Generating…' : 'Generate Video'}
        </button>
      </div>

      {/* Status / Progress */}
      <div style={{ minHeight: '60px', marginTop: '1.5rem' }}>
        {status === 'generating' && (
          <div className="status-message">
            <em style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Submitting your request…</em>
          </div>
        )}
        {status === 'polling' && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <small style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              marginTop: '0.5rem',
              display: 'block'
            }}>
              Generating{progress ? ` — ${progress}%` : '…'}
            </small>
          </div>
        )}
        {status === 'ready' && (
          <div className="status-message success-message">
            <strong>Ready:</strong> {voiceTitle} — {topicTitle}
          </div>
        )}
        {status === 'error' && error && (
          <div className="status-message error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Video Player */}
      {videoUrl && (
        <div className="video-container">
          <iframe 
            src={videoUrl} 
            width="100%" 
            height="600"
            style={{ 
              maxWidth: '1200px',
              border: 'none',
              borderRadius: '15px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
            title="Educational Video"
          />
          <div style={{ marginTop: '1rem' }}>
            <p style={{ 
              fontSize: '1rem', 
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: '500'
            }}>
              Playing: {voiceTitle} — {topicTitle}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
