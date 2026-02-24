/**
 * AIP Reference Registry Server
 * In-memory store with REST API for agent registration and discovery.
 */
const express = require('express');

const app = express();
app.use(express.json());

// --- In-memory store ---
const agents = new Map(); // agentId -> { manifest, registeredAt, lastSeen }

// --- Basic rate limiting ---
const rateLimits = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60_000;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    rateLimits.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: Math.ceil((entry.resetAt - now) / 1000) + 's' });
  }
  next();
}
app.use(rateLimit);

// --- Health ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', agents: agents.size });
});

// --- Register agent ---
app.post('/v1/agents', (req, res) => {
  const manifest = req.body;
  if (!manifest?.agent?.id || !manifest?.agent?.name || !manifest?.capabilities?.length) {
    return res.status(400).json({ error: 'Invalid manifest: need agent.id, agent.name, and capabilities' });
  }
  agents.set(manifest.agent.id, {
    manifest,
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  });
  res.status(201).json({ id: manifest.agent.id, status: 'registered' });
});

// --- Search agents (must be before :id route) ---
app.get('/v1/agents/search', (req, res) => {
  const { capability, tags, maxPrice, operator } = req.query;
  const tagList = tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [];

  const results = [];
  for (const [, entry] of agents) {
    const m = entry.manifest;
    for (const cap of m.capabilities) {
      // Filter by capability (substring match)
      if (capability && !cap.id.includes(capability) && !cap.name.toLowerCase().includes(capability.toLowerCase())) {
        continue;
      }
      // Filter by tags
      if (tagList.length > 0 && !(cap.tags || []).some(t => tagList.includes(t.toLowerCase()))) {
        continue;
      }
      // Filter by max price
      if (maxPrice && cap.pricing?.amount && parseFloat(cap.pricing.amount) > parseFloat(maxPrice)) {
        continue;
      }
      // Filter by operator
      if (operator && m.agent.operator !== operator) {
        continue;
      }

      results.push({
        agent: { id: m.agent.id, name: m.agent.name },
        capability: cap.id,
        trustScore: 0.5, // default for new agents
        pricing: cap.pricing || null,
        endpoint: m.endpoints.aip,
        lastSeen: entry.lastSeen,
      });
    }
  }

  res.json({ results, total: results.length, page: 1 });
});

// --- Get agent ---
app.get('/v1/agents/:id', (req, res) => {
  const entry = agents.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Agent not found' });
  res.json(entry.manifest);
});

// --- Delete agent ---
app.delete('/v1/agents/:id', (req, res) => {
  if (!agents.has(req.params.id)) return res.status(404).json({ error: 'Agent not found' });
  agents.delete(req.params.id);
  res.json({ status: 'deregistered' });
});

// --- Start server ---
const PORT = process.env.PORT || 4100;

function start() {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`🗂️  AIP Registry running on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// If run directly, start the server
if (require.main === module) {
  start();
}

module.exports = { app, start, agents };
