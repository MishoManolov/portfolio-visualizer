require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const client = new MongoClient(process.env.MONGODB_URI);
let portfolios;

async function connect() {
  await client.connect();
  portfolios = client.db('portfolio-viz').collection('portfolios');
  console.log('Connected to MongoDB');
}

// GET /api/portfolio/:id
app.get('/api/portfolio/:id', async (req, res) => {
  try {
    const doc = await portfolios.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const { root, tolerance, cash, shareMode } = doc;
    res.json({ root, tolerance, cash, shareMode: shareMode ?? null });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/portfolio/:id  (upsert)
app.put('/api/portfolio/:id', async (req, res) => {
  try {
    const { root, tolerance, cash } = req.body;
    if (!root) return res.status(400).json({ error: 'Missing root' });
    await portfolios.replaceOne(
      { _id: req.params.id },
      { _id: req.params.id, root, tolerance, cash, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/portfolio/:id/share  — set or update share mode
app.patch('/api/portfolio/:id/share', async (req, res) => {
  try {
    const { shareMode } = req.body;
    if (!['edit', 'view'].includes(shareMode)) return res.status(400).json({ error: 'Invalid mode' });
    const result = await portfolios.updateOne(
      { _id: req.params.id },
      { $set: { shareMode, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/portfolio/:id
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    await portfolios.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
connect()
  .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
  .catch(err => { console.error('Failed to connect to MongoDB:', err); process.exit(1); });
