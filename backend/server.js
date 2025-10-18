const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios'); // for API calls later

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate-video', async (req, res) => {
  const { prompt } = req.body;

  // Placeholder video for now
  res.json({ videoUrl: 'https://via.placeholder.com/300x200.png?text=Video+Preview' });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
