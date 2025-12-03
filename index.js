'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const LOG_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(LOG_DIR, 'visits.log');
const MAX_RETURNED_RECORDS = 100;

/**
 * Remove control characters and truncate long strings before persisting.
 */
function sanitize(input, fallback = 'unknown', maxLength = 160) {
  if (typeof input !== 'string') {
    return fallback;
  }
  return input.replace(/[\r\n\t]/g, ' ').slice(0, maxLength) || fallback;
}

async function ensureLogFile() {
  await fsp.mkdir(LOG_DIR, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) {
    await fsp.writeFile(
      LOG_FILE,
      'timestamp\tip\ttimezone\tuserAgent\n',
      'utf8'
    );
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '5kb' }));
app.use(
  express.static(path.join(process.cwd(), 'public'), {
    extensions: ['html'],
    maxAge: '1h'
  })
);

app.post('/api/visit', async (req, res, next) => {
  try {
    const ip = sanitize(req.ip);
    const timezone = sanitize(req.body?.timezone, 'unknown', 80);
    const userAgent = sanitize(req.get('user-agent'), 'unknown', 200);
    const timestamp = new Date().toISOString();
    const line = `${timestamp}\t${ip}\t${timezone}\t${userAgent}\n`;

    await fsp.appendFile(LOG_FILE, line, 'utf8');
    res.status(201).json({ ok: true, recordedAt: timestamp });
  } catch (error) {
    next(error);
  }
});

app.get('/api/visits/latest', async (req, res, next) => {
  try {
    const fileContents = await fsp.readFile(LOG_FILE, 'utf8');
    const rows = fileContents.trim().split('\n');
    const [, ...dataRows] = rows;
    const limitedRows = dataRows.slice(-MAX_RETURNED_RECORDS);
    const entries = limitedRows.map((row) => {
      const [timestamp, ip, timezone, userAgent] = row.split('\t');
      return { timestamp, ip, timezone, userAgent };
    });
    res.json({ entries });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ entries: [] });
      return;
    }
    next(error);
  }
});

app.get('/api/visits/count', async (_req, res, next) => {
  try {
    const fileContents = await fsp.readFile(LOG_FILE, 'utf8');
    const rows = fileContents.trim().split('\n');
    const [, ...dataRows] = rows;
    res.json({ count: dataRows.filter(Boolean).length });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ count: 0 });
      return;
    }
    next(error);
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, _req, res, _next) => {
  console.error('Unexpected error while handling request:', err);
  res.status(500).json({ ok: false, message: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3000;

ensureLogFile()
  .then(() => {
    app.listen(port, () => {
      console.log(`Visit logger listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize log file', error);
    process.exit(1);
  });

