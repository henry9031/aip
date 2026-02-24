import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AIPServer, TaskHandler } from '../src/server';
import { AIPClient } from '../src/client';
import { ManifestBuilder } from '../src/manifest';
import { Manifest, TaskResultPayload, TaskErrorPayload } from '../src/types';

let server: AIPServer;
let manifest: Manifest;
const PORT = 14567;
const AGENT_ID = 'test-provider';
const CLIENT_ID = 'test-requester';

const echoHandler: TaskHandler = async (_cap, input, _env) => {
  return {
    status: 'completed' as const,
    output: { echo: input },
    usage: { duration: '0.1s', cost: '0.00', currency: 'USD' },
  };
};

const slowHandler: TaskHandler = async (_cap, input, _env) => {
  await new Promise((r) => setTimeout(r, 50));
  return {
    status: 'completed' as const,
    output: { processed: true },
  };
};

beforeAll(async () => {
  manifest = new ManifestBuilder()
    .agent({ id: AGENT_ID, name: 'Test Provider' })
    .capability({
      id: 'echo',
      name: 'Echo',
      description: 'Returns input as output',
      tags: ['test'],
    })
    .capability({
      id: 'slow-task',
      name: 'Slow Task',
      description: 'Takes a moment',
      tags: ['test'],
    })
    .endpoints({ aip: `http://localhost:${PORT}/aip`, health: `http://localhost:${PORT}/health` })
    .build();

  server = new AIPServer(manifest);
  server.handle('echo', echoHandler);
  server.handle('slow-task', slowHandler);
  await server.listen(PORT);
});

afterAll(async () => {
  await server.close();
});

describe('AIPServer', () => {
  it('serves health endpoint', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('serves manifest at well-known path', async () => {
    const res = await fetch(`http://localhost:${PORT}/.well-known/aip-manifest.json`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agent.id).toBe(AGENT_ID);
    expect(data.capabilities).toHaveLength(2);
  });

  it('responds to ping with pong', async () => {
    const client = new AIPClient(CLIENT_ID);
    const pong = await client.ping(AGENT_ID, `http://localhost:${PORT}/aip`);
    expect(pong.type).toBe('pong');
    expect(pong.from).toBe(AGENT_ID);
    expect(pong.to).toBe(CLIENT_ID);
  });

  it('returns 404 for unknown paths', async () => {
    const res = await fetch(`http://localhost:${PORT}/unknown`);
    expect(res.status).toBe(404);
  });
});

describe('AIPClient → AIPServer (task flow)', () => {
  it('sends a task and receives result', async () => {
    const client = new AIPClient(CLIENT_ID);
    const response = await client.sendTask(AGENT_ID, `http://localhost:${PORT}/aip`, {
      capability: 'echo',
      input: { message: 'hello AIP' },
    });
    expect(response.type).toBe('task.result');
    expect((response.payload as TaskResultPayload).status).toBe('completed');
    expect((response.payload as TaskResultPayload).output.echo).toEqual({ message: 'hello AIP' });
  });

  it('returns error for unknown capability', async () => {
    const client = new AIPClient(CLIENT_ID);
    const response = await client.sendTask(AGENT_ID, `http://localhost:${PORT}/aip`, {
      capability: 'nonexistent',
      input: {},
    });
    expect(response.type).toBe('task.error');
    expect((response.payload as TaskErrorPayload).code).toBe('CAPABILITY_NOT_FOUND');
  });

  it('fetches manifest from agent', async () => {
    const client = new AIPClient(CLIENT_ID);
    const m = await client.fetchManifest(`http://localhost:${PORT}`);
    expect(m.agent.name).toBe('Test Provider');
    expect(m.capabilities[0].id).toBe('echo');
  });

  it('handles concurrent requests', async () => {
    const client = new AIPClient(CLIENT_ID);
    const promises = Array.from({ length: 10 }, (_, i) =>
      client.sendTask(AGENT_ID, `http://localhost:${PORT}/aip`, {
        capability: 'echo',
        input: { index: i },
      })
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    results.forEach((r) => {
      expect(r.type).toBe('task.result');
      expect((r.payload as TaskResultPayload).status).toBe('completed');
    });
  });
});
