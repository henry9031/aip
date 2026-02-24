/**
 * Message envelope — create and validate AIP message envelopes
 */
import { randomUUID } from 'crypto';
import { Envelope, MessageType } from './types';

/** Create a new envelope with defaults filled in */
export function createEnvelope<T>(
  type: MessageType,
  from: string,
  to: string,
  payload: T,
  opts?: { replyTo?: string; correlationId?: string }
): Envelope<T> {
  return {
    aip: '0.1',
    id: randomUUID(),
    type,
    from,
    to,
    timestamp: new Date().toISOString(),
    payload,
    ...opts,
  };
}

/** Get the canonical JSON string for signing (deterministic key order) */
export function canonicalPayload(env: Envelope): string {
  const { id, type, from, to, timestamp, payload } = env;
  return JSON.stringify({ id, type, from, to, timestamp, payload });
}

/** Basic envelope validation */
export function validateEnvelope(env: unknown): env is Envelope {
  const e = env as Envelope;
  return (
    typeof e?.aip === 'string' &&
    typeof e?.id === 'string' &&
    typeof e?.type === 'string' &&
    typeof e?.from === 'string' &&
    typeof e?.to === 'string' &&
    typeof e?.timestamp === 'string' &&
    e?.payload !== undefined
  );
}
