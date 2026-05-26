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
  } catch (err) {
    console.error('GET /api/portfolio/:id', err);
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
  } catch (err) {
    console.error('PUT /api/portfolio/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/snapshot  — create an immutable snapshot, returns new id
app.post('/api/snapshot', async (req, res) => {
  try {
    const { root, tolerance, cash } = req.body;
    if (!root) return res.status(400).json({ error: 'Missing root' });
    const id = require('crypto').randomUUID();
    await portfolios.insertOne({
      _id: id,
      root,
      tolerance,
      cash,
      isSnapshot: true,
      createdAt: new Date(),
    });
    res.json({ id });
  } catch (err) {
    console.error('POST /api/snapshot', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/portfolio/:id
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    await portfolios.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/portfolio/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
connect()
  .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
  .catch(err => { console.error('Failed to connect to MongoDB:', err); process.exit(1); });

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
