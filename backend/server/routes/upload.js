const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { spawn } = require('child_process');
const path    = require('path');
const fs      = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve('./backend/uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) return cb(null, true);
    cb(new Error('Only .xlsx and .xls files are supported'));
  }
});

router.post('/', upload.single('file'), (req, res) => {
  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = (stage, message) => {
    res.write(`data: ${JSON.stringify({ stage, message })}\n\n`);
  };

  if (!req.file) {
    send('error', 'No file received. Please try again.');
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  const filePath = path.resolve(req.file.path);
  const dataDir  = path.resolve('./backend/data');
  fs.mkdirSync(dataDir, { recursive: true });

  // Clear previous results so old data never bleeds into the new upload
  ['businesses.json','units.json','clusters.json','cohorts.json','meta.json'].forEach(f => {
    try { fs.unlinkSync(path.join(dataDir, f)); } catch {}
  });

  send('uploading', `File received (${(req.file.size / 1024 / 1024).toFixed(1)} MB). Starting analysis...`);

  // Try python3 first, fall back to python on Windows
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
  const python = spawn(pythonCmd, ['backend/preprocess/extract.py', filePath, dataDir, originalName]);

  python.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.includes('Sheets found'))    send('processing', line);
      if (line.includes('Sheet '))          send('processing', line);
      if (line.includes('Dimensions'))      send('computing',  line);
      if (line.includes('Categories'))      send('computing',  line);
      if (line.includes('businesses extr')) send('computing',  line);
      if (line.includes('business units'))  send('computing',  line);
      if (line.includes('DONE'))            send('generating', 'Scores computed. AI generating insights...');
    }
  });

  let stderrBuf = '';
  python.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrBuf += text;
    console.error('[Python stderr]', text);
  });

  python.on('close', (code) => {
    fs.unlink(filePath, () => {});

    if (code !== 0) {
      // Extract the last ValueError / Exception message for a useful error
      const errLine = stderrBuf.split('\n')
        .reverse()
        .map(l => l.trim())
        .find(l => l && !l.startsWith('File ') && !l.startsWith('Traceback') && !l.startsWith('^'));
      const detail = errLine ? ` (${errLine})` : '';
      send('error', `Processing failed. Please check your Excel file format.${detail}`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf8'));
      send('ready', JSON.stringify(meta));
    } catch {
      send('error', 'Data processed but could not read results. Please try again.');
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });

  python.on('error', (err) => {
    send('error', `Server error: ${err.message}. Is Python3 installed?`);
    res.write('data: [DONE]\n\n');
    res.end();
  });
});

module.exports = router;
