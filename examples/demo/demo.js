#!/usr/bin/env node
/**
 * AIP Demo — Two agents collaborating via a registry
 *
 * 1. Starts the registry
 * 2. Chart agent registers itself
 * 3. Research agent discovers chart agent
 * 4. Research agent sends a task request
 * 5. Chart agent processes it and returns a result
 *
 * Run: node demo.js
 */

const http = require('http');
const crypto = require('crypto');

// ─── Logging helpers ───────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const BLUE = '\x1b[34m';

function banner(text) { console.log(`\n${BOLD}${CYAN}${'═'.repeat(60)}${RESET}`); console.log(`${BOLD}${CYAN}  ${text}${RESET}`); console.log(`${BOLD}${CYAN}${'═'.repeat(60)}${RESET}\n`); }
function step(n, text) { console.log(`${BOLD}${YELLOW}  Step ${n}:${RESET} ${text}`); }
function info(label, text) { console.log(`${DIM}    ${label}:${RESET} ${text}`); }
function arrow(dir, type) { const color = dir === '→' ? GREEN : MAGENTA; console.log(`${color}    ${dir} ${BOLD}${type}${RESET}`); }
function json(obj) { console.log(`${DIM}${JSON.stringify(obj, null, 2).split('\n').map(l => '      ' + l).join('\n')}${RESET}`); }
function success(text) { console.log(`\n${BOLD}${GREEN}  ✓ ${text}${RESET}\n`); }

// ─── Minimal HTTP helpers ──────────────────────────────────────────

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, (res) => {
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

// ─── Agent Definitions ─────────────────────────────────────────────

const REGISTRY_PORT = 4100;
const CHART_AGENT_PORT = 4101;
const REGISTRY_URL = `http://localhost:${REGISTRY_PORT}`;

const CHART_AGENT_ID = 'chart-agent-001';
const RESEARCH_AGENT_ID = 'research-agent-042';

const chartManifest = {
  aip: '0.1',
  agent: { id: CHART_AGENT_ID, name: 'ChartBot', description: 'Generates charts from data', version: '1.0.0' },
  capabilities: [{
    id: 'generate-chart',
    name: 'Generate Chart',
    description: 'Creates a chart image from data points',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'Array of {label, value} objects' },
        chartType: { type: 'string', enum: ['bar', 'line', 'pie'] },
        title: { type: 'string' },
      },
      required: ['data', 'chartType'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string' },
        format: { type: 'string' },
      },
    },
    tags: ['chart', 'data-viz', 'visualization'],
    pricing: { model: 'per-task', amount: '0.02', currency: 'USD' },
  }],
  endpoints: { aip: `http://localhost:${CHART_AGENT_PORT}/aip`, health: `http://localhost:${CHART_AGENT_PORT}/health` },
};

// ─── Chart Agent Server ────────────────────────────────────────────

function startChartAgent() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
      }
      if (req.method === 'GET' && req.url === '/.well-known/aip-manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(chartManifest));
      }
      if (req.method === 'POST' && (req.url === '/aip' || req.url === '/')) {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
          const env = JSON.parse(body);
          info('ChartBot received', env.type);

          if (env.type === 'task.request') {
            const { data, chartType, title } = env.payload.input;

            // "Generate" a chart (simulate)
            const barChart = data.map(d =>
              `    ${(d.label || d.month).padEnd(8)} ${'█'.repeat(Math.round((d.value || 0) / 5))} ${d.value}`
            ).join('\n');

            console.log(`\n${BLUE}    ┌─── ChartBot generating: "${title || 'Chart'}" (${chartType}) ───┐${RESET}`);
            console.log(`${BLUE}${barChart}${RESET}`);
            console.log(`${BLUE}    └${'─'.repeat(50)}┘${RESET}\n`);

            const result = createEnvelope('task.result', CHART_AGENT_ID, env.from, {
              status: 'completed',
              output: {
                imageUrl: `https://chartbot.example.com/charts/${crypto.randomUUID().slice(0, 8)}.png`,
                format: 'png',
                dimensions: '800x600',
                chartType,
                title: title || 'Chart',
                dataPoints: data.length,
              },
              usage: { duration: '1.2s', cost: '0.02', currency: 'USD' },
            }, { replyTo: env.id });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unknown type' }));
          }
        });
        return;
      }
      res.writeHead(404); res.end();
    });
    server.listen(CHART_AGENT_PORT, () => resolve(server));
  });
}

