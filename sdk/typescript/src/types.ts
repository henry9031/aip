/**
 * AIP Core Types — All TypeScript types for the Agent Interchange Protocol
 */

// --- Agent & Manifest ---

export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  version?: string;
  homepage?: string;
  operator?: string;
}

export interface CapabilityPricing {
  model: 'per-task' | 'per-minute' | 'free';
  amount?: string;
  currency?: string;
}

export interface Capability {
  id: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  estimatedDuration?: string;
  pricing?: CapabilityPricing;
  tags?: string[];
}

export interface Endpoints {
  aip: string;
  health?: string;
}

export interface AuthConfig {
  schemes: string[];
}

export interface TrustConfig {
  publicKey?: string;
  attestations?: Attestation[];
}

export interface Attestation {
  issuer: string;
  type: string;
  issuedAt: string;
  signature: string;
}

export interface Manifest {
  aip: string;
  agent: AgentInfo;
  capabilities: Capability[];
  endpoints: Endpoints;
  auth?: AuthConfig;
  trust?: TrustConfig;
}

// --- Message Envelope ---

export type MessageType =
  | 'task.request' | 'task.accept' | 'task.progress'
  | 'task.result' | 'task.error' | 'task.cancel'
  | 'task.quote' | 'task.offer' | 'task.negotiate'
  | 'ping' | 'pong'
  | 'capability.query' | 'capability.response';

export interface Envelope<T = unknown> {
  aip: string;
  id: string;
  type: MessageType;
  from: string;
  to: string;
  timestamp: string;
  payload: T;
  signature?: string;
  replyTo?: string;
  correlationId?: string;
}

// --- Task Payloads ---

export interface TaskConstraints {
  maxDuration?: string;
  maxCost?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface TaskRequestPayload {
  capability: string;
  input: Record<string, unknown>;
  constraints?: TaskConstraints;
  context?: Record<string, unknown>;
}

export interface TaskResultPayload {
  status: 'completed';
  output: Record<string, unknown>;
  usage?: {
    duration?: string;
    cost?: string;
    currency?: string;
  };
}

export interface TaskProgressPayload {
  stage?: string;
  progress?: number;
  message?: string;
  estimatedRemaining?: string;
}

export interface TaskErrorPayload {
  code: string;
  message: string;
  retryable?: boolean;
  retryAfter?: string;
}

export type TaskState =
  | 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REJECTED';

// --- Registry ---

export interface SearchParams {
  capability?: string;
  tags?: string[];
  maxPrice?: number;
  minTrust?: number;
  available?: boolean;
  operator?: string;
}

export interface SearchResult {
  agent: Pick<AgentInfo, 'id' | 'name'>;
  capability: string;
  trustScore?: number;
  pricing?: CapabilityPricing;
  endpoint: string;
  lastSeen: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
}

// --- Error Codes ---

export const ErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  CAPABILITY_UNAVAILABLE: 'CAPABILITY_UNAVAILABLE',
  CAPABILITY_NOT_FOUND: 'CAPABILITY_NOT_FOUND',
  INPUT_VALIDATION_FAILED: 'INPUT_VALIDATION_FAILED',
  TASK_TIMEOUT: 'TASK_TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  COST_EXCEEDED: 'COST_EXCEEDED',
} as const;
