require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api',        require('./routes/data'));
app.use('/api',        require('./routes/ai'));

// Serve React build in production
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ABG EEI server running on http://localhost:${PORT}`);
  console.log(`Cerebras model: ${process.env.CEREBRAS_MODEL || 'llama-3.3-70b'}`);
});
