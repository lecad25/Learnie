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

// Five face choices (IDs must match what backend expects)
const FACES = [
  { id: "face-1", title: "Teacher Ava" },
  { id: "face-2", title: "Coach Max" },
  { id: "face-3", title: "Scientist Zoe" },
  { id: "face-4", title: "Explorer Kai" },
  { id: "face-5", title: "Chef Mia" },
];

// Five topic choices
const TOPICS = [
  { id: "topic-1", title: "Alphabet Adventure" },
  { id: "topic-2", title: "Counting with Critters" },
  { id: "topic-3", title: "Solar System Safari" },
  { id: "topic-4", title: "Fractions with Pizza" },
  { id: "topic-5", title: "Habitats & Animals" },
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [selectedFace, setSelectedFace] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [jobId, setJobId] = useState(""); // reserved for future async jobs
  const [status, setStatus] = useState("idle"); // idle | generating | ready | error | polling
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const pollingRef = useRef(null);

  const faceTitle = useMemo(() => FACES.find(f => f.id === selectedFace)?.title || "", [selectedFace]);
  const topicTitle = useMemo(() => TOPICS.find(t => t.id === selectedTopic)?.title || "", [selectedTopic]);

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

  const handleGenerate = () => {
    setStatus("generating");
    setProgress(0);
    setError("");
    setVideoUrl("");
    setJobId("");

    if (!selectedFace || !selectedTopic) {
      setStatus("error");
      setError("Please select a face and a topic.");
      return;
    }

    // Simulate loading for better UX
    setTimeout(() => {
      // Construct the video path based on selected face and topic
      // Videos are named like: face-1_topic-1.mp4, face-2_topic-3.mp4, etc.
      const videoPath = `/videos/${selectedFace}_${selectedTopic}.mp4`;
      setVideoUrl(videoPath);
      setStatus('ready');
    }, 1000);
  };




  const isBusy = status === 'generating' || status === 'polling';
  const readyToGenerate = !!selectedFace && !!selectedTopic && !isBusy;

  return (
    <div className="App" style={{ textAlign: "center", padding: "2rem", maxWidth: 980, margin: "0 auto" }}>
      <h1>Learnie</h1>
      <p style={{ color: '#555', marginTop: 0 }}>Pick a face and a topic, optionally add instructions, then generate.</p>

      {/* FACE PICKER */}
      <section style={{ margin: '1rem 0' }}>
        <h3 style={{ marginBottom: 8 }}>Choose a Face</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {FACES.map(face => (
            <button
              key={face.id}
              onClick={() => setSelectedFace(face.id)}
              disabled={isBusy}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: 10,
                border: selectedFace === face.id ? '2px solid #111' : '1px solid #ddd',
                background: selectedFace === face.id ? '#f3f4f6' : '#fff',
                color: '#000',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              aria-pressed={selectedFace === face.id}
            >
              {face.title}
            </button>
          ))}
        </div>
      </section>

      {/* TOPIC PICKER */}
      <section style={{ margin: '1rem 0' }}>
        <h3 style={{ marginBottom: 8 }}>Choose a Topic</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              disabled={isBusy}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: 10,
                border: selectedTopic === topic.id ? '2px solid #111' : '1px solid #ddd',
                background: selectedTopic === topic.id ? '#f3f4f6' : '#fff',
                color: '#000',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              aria-pressed={selectedTopic === topic.id}
            >
              {topic.title}
            </button>
          ))}
        </div>
      </section>

      {/* PROMPT */}
      <section style={{ margin: '1rem 0' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional: add custom instructions (tone, reading level, examples, length, etc.)"
          rows={4}
          cols={60}
          style={{ marginBottom: '0.75rem', width: '100%', maxWidth: 720 }}
        />
      </section>


      {/* GENERATE BUTTON */}
      <div style={{ marginTop: 8 }}>
        <button
          onClick={handleGenerate}
          disabled={!readyToGenerate}
          style={{
            padding: '0.7rem 1.1rem',
            borderRadius: 12,
            border: '1px solid #111',
            background: readyToGenerate ? '#f0f0f0' : '#aaa',
            color: '#000',
            cursor: readyToGenerate ? 'pointer' : 'not-allowed',
            minWidth: 200
          }}
        >
          {isBusy ? 'Generating…' : 'Generate Video'}
        </button>
      </div>

      {/* Status / Progress */}
      <div style={{ minHeight: 32, marginTop: 10 }}>
        {status === 'generating' && <em>Submitting your request…</em>}
        {status === 'polling' && (
          <div style={{ maxWidth: 480, margin: '0.5rem auto' }}>
            <div style={{ height: 10, background: '#eee', borderRadius: 999 }}>
              <div style={{ height: 10, width: `${progress}%`, background: '#9ca3af', borderRadius: 999, transition: 'width 300ms ease' }} />
            </div>
            <small style={{ color: '#555' }}>Generating{progress ? ` — ${progress}%` : '…'}</small>
          </div>
        )}
        {status === 'ready' && (
          <div style={{ marginTop: 8 }}>
            <strong>Ready:</strong> {faceTitle} — {topicTitle}
          </div>
        )}
        {status === 'error' && error && (
          <div style={{ color: '#b91c1c', marginTop: 8 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Video Player */}
      {videoUrl && (
        <div style={{ marginTop: '1.5rem' }}>
          <video 
            src={videoUrl} 
            controls 
            width={640} 
            style={{ maxWidth: '100%', borderRadius: 12 }} 
          />
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 14, color: '#666' }}>
              Playing: {faceTitle} — {topicTitle}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
