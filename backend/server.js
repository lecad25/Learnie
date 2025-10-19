// server.js (ESM)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import generateRoute from "./routes/generate.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// serve generated videos and HTML files
app.use("/videos", express.static(path.join(__dirname, "output")));

// quick health route
app.get("/health", (req, res) => res.json({ ok: true }));

// mount the generator route
app.use("/generate-video", generateRoute);

// catch-all to SEE what's being hit
app.use((req, res) => {
  res.status(404).send(`No route for ${req.method} ${req.url}`);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