// ─── Registry (inline, reusing server.js logic) ───────────────────

let registryApp, registryServer;

async function startRegistry() {
  // Use the registry from ../registry/
  const { start } = require('../../registry/server.js');
  registryServer = await start();
}

// ─── Main Demo ─────────────────────────────────────────────────────

async function main() {
  banner('AIP Demo — Agent Interchange Protocol');
  console.log(`${DIM}  Two agents collaborating via a shared registry${RESET}\n`);

  // Step 1: Start registry
  step(1, 'Starting the AIP Registry...');
  await startRegistry();
  info('Registry', `http://localhost:${REGISTRY_PORT}`);
  const health = await request('GET', `${REGISTRY_URL}/health`);
  info('Health', JSON.stringify(health));

  // Step 2: Start chart agent & register
  step(2, 'Starting ChartBot and registering with the registry...');
  const chartServer = await startChartAgent();
  info('ChartBot', `http://localhost:${CHART_AGENT_PORT}`);

  arrow('→', 'POST /v1/agents (register ChartBot)');
  const regResult = await request('POST', `${REGISTRY_URL}/v1/agents`, chartManifest);
  info('Result', JSON.stringify(regResult));

  // Step 3: Research agent discovers chart agent
  step(3, 'Research Agent searches the registry for chart capabilities...');
  arrow('→', 'GET /v1/agents/search?capability=chart&tags=data-viz');
  const searchResult = await request('GET', `${REGISTRY_URL}/v1/agents/search?capability=chart&tags=data-viz`);
  info('Found', `${searchResult.total} agent(s)`);
  if (searchResult.results.length > 0) {
    const found = searchResult.results[0];
    info('Agent', `${found.agent.name} (${found.agent.id})`);
    info('Capability', found.capability);
    info('Endpoint', found.endpoint);
    info('Price', `${found.pricing.amount} ${found.pricing.currency}`);
  }

  // Step 4: Research agent sends task request
  step(4, 'Research Agent sends a task request to ChartBot...');
  const taskPayload = {
    capability: 'generate-chart',
    input: {
      data: [
        { month: 'Jan', value: 42 },
        { month: 'Feb', value: 67 },
        { month: 'Mar', value: 89 },
        { month: 'Apr', value: 54 },
        { month: 'May', value: 95 },
      ],
      chartType: 'bar',
      title: 'Monthly Growth Q1-Q2',
    },
    constraints: { maxDuration: '30s', maxCost: '0.10' },
  };
  const taskEnvelope = createEnvelope('task.request', RESEARCH_AGENT_ID, CHART_AGENT_ID, taskPayload);
  arrow('→', 'task.request');
  json(taskEnvelope);

  // Step 5: Send and get result
  step(5, 'ChartBot processes the request and returns the result...');
  const result = await request('POST', `http://localhost:${CHART_AGENT_PORT}/aip`, taskEnvelope);
  arrow('←', 'task.result');
  json(result);

  // Step 6: Summary
  step(6, 'Exchange complete!');
  console.log();
  info('Task ID', taskEnvelope.id);
  info('Result ID', result.id);
  info('Status', result.payload?.status);
  info('Chart URL', result.payload?.output?.imageUrl);
  info('Cost', `${result.payload?.usage?.cost} ${result.payload?.usage?.currency}`);
  info('Duration', result.payload?.usage?.duration);

  success('Two agents collaborated successfully via AIP!');

  // Cleanup
  chartServer.close();
  registryServer.close();
}

main().catch(err => { console.error('Demo failed:', err); process.exit(1); });
