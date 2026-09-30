// Singleton factory for the IDE's orchestrator and model registry.
// Same base URL as services/api.ts — 127.0.0.1 works from Expo Go on
// this device because Termux and the app share loopback.
//
// Override at runtime via setBaseUrl() if the network changes.

import { buildDefaultRegistry, ModelAgentRegistry } from './ModelAgentRegistry';
import { CognitiveOrchestrator } from './CognitiveOrchestrator';

const DEFAULT_BASE = 'http://127.0.0.1:8790';

let baseUrl = DEFAULT_BASE;
let registry: ModelAgentRegistry | null = null;
let orchestrator: CognitiveOrchestrator | null = null;

export function getBaseUrl(): string {
  return baseUrl;
}

export function setBaseUrl(url: string): void {
  const trimmed = url.replace(/\/+$/, '');
  if (trimmed === baseUrl) return;
  baseUrl = trimmed;
  registry = null;
  orchestrator = null;
}

export function getRegistry(): ModelAgentRegistry {
  if (!registry) registry = buildDefaultRegistry(baseUrl);
  return registry;
}

export function getOrchestrator(): CognitiveOrchestrator {
  if (!orchestrator) {
    orchestrator = new CognitiveOrchestrator({ registry: getRegistry() });
  }
  return orchestrator;
}
