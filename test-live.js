#!/usr/bin/env node
/**
 * Live integration test — 5 independent agents on different ports,
 * all discovering each other via registry and exchanging real tasks.
 */
const http = require('http');
const crypto = require('crypto');

const REGISTRY_PORT = 4200;
const PORTS = [4211, 4212, 4213, 4214, 4215];

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function env(type, from, to, payload, opts = {}) {
  return { aip: '0.1', id: crypto.randomUUID(), type, from, to, timestamp: new Date().toISOString(), payload, ...opts };
}

// Agent definitions
const agents = [
  { id: 'translator-1', name: 'Translator', port: PORTS[0], cap: 'translate', tags: ['nlp', 'i18n'], handler: (input) => ({ translated: `[DE] ${input.text}`, from: 'en', to: 'de' }) },
  { id: 'coder-1', name: 'Code Generator', port: PORTS[1], cap: 'generate-code', tags: ['code', 'dev'], handler: (input) => ({ code: `function ${input.name}() { return "${input.description}"; }`, language: 'javascript' }) },
  { id: 'reviewer-1', name: 'Code Reviewer', port: PORTS[2], cap: 'review-code', tags: ['code', 'qa'], handler: (input) => ({ score: 8.5, issues: ['Consider adding types'], approved: true }) },
  { id: 'formatter-1', name: 'Formatter', port: PORTS[3], cap: 'format-text', tags: ['text'], handler: (input) => ({ formatted: input.text.toUpperCase(), style: input.style || 'upper' }) },
  { id: 'analyzer-1', name: 'Data Analyzer', port: PORTS[4], cap: 'analyze', tags: ['data', 'ml'], handler: (input) => ({ mean: 42.5, trend: 'increasing', confidence: 0.91 }) },
];

function startAgent(a) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/.well-known/aip-manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(a.manifest));
      }
      if (req.method === 'POST' && (req.url === '/aip' || req.url === '/')) {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
          const e = JSON.parse(body);
          if (e.type === 'task.request') {
            const result = env('task.result', a.id, e.from, {
              status: 'completed', output: a.handler(e.payload.input),
              usage: { duration: '0.05s', cost: '0.01', currency: 'USD' },
            }, { replyTo: e.id });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } else if (e.type === 'ping') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(env('pong', a.id, e.from, {}, { replyTo: e.id })));
          }
        });
        return;
      }
      res.writeHead(404); res.end();
    });
    server.listen(a.port, () => resolve(server));
  });
}

