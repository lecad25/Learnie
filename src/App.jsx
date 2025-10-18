import { useState } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerate = async () => {
    // Placeholder video for now
    setVideoUrl('https://via.placeholder.com/300x200.png?text=Video+Preview');
  };

  return (
    <div className="App" style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Cartoon Learning App</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter lesson prompt..."
        rows={4}
        cols={50}
        style={{ marginBottom: '1rem' }}
      />
      <br />
      <button onClick={handleGenerate} style={{ padding: '0.5rem 1rem' }}>
        Generate Video
      </button>

      {videoUrl && (
        <div style={{ marginTop: '2rem' }}>
          <video src={videoUrl} controls width="500" />
        </div>
      )}
    </div>
  );
}

export default App;
