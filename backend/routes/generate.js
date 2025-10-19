import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Absolute path to the python script (routes/.. -> scripts/generate_video.py)
const scriptPath = path.join(__dirname, '..', 'scripts', 'generate_video.py')

// POST /generate  { topic, character }
router.post('/', (req, res) => {
  const { topic, character } = req.body || {}

  if (!topic || !character) {
    return res.status(400).json({ error: 'Both "topic" and "character" are required' })
  }

  // Use spawn with arg array (no shell), safer with spaces
  const py = spawn('python3', [scriptPath, topic, character], {
    cwd: path.join(__dirname, '..'),   // run from backend root
  })

  let stdout = ''
  let stderr = ''

  py.stdout.on('data', (d) => (stdout += d.toString()))
  py.stderr.on('data', (d) => (stderr += d.toString()))

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('Python failed:', { code, stderr })
      return res.status(500).json({ error: 'Error generating video', details: stderr.trim() })
    }
    console.log(stdout.trim())
    const filename = `${character}_${topic}.mp4`
    const fileUrl = `/videos/${filename}` // served by server.js static route
    return res.json({ message: 'Video generated successfully!', fileUrl })
  })
})

export default router