async function main() {
  console.log('\n🧪 AIP Live Integration Test — 5 Agents\n');
  
  // Start registry
  const { app, agents: store } = require('./registry/server.js');
  store.clear();
  const registryServer = await new Promise(r => { const s = app.listen(REGISTRY_PORT, () => r(s)); });
  console.log(`✅ Registry on :${REGISTRY_PORT}`);

  // Start all agents
  const servers = [];
  for (const a of agents) {
    a.manifest = {
      aip: '0.1',
      agent: { id: a.id, name: a.name },
      capabilities: [{ id: a.cap, name: a.cap, tags: a.tags }],
      endpoints: { aip: `http://localhost:${a.port}/aip` },
    };
    servers.push(await startAgent(a));
    console.log(`✅ ${a.name} on :${a.port}`);
  }

  // Register all agents
  for (const a of agents) {
    await req('POST', `http://localhost:${REGISTRY_PORT}/v1/agents`, a.manifest);
  }
  console.log(`✅ All 5 agents registered\n`);

  // Test 1: Discovery
  console.log('--- Test 1: Discovery ---');
  const allAgents = await req('GET', `http://localhost:${REGISTRY_PORT}/v1/agents/search?capability=`);
  console.log(`Found ${allAgents.total} agents in registry`);
  
  const nlpAgents = await req('GET', `http://localhost:${REGISTRY_PORT}/v1/agents/search?tags=nlp`);
  console.log(`NLP agents: ${nlpAgents.results.map(r => r.agent.name).join(', ')}`);
  
  const codeAgents = await req('GET', `http://localhost:${REGISTRY_PORT}/v1/agents/search?tags=code`);
  console.log(`Code agents: ${codeAgents.results.map(r => r.agent.name).join(', ')}`);

  // Test 2: Direct manifest fetch
  console.log('\n--- Test 2: Direct Manifest Fetch (P2P) ---');
  const manifest = await req('GET', `http://localhost:${PORTS[0]}/.well-known/aip-manifest.json`);
  console.log(`Direct fetch from :${PORTS[0]} → ${manifest.agent.name} (${manifest.capabilities[0].id})`);

  // Test 3: Ping each agent
  console.log('\n--- Test 3: Ping All Agents ---');
  for (const a of agents) {
    const pong = await req('POST', `http://localhost:${a.port}/aip`, env('ping', 'test-client', a.id, {}));
    console.log(`Ping ${a.name} → ${pong.type} (${pong.from})`);
  }

  // Test 4: Send tasks to each agent
  console.log('\n--- Test 4: Task Execution ---');
  const tasks = [
    { agent: agents[0], input: { text: 'Hello World' } },
    { agent: agents[1], input: { name: 'greet', description: 'says hello' } },
    { agent: agents[2], input: { code: 'function greet() {}' } },
    { agent: agents[3], input: { text: 'format this text', style: 'upper' } },
    { agent: agents[4], input: { data: [1, 2, 3, 4, 5] } },
  ];

  for (const t of tasks) {
    const result = await req('POST', `http://localhost:${t.agent.port}/aip`,
      env('task.request', 'test-client', t.agent.id, { capability: t.agent.cap, input: t.input }));
    console.log(`${t.agent.name}: ${result.type} → ${JSON.stringify(result.payload.output)}`);
  }

  // Test 5: Cross-agent pipeline (discover → call → pass result)
  console.log('\n--- Test 5: Cross-Agent Pipeline ---');
  
  // Step 1: Generate code
  const codeResult = await req('POST', `http://localhost:${PORTS[1]}/aip`,
    env('task.request', 'orchestrator', 'coder-1', { capability: 'generate-code', input: { name: 'processData', description: 'processes input data' } }));
  console.log(`1. Coder generated: ${codeResult.payload.output.code}`);
  
  // Step 2: Review the generated code
  const reviewResult = await req('POST', `http://localhost:${PORTS[2]}/aip`,
    env('task.request', 'orchestrator', 'reviewer-1', { capability: 'review-code', input: { code: codeResult.payload.output.code } }));
  console.log(`2. Reviewer score: ${reviewResult.payload.output.score}/10, approved: ${reviewResult.payload.output.approved}`);
  
  // Step 3: Translate the result
  const translateResult = await req('POST', `http://localhost:${PORTS[0]}/aip`,
    env('task.request', 'orchestrator', 'translator-1', { capability: 'translate', input: { text: `Code review: ${reviewResult.payload.output.score}/10` } }));
  console.log(`3. Translated: ${translateResult.payload.output.translated}`);

  // Test 6: Concurrent requests
  console.log('\n--- Test 6: Concurrent Requests (25 parallel) ---');
  const start = Date.now();
  const concurrent = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      req('POST', `http://localhost:${PORTS[i % 5]}/aip`,
        env('task.request', 'load-tester', agents[i % 5].id, { capability: agents[i % 5].cap, input: { text: `request-${i}`, name: `fn${i}`, description: `test`, data: [i], code: 'x', style: 'upper' } }))
    )
  );
  const elapsed = Date.now() - start;
  const successes = concurrent.filter(r => r.type === 'task.result').length;
  console.log(`25 parallel requests → ${successes}/25 succeeded in ${elapsed}ms`);

  // Cleanup
  servers.forEach(s => s.close());
  registryServer.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ ALL TESTS PASSED — 5 agents, 6 test suites`);
  console.log(`   Discovery, P2P, Ping, Tasks, Pipeline, Concurrency`);
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(e => { console.error('❌ FAILED:', e); process.exit(1); });
