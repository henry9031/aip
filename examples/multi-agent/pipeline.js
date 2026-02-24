#!/usr/bin/env node
/**
 * AIP Multi-Agent Pipeline
 *
 * Three agents collaborate in a pipeline:
 *   Researcher → Summarizer → Chart Generator
 *
 * All agents discover each other via the AIP registry.
 * Run: node pipeline.js
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');

// ─── Colors & Logging ──────────────────────────────────────────────
const R = '\x1b[0m', B = '\x1b[1m', D = '\x1b[2m';
const C = '\x1b[36m', G = '\x1b[32m', Y = '\x1b[33m', M = '\x1b[35m', BL = '\x1b[34m', RD = '\x1b[31m';

const banner = t => console.log(`\n${B}${C}${'═'.repeat(60)}${R}\n${B}${C}  ${t}${R}\n${B}${C}${'═'.repeat(60)}${R}\n`);
const step = (n, t) => console.log(`${B}${Y}  Step ${n}:${R} ${t}`);
const info = (l, t) => console.log(`${D}    ${l}:${R} ${t}`);
const arrow = (d, t) => { const c = d === '→' ? G : M; console.log(`${c}    ${d} ${B}${t}${R}`); };
const success = t => console.log(`\n${B}${G}  ✓ ${t}${R}\n`);
const pipeLog = (from, to, msg) => console.log(`${BL}    ┃ ${B}${from}${R}${BL} → ${B}${to}${R}${BL}: ${msg}${R}`);

// ─── HTTP helpers ──────────────────────────────────────────────────
function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function createEnvelope(type, from, to, payload, opts = {}) {
  return { aip: '0.1', id: crypto.randomUUID(), type, from, to, timestamp: new Date().toISOString(), payload, ...opts };
}

// ─── Config ────────────────────────────────────────────────────────
const REGISTRY_PORT = 4100;
const REGISTRY_URL = `http://localhost:${REGISTRY_PORT}`;

const agents = {
  researcher: { id: 'researcher-001', name: 'Data Researcher', port: 4301, capability: 'research-data' },
  summarizer: { id: 'summarizer-001', name: 'Text Summarizer', port: 4302, capability: 'summarize' },
  charter:    { id: 'chart-gen-001',  name: 'Chart Generator', port: 4303, capability: 'generate-chart' },
};

// ─── Agent Implementations ─────────────────────────────────────────

// Researcher: "collects" data about programming language trends
function researchHandler(input) {
  console.log(`\n${BL}    ┌─── 🔬 Researcher working ───┐${R}`);
  console.log(`${BL}    │ Topic: ${input.topic}${R}`);
  const data = {
    topic: input.topic,
    source: 'Stack Overflow Developer Survey 2024',
    collected_at: new Date().toISOString(),
    findings: [
      { language: 'Python',     popularity: 65, growth: 12, category: 'general' },
      { language: 'JavaScript', popularity: 63, growth: 5,  category: 'web' },
      { language: 'TypeScript', popularity: 44, growth: 18, category: 'web' },
      { language: 'Rust',       popularity: 13, growth: 25, category: 'systems' },
      { language: 'Go',         popularity: 14, growth: 15, category: 'systems' },
      { language: 'Java',       popularity: 30, growth: -2, category: 'enterprise' },
    ],
    raw_text: `Programming language trends show Python and JavaScript maintaining top positions. ` +
              `TypeScript and Rust show the strongest growth. Java is declining slightly. ` +
              `Systems programming languages are gaining traction in cloud-native development.`,
  };
  console.log(`${BL}    │ Found ${data.findings.length} data points${R}`);
  console.log(`${BL}    └${'─'.repeat(40)}┘${R}\n`);
  return data;
}

// Summarizer: condenses research findings
function summarizeHandler(input) {
  console.log(`\n${BL}    ┌─── 📝 Summarizer working ───┐${R}`);
  const findings = input.findings || [];
  const rawText = input.raw_text || '';

  const topGrowing = [...findings].sort((a, b) => b.growth - a.growth).slice(0, 3);
  const topPopular = [...findings].sort((a, b) => b.popularity - a.popularity).slice(0, 3);

  const summary = {
    title: `Summary: ${input.topic || 'Research'}`,
    source: input.source,
    key_insight: `${topGrowing[0]?.language} leads growth at ${topGrowing[0]?.growth}%, while ${topPopular[0]?.language} remains most popular at ${topPopular[0]?.popularity}%`,
    metrics: findings.map(f => ({ label: f.language, popularity: f.popularity, growth: f.growth })),
    categories: {},
    text_summary: rawText.split('.').slice(0, 2).join('.') + '.',
  };

  // Group by category
  for (const f of findings) {
    if (!summary.categories[f.category]) summary.categories[f.category] = [];
    summary.categories[f.category].push(f.language);
  }

  console.log(`${BL}    │ Key: ${summary.key_insight}${R}`);
  console.log(`${BL}    │ Metrics: ${summary.metrics.length} items${R}`);
  console.log(`${BL}    └${'─'.repeat(40)}┘${R}\n`);
  return summary;
}

// Chart Generator: creates ASCII chart from metrics
function chartHandler(input) {
  console.log(`\n${BL}    ┌─── 📊 Chart Generator working ───┐${R}`);
  const metrics = input.metrics || [];
  const title = input.title || 'Chart';

  // Generate popularity chart
  console.log(`${BL}    │${R}`);
  console.log(`${BL}    │  ${B}${title} — Popularity${R}`);
  for (const m of metrics) {
    const bar = '█'.repeat(Math.round(m.popularity / 3));
    console.log(`${BL}    │  ${m.label.padEnd(12)} ${bar} ${m.popularity}%${R}`);
  }
  console.log(`${BL}    │${R}`);
  console.log(`${BL}    │  ${B}${title} — Growth${R}`);
  for (const m of metrics) {
    const val = m.growth;
    const bar = val >= 0 ? '▓'.repeat(Math.round(val / 2)) : '░'.repeat(Math.round(-val / 2));
    const sign = val >= 0 ? '+' : '';
    console.log(`${BL}    │  ${m.label.padEnd(12)} ${bar} ${sign}${val}%${R}`);
  }
  console.log(`${BL}    │${R}`);
  console.log(`${BL}    └${'─'.repeat(42)}┘${R}\n`);

  return {
    charts: [
      { type: 'bar', title: `${title} — Popularity`, imageUrl: `https://charts.example.com/${crypto.randomUUID().slice(0,8)}.png` },
      { type: 'bar', title: `${title} — Growth`, imageUrl: `https://charts.example.com/${crypto.randomUUID().slice(0,8)}.png` },
    ],
    format: 'png',
    dimensions: '800x600',
    key_insight: input.key_insight,
  };
}

// ─── Create an AIP agent server ────────────────────────────────────

function startAgent(agentCfg, handler) {
  const manifest = {
    aip: '0.1',
    agent: { id: agentCfg.id, name: agentCfg.name },
    capabilities: [{ id: agentCfg.capability, name: agentCfg.capability, tags: [agentCfg.capability] }],
    endpoints: { aip: `http://localhost:${agentCfg.port}/aip` },
  };

  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
      }
      if (req.method === 'GET' && req.url === '/.well-known/aip-manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(manifest));
      }
      if (req.method === 'POST' && (req.url === '/aip' || req.url === '/')) {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
          const env = JSON.parse(body);
          if (env.type === 'task.request') {
            const result = handler(env.payload.input);
            const resp = createEnvelope('task.result', agentCfg.id, env.from, {
              status: 'completed', output: result,
              usage: { duration: '0.5s', cost: '0.00', currency: 'USD' },
            }, { replyTo: env.id });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resp));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unsupported' }));
          }
        });
        return;
      }
      res.writeHead(404); res.end();
    });
    server.listen(agentCfg.port, () => resolve({ server, manifest }));
  });
}

// ─── Main Pipeline ─────────────────────────────────────────────────

async function main() {
  const servers = [];

  try {
    banner('AIP Multi-Agent Pipeline');
    console.log(`${D}  Researcher → Summarizer → Chart Generator${R}\n`);

    // Step 1: Start registry
    step(1, 'Starting the AIP Registry...');
    const { start } = require(path.join(__dirname, '..', '..', 'registry', 'server.js'));
    const registryServer = await start();
    servers.push(registryServer);
    info('Registry', REGISTRY_URL);

    // Step 2: Start all agents
    step(2, 'Starting pipeline agents...');
    const researcher = await startAgent(agents.researcher, researchHandler);
    const summarizer = await startAgent(agents.summarizer, summarizeHandler);
    const charter = await startAgent(agents.charter, chartHandler);
    servers.push(researcher.server, summarizer.server, charter.server);

    info('Researcher', `http://localhost:${agents.researcher.port}`);
    info('Summarizer', `http://localhost:${agents.summarizer.port}`);
    info('Charter',    `http://localhost:${agents.charter.port}`);

    // Step 3: Register all agents
    step(3, 'Registering agents with the registry...');
    for (const [key, { manifest }] of [['researcher', researcher], ['summarizer', summarizer], ['charter', charter]]) {
      arrow('→', `POST /v1/agents (${manifest.agent.name})`);
      await request('POST', `${REGISTRY_URL}/v1/agents`, manifest);
    }

    // Step 4: Discover pipeline
    step(4, 'Pipeline orchestrator discovers agents...');
    const discoverCap = async (cap) => {
      const res = await request('GET', `${REGISTRY_URL}/v1/agents/search?capability=${cap}`);
      if (res.results?.length > 0) {
        const r = res.results[0];
        info('Found', `${r.agent.name} → ${r.capability} at ${r.endpoint}`);
        return r;
      }
      throw new Error(`No agent found for ${cap}`);
    };

    const researcherInfo = await discoverCap('research');
    const summarizerInfo = await discoverCap('summarize');
    const charterInfo    = await discoverCap('chart');

    // Step 5: Execute pipeline
    step(5, 'Executing pipeline: Researcher → Summarizer → Charter...');
    console.log();

    // 5a: Research
    pipeLog('Orchestrator', 'Researcher', 'task.request (research-data)');
    arrow('→', 'task.request → Researcher');
    const researchEnv = createEnvelope('task.request', 'orchestrator-001', agents.researcher.id, {
      capability: 'research-data',
      input: { topic: 'Programming Language Trends 2024' },
    });
    const researchResult = await request('POST', researcherInfo.endpoint, researchEnv);
    arrow('←', 'task.result ← Researcher');
    info('Status', researchResult.payload?.status);
    info('Data points', String(researchResult.payload?.output?.findings?.length));

    // 5b: Summarize
    pipeLog('Orchestrator', 'Summarizer', 'task.request (summarize)');
    arrow('→', 'task.request → Summarizer');
    const summarizeEnv = createEnvelope('task.request', 'orchestrator-001', agents.summarizer.id, {
      capability: 'summarize',
      input: researchResult.payload.output,
    });
    const summarizeResult = await request('POST', summarizerInfo.endpoint, summarizeEnv);
    arrow('←', 'task.result ← Summarizer');
    info('Status', summarizeResult.payload?.status);
    info('Insight', summarizeResult.payload?.output?.key_insight);

    // 5c: Chart
    pipeLog('Orchestrator', 'Chart Generator', 'task.request (generate-chart)');
    arrow('→', 'task.request → Chart Generator');
    const chartEnv = createEnvelope('task.request', 'orchestrator-001', agents.charter.id, {
      capability: 'generate-chart',
      input: summarizeResult.payload.output,
    });
    const chartResult = await request('POST', charterInfo.endpoint, chartEnv);
    arrow('←', 'task.result ← Chart Generator');
    info('Status', chartResult.payload?.status);
    info('Charts', chartResult.payload?.output?.charts?.map(c => c.title).join(', '));

    // Step 6: Summary
    step(6, 'Pipeline complete!');
    console.log();
    console.log(`${B}${C}    Pipeline Summary:${R}`);
    console.log(`${D}    ┌──────────────────────────────────────────────────┐${R}`);
    console.log(`${D}    │ 1. Researcher collected ${researchResult.payload?.output?.findings?.length} data points         │${R}`);
    console.log(`${D}    │ 2. Summarizer produced insight + ${summarizeResult.payload?.output?.metrics?.length} metrics     │${R}`);
    console.log(`${D}    │ 3. Chart Generator created ${chartResult.payload?.output?.charts?.length} visualizations      │${R}`);
    console.log(`${D}    │                                                  │${R}`);
    console.log(`${D}    │ All agents discovered via AIP registry           │${R}`);
    console.log(`${D}    │ All communication via AIP envelopes              │${R}`);
    console.log(`${D}    │ Each agent is independently replaceable          │${R}`);
    console.log(`${D}    └──────────────────────────────────────────────────┘${R}`);

    success('Multi-agent pipeline executed successfully via AIP!');

  } finally {
    for (const s of servers) s.close();
  }
}

main().catch(err => { console.error('Pipeline failed:', err); process.exit(1); });
