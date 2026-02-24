/**
 * AIP Server — handle incoming task requests and send results
 *
 * Uses Node.js built-in http module (no Express dependency).
 */
import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { Manifest, Envelope, TaskRequestPayload, TaskResultPayload, TaskErrorPayload, ErrorCodes } from './types';
import { createEnvelope, validateEnvelope } from './envelope';

export type TaskHandler = (
  capability: string,
  input: Record<string, unknown>,
  envelope: Envelope<TaskRequestPayload>
) => Promise<TaskResultPayload>;

export class AIPServer {
  private manifest: Manifest;
  private handlers = new Map<string, TaskHandler>();
  private server?: Server;

  constructor(manifest: Manifest) {
    this.manifest = manifest;
  }

  /** Register a handler for a capability */
  handle(capabilityId: string, handler: TaskHandler): this {
    this.handlers.set(capabilityId, handler);
    return this;
  }

  /** Start listening on the given port */
  listen(port: number, host = '0.0.0.0'): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(port, host, () => resolve());
    });
  }

  /** Stop the server */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    // Health endpoint
    if (req.method === 'GET' && req.url === '/health') {
      return this.json(res, 200, { status: 'ok' });
    }

    // Well-known manifest
    if (req.method === 'GET' && req.url === '/.well-known/aip-manifest.json') {
      return this.json(res, 200, this.manifest);
    }

    // AIP message endpoint
    if (req.method === 'POST' && (req.url === '/aip' || req.url === '/')) {
      const body = await this.readBody(req);
      let envelope: Envelope<TaskRequestPayload>;
      try {
        envelope = JSON.parse(body);
      } catch {
        return this.json(res, 400, { error: 'Invalid JSON' });
      }

      if (!validateEnvelope(envelope)) {
        return this.json(res, 400, { error: 'Invalid envelope' });
      }

      // Handle ping
      if (envelope.type === 'ping') {
        const pong = createEnvelope('pong', this.manifest.agent.id, envelope.from, {}, { replyTo: envelope.id });
        return this.json(res, 200, pong);
      }

      // Handle task request
      if (envelope.type === 'task.request') {
        return this.handleTask(envelope, res);
      }

      return this.json(res, 400, { error: `Unsupported message type: ${envelope.type}` });
    }

    this.json(res, 404, { error: 'Not found' });
  }

  private async handleTask(envelope: Envelope<TaskRequestPayload>, res: ServerResponse) {
    const { capability, input } = envelope.payload;
    const handler = this.handlers.get(capability);

    if (!handler) {
      const errEnv = createEnvelope<TaskErrorPayload>(
        'task.error', this.manifest.agent.id, envelope.from,
        { code: ErrorCodes.CAPABILITY_NOT_FOUND, message: `Unknown capability: ${capability}` },
        { replyTo: envelope.id, correlationId: envelope.correlationId }
      );
      return this.json(res, 200, errEnv);
    }

    try {
      const result = await handler(capability, input, envelope);
      const resultEnv = createEnvelope<TaskResultPayload>(
        'task.result', this.manifest.agent.id, envelope.from, result,
        { replyTo: envelope.id, correlationId: envelope.correlationId }
      );
      this.json(res, 200, resultEnv);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal error';
      const errEnv = createEnvelope<TaskErrorPayload>(
        'task.error', this.manifest.agent.id, envelope.from,
        { code: ErrorCodes.INTERNAL_ERROR, message: msg },
        { replyTo: envelope.id, correlationId: envelope.correlationId }
      );
      this.json(res, 200, errEnv);
    }
  }

  private json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }
}
