const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));
app.use(cors());
app.options('*', cors());
app.use(express.json());

app.post('/generate-video', (req, res) => {
  const { prompt } = req.body || {};
  res.json({ videoUrl: 'https://via.placeholder.com/300x200.png?text=Video+Preview' });
});

const PORT = 8080;
app.listen(PORT, '127.0.0.1', () => console.log(`Backend running on http://127.0.0.1:${PORT}`));
