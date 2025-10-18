import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Frontend assumptions (safe defaults):
 * - POST `${API_PREFIX}/generate-video` with JSON { lectureId, prompt }
 *     → either returns { videoUrl } immediately OR { jobId }
 * - If { jobId } is returned, we poll GET `${API_BASE}/jobs/${jobId}`
 *     → expected shape { status: "queued"|"processing"|"ready"|"failed", progress?: number, videoUrl?: string, error?: string }
 *
 * If your backend uses different paths/fields, tweak ENDPOINTS + response handling inside handleGenerate().
 */

const API_BASE = ""; // use Vite proxy during development (recommended)
const API_PREFIX = "/api"; // all requests go through proxy

const LECTURES = [
  { id: "lec-1", title: "Alphabet Adventure (Ages 4-6)" },
  { id: "lec-2", title: "Counting with Critters (Ages 4-6)" },
  { id: "lec-3", title: "Solar System Safari (Ages 6-8)" },
  { id: "lec-4", title: "Fractions with Pizza (Ages 7-9)" },
  { id: "lec-5", title: "Habitats & Animals (Ages 7-9)" },
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | generating | polling | ready | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const pollingRef = useRef(null);

  const lectureTitle = useMemo(() => {
    return LECTURES.find((l) => l.id === selectedLecture)?.title || "";
  }, [selectedLecture]);

  useEffect(() => {
    // stop polling when unmounting
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const pollJob = (id) => {
    setStatus("polling");
    setError("");

    // Clear any existing poller
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`Polling failed (${res.status})`);
        const data = await res.json();

        const { status: s, progress: p = 0, videoUrl: url = "", error: e = "" } = data || {};
        setStatus(s);
        setProgress(typeof p === "number" ? Math.max(0, Math.min(100, p)) : 0);

        if (s === "ready" && url) {
          stopPolling();
          setVideoUrl(url);
          setJobId("");
        } else if (s === "failed") {
          stopPolling();
          setError(e || "The video generation failed.");
          setJobId("");
        }
      } catch (err) {
        stopPolling();
        setStatus("error");
        setError(err.message || "Polling error");
      }
    }, 1500); // poll every 1.5s; adjust as needed
  };

  const handleGenerate = async (lectureId) => {
    setSelectedLecture(lectureId);
    setStatus("generating");
    setProgress(0);
    setError("");
    setVideoUrl("");
    setJobId("");

    try {
      const res = await fetch(`${API_PREFIX}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId, prompt }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();

      if (data?.videoUrl) {
        // Synchronous completion path
        setVideoUrl(data.videoUrl);
        setStatus("ready");
      } else if (data?.jobId) {
        // Async job path → start polling
        setJobId(data.jobId);
        pollJob(data.jobId);
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err) {
      stopPolling();
      setStatus("error");
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <div className="App" style={{ textAlign: "center", padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>Cartoon Learning App</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Choose a lecture to generate a kid-friendly deepfake-style lesson. (Backend handles all video magic.)
      </p>

      <div style={{ margin: "1rem 0" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional: add custom instructions (tone, examples, reading level, etc.)"
          rows={4}
          cols={60}
          style={{ marginBottom: "0.75rem", width: "100%", maxWidth: 720 }}
        />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          {LECTURES.map((lec) => (
            <button
              key={lec.id}
              onClick={() => handleGenerate(lec.id)}
              disabled={status === "generating" || status === "polling"}
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: status === "generating" || status === "polling" ? "not-allowed" : "pointer",
                background: selectedLecture === lec.id ? "#f3f4f6" : "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              aria-pressed={selectedLecture === lec.id}
            >
              {lec.title}
            </button>
          ))}
        </div>
      </div>

      {/* Status / Progress */}
      <div style={{ minHeight: 32, marginTop: 6 }}>
        {status === "generating" && <em>Submitting your request…</em>}
        {status === "polling" && (
          <div style={{ maxWidth: 480, margin: "0.5rem auto" }}>
            <div style={{ height: 10, background: "#eee", borderRadius: 999 }}>
              <div
                style={{
                  height: 10,
                  width: `${progress}%`,
                  background: "#9ca3af",
                  borderRadius: 999,
                  transition: "width 300ms ease",
                }}
              />
            </div>
            <small style={{ color: "#555" }}>Generating{progress ? ` — ${progress}%` : "…"}</small>
          </div>
        )}
        {status === "ready" && lectureTitle && (
          <div style={{ marginTop: 8 }}>
            <strong>Ready:</strong> {lectureTitle}
          </div>
        )}
        {status === "error" && error && (
          <div style={{ color: "#b91c1c", marginTop: 8 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Video Player */}
      {videoUrl && (
        <div style={{ marginTop: "1.5rem" }}>
          <video src={videoUrl} controls width={640} style={{ maxWidth: "100%", borderRadius: 12 }} />
          <div style={{ marginTop: 8 }}>
            <a href={videoUrl} download style={{ fontSize: 14 }}>
              Download video
            </a>
          </div>
        </div>
      )}

      {/* Debug / Dev Helpers */}
      <div style={{ marginTop: 24, opacity: 0.6 }}>
        <small>
          API base: <code>{API_BASE || "(same-origin)"}</code>
          {jobId ? (
            <>
              {" "}• Job: <code>{jobId}</code>
            </>
          ) : null}
        </small>
      </div>
    </div>
  );
}

export default App;
