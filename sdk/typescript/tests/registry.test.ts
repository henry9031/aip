import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ManifestBuilder } from '../src/manifest';
import { RegistryClient } from '../src/registry';

// Uses the reference registry from ../../registry/server.js
const REGISTRY_PORT = 14568;
let registryServer: any;
let registry: RegistryClient;

beforeAll(async () => {
  // Start registry
  const { start, agents } = require('../../../registry/server.js');
  // Clear any previous state
  agents.clear();
  process.env.PORT = String(REGISTRY_PORT);
  registryServer = await new Promise<any>((resolve) => {
    const http = require('http');
    const { app } = require('../../../registry/server.js');
    const server = app.listen(REGISTRY_PORT, () => resolve(server));
  });
  registry = new RegistryClient(`http://localhost:${REGISTRY_PORT}`);
});

afterAll(async () => {
  if (registryServer) await new Promise<void>((resolve) => registryServer.close(() => resolve()));
});

describe('RegistryClient', () => {
  const manifest1 = new ManifestBuilder()
    .agent({ id: 'agent-1', name: 'Summarizer', operator: 'Acme' })
    .capability({ id: 'summarize', name: 'Summarize', tags: ['nlp', 'text'] })
    .endpoints({ aip: 'http://localhost:5001/aip' })
    .build();

  const manifest2 = new ManifestBuilder()
    .agent({ id: 'agent-2', name: 'Translator' })
    .capability({ id: 'translate', name: 'Translate', tags: ['nlp', 'i18n'] })
    .endpoints({ aip: 'http://localhost:5002/aip' })
    .build();

  it('registers an agent', async () => {
    const result = await registry.register(manifest1);
    expect(result.id).toBe('agent-1');
  });

  it('registers a second agent', async () => {
    const result = await registry.register(manifest2);
    expect(result.id).toBe('agent-2');
  });

  it('gets an agent by ID', async () => {
    const m = await registry.get('agent-1');
    expect(m.agent.name).toBe('Summarizer');
  });

  it('searches by capability', async () => {
    const results = await registry.search({ capability: 'summarize' });
    expect(results.total).toBe(1);
    expect(results.results[0].agent.name).toBe('Summarizer');
  });

  it('searches by tag', async () => {
    const results = await registry.search({ tags: ['nlp'] });
    expect(results.total).toBe(2);
  });

  it('returns empty for non-matching search', async () => {
    const results = await registry.search({ capability: 'nonexistent' });
    expect(results.total).toBe(0);
  });

  it('deregisters an agent', async () => {
    await registry.deregister('agent-2');
    const results = await registry.search({ tags: ['i18n'] });
    expect(results.total).toBe(0);
  });
});
