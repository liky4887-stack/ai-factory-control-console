// The Master Brain — runs the phase pipeline.
//
// submit(prompt) walks:
//   understand → plan → [audit] → [market] → [adapt] → generate → [diff] → [heal] → meta
//
// Which optional phases fire is decided by the intent flags below. Every
// phase emits events into the global ActivityLog. TaskGraph nodes carry
// each phase's output so the UI can render whatever ran.

import { activityLog } from './ActivityLog';
import { detectUiUxIntent } from './uiUxIntent';
import { createEngineContext } from './EngineContextFactory';
import { ModelAgentRegistry } from './ModelAgentRegistry';
import { EngineRegistry, phasesForIntent, phaseSpec, type PhaseId } from '../engines';
import type {
  ActivityPhase,
  OrchestratorSnapshot,
  TaskGraph,
  TaskNode,
  TaskKind,
} from './types';

type StateListener = (snapshot: OrchestratorSnapshot) => void;

export interface OrchestratorDeps {
  registry: ModelAgentRegistry;
  engines: EngineRegistry;
  initial?: Partial<OrchestratorSnapshot>;
}

export interface SubmitOptions {
  taskId?: string;
  projectId?: string | null;
  enginePreference?: string[];
  onProgress?: (graph: TaskGraph) => void;
  systemContext?: string;
  /** Override intent detection. */
  forceIntent?: { codeChange?: boolean; deploy?: boolean };
}

const BUILD_VERB = /\b(build|create|generate|make|add|write|refactor|change|update|fix|implement|scaffold|redesign|modify|remove|delete|rewrite|edit|install|set|configure|apply|integrate|migrate|replace|rename|move|insert|append)\b/i;
const BUILD_FILE = /(\.[a-z0-9]{1,6}\b|\bsrc\/|\bapp\/|\bcomponents\/|\bpackage\.json\b|\bREADME\b|\btsconfig\b|\bapp\.json\b)/i;
const DEPLOY_VERB = /\b(deploy|ship|publish|release|push to prod)\b/i;

function detectIntent(prompt: string, force?: { codeChange?: boolean; deploy?: boolean }): { codeChange: boolean; deploy: boolean } {
  if (force && (force.codeChange !== undefined || force.deploy !== undefined)) {
    return { codeChange: force.codeChange ?? false, deploy: force.deploy ?? false };
  }
  return {
    codeChange: BUILD_VERB.test(prompt) || BUILD_FILE.test(prompt),
    deploy: DEPLOY_VERB.test(prompt),
  };
}

function kindForPhase(phase: PhaseId): TaskKind {
  switch (phase) {
    case 'understand': return 'understand';
    case 'plan':       return 'plan';
    case 'audit':      return 'audit';
    case 'generate':   return 'generate';
    case 'diff':       return 'diff';
    case 'simulate':   return 'simulate';
    case 'deploy':     return 'deploy';
    case 'heal':       return 'heal';
    case 'meta':       return 'monitor';
    default:           return 'understand';
  }
}

function asActivityPhase(phase: PhaseId): ActivityPhase {
  switch (phase) {
    case 'understand': return 'understand';
    case 'plan':       return 'plan';
    case 'audit':      return 'audit';
    case 'generate':   return 'generate';
    case 'diff':       return 'diff';
    case 'simulate':   return 'simulate';
    case 'deploy':     return 'deploy';
    case 'heal':       return 'heal';
    case 'meta':       return 'monitor';
    default:           return 'idle';
  }
}

let nextTaskNum = 1;
function makeTaskId(): string {
  return 'task_' + Date.now().toString(36) + '_' + (nextTaskNum++).toString(36);
}

export class CognitiveOrchestrator {
  private snapshot: OrchestratorSnapshot;
  private listeners = new Set<StateListener>();
  private modelRegistry: ModelAgentRegistry;
  private engines: EngineRegistry;

  constructor(deps: OrchestratorDeps) {
    this.modelRegistry = deps.registry;
    this.engines = deps.engines;
    this.snapshot = {
      state: 'idle',
      taskId: null,
      since: Date.now(),
      lastMessage: 'Waiting for a request.',
      error: null,
      ...deps.initial,
    };
  }

  current(): OrchestratorSnapshot { return this.snapshot; }

  subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private transition(next: ActivityPhase, message: string, taskId: string | null): void {
    this.snapshot = {
      state: next,
      taskId: taskId ?? this.snapshot.taskId,
      since: Date.now(),
      lastMessage: message,
      error: null,
    };
    activityLog.emit({
      source: 'Orchestrator',
      phase: next,
      status: 'info',
      message,
      taskId: this.snapshot.taskId,
    });
    for (const l of this.listeners) {
      try { l(this.snapshot); } catch {}
    }
  }

  private fail(message: string, taskId: string | null): void {
    this.snapshot = {
      ...this.snapshot,
      state: 'idle',
      taskId,
      since: Date.now(),
      lastMessage: message,
      error: message,
    };
    activityLog.emit({
      source: 'Orchestrator',
      phase: 'idle',
      status: 'error',
      message,
      taskId,
    });
    for (const l of this.listeners) {
      try { l(this.snapshot); } catch {}
    }
  }

  async submit(prompt: string, options: SubmitOptions = {}): Promise<TaskGraph> {
    const taskId = options.taskId || makeTaskId();
    const trimmed = prompt.trim();
    if (!trimmed) { this.fail('empty prompt', taskId); throw new Error('empty prompt'); }

    const intent = detectIntent(trimmed, options.forceIntent);
    const uiUx = detectUiUxIntent(trimmed);
    const activePhases = phasesForIntent({
      isCodeChange: intent.codeChange,
      isDeployRequest: intent.deploy,
      hadError: false,
      isScheduledTick: false,
      // Skills phase fires for either UI/UX or video intent
      isUiUx: uiUx.isUiUx || uiUx.isVideo,
    });

    // Sort by order
    const ordered = [...activePhases].sort((a, b) => phaseSpec(a).order - phaseSpec(b).order);

    const graph: TaskGraph = {
      id: taskId,
      rootPrompt: trimmed,
      createdAt: Date.now(),
      nodes: [],
    };

    const ctx = createEngineContext({
      taskId,
      projectId: options.projectId ?? null,
      prompt: trimmed,
      registry: this.modelRegistry,
      enginePreference: options.enginePreference,
    });

    const progress = () => options.onProgress?.(graph);

    // Build input for each phase. Later phases read earlier outputs.
    const inputFor = (phase: PhaseId): unknown => {
      const understand = ctx.getPhaseOutput<{ restatement: string }>('understand');
      const plan = ctx.getPhaseOutput<{ plan: string }>('plan');
      const audit = ctx.getPhaseOutput<{ summary: string }>('audit');
      switch (phase) {
        case 'understand': return { prompt: trimmed, systemContext: options.systemContext };
        case 'plan':       return { prompt: trimmed, systemContext: options.systemContext };
        case 'generate': {
          const skills = ctx.getPhaseOutput<{ block: string }>('skills');
          const skillsBlock = skills && skills.block ? skills.block : undefined;
          const composedSystem = [options.systemContext, skillsBlock]
            .filter((s): s is string => !!s && s.length > 0)
            .join('\n\n');
          return {
            prompt: trimmed,
            systemContext: composedSystem || undefined,
            restatement: understand?.restatement,
            plan: plan?.plan,
            auditSummary: audit?.summary,
          };
        }
        case 'skills':     return { prompt: trimmed };
        case 'audit':      return { scope: 'all' };
        case 'diff':       return { files: [] };
        case 'heal':       return { error: 'unknown' };
        case 'meta':       return {
          prompt: trimmed,
          phases: ordered,
          succeeded: true,
          elapsedMs: Date.now() - graph.createdAt,
          engineId: null,
        };
        default:           return { prompt: trimmed, systemContext: options.systemContext };
      }
    };

    try {
      for (const phase of ordered) {
        const spec = phaseSpec(phase);
        this.transition(asActivityPhase(phase), spec.label + '...', taskId);

        const engine = this.engines.get(phase);
        if (!engine) {
          activityLog.emit({
            source: spec.source,
            phase: asActivityPhase(phase),
            status: 'info',
            message: 'No engine registered for ' + phase + ' — skipping.',
            taskId,
          });
          continue;
        }
        if (engine.shouldRun && !engine.shouldRun(inputFor(phase), ctx)) {
          continue;
        }

        const node: TaskNode = {
          id: taskId + ':' + phase,
          parentTaskId: graph.nodes.length > 0 ? graph.nodes[graph.nodes.length - 1].id : null,
          kind: kindForPhase(phase),
          title: spec.label,
          description: '',
          status: 'running',
          startedAt: Date.now(),
          finishedAt: null,
          dependsOn: [],
          output: {},
          error: null,
        };
        graph.nodes.push(node);
        progress();

        const result = await engine.run(inputFor(phase), ctx);
        node.finishedAt = Date.now();
        if (result.ok && result.data !== null) {
          node.status = 'success';
          node.output = result.data as Record<string, unknown>;
          ctx.setPhaseOutput(phase, result.data);
        } else {
          node.status = 'failed';
          node.error = result.error;
          if (!spec.optional) {
            this.fail(phase + ' failed: ' + (result.error ?? 'unknown'), taskId);
            throw new Error(phase + ' failed: ' + (result.error ?? 'unknown'));
          }
        }
        progress();
      }

      this.transition('idle', 'Task complete.', taskId);
      return graph;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.fail('Pipeline failed: ' + msg, taskId);
      throw e;
    }
  }

  /** Plan-only — stop after the plan phase. */
  async submitPlan(prompt: string, options: SubmitOptions = {}): Promise<TaskGraph> {
    const taskId = options.taskId || makeTaskId();
    const trimmed = prompt.trim();
    if (!trimmed) { this.fail('empty prompt', taskId); throw new Error('empty prompt'); }

    const graph: TaskGraph = { id: taskId, rootPrompt: trimmed, createdAt: Date.now(), nodes: [] };
    const ctx = createEngineContext({
      taskId,
      projectId: options.projectId ?? null,
      prompt: trimmed,
      registry: this.modelRegistry,
      enginePreference: options.enginePreference,
    });

    const planPhases: PhaseId[] = ['understand', 'plan'];
    try {
      for (const phase of planPhases) {
        const spec = phaseSpec(phase);
        this.transition(asActivityPhase(phase), spec.label + '...', taskId);
        const engine = this.engines.get(phase);
        if (!engine) continue;
        const node: TaskNode = {
          id: taskId + ':' + phase,
          parentTaskId: null,
          kind: kindForPhase(phase),
          title: spec.label,
          description: '',
          status: 'running',
          startedAt: Date.now(),
          finishedAt: null,
          dependsOn: [],
          output: {},
          error: null,
        };
        graph.nodes.push(node);
        const result = await engine.run(
          { prompt: trimmed, systemContext: options.systemContext },
          ctx,
        );
        node.finishedAt = Date.now();
        if (result.ok && result.data !== null) {
          node.status = 'success';
          node.output = result.data as Record<string, unknown>;
          ctx.setPhaseOutput(phase, result.data);
        } else {
          node.status = 'failed';
          node.error = result.error;
        }
      }
      this.transition('idle', 'Plan ready.', taskId);
      return graph;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.fail('Plan failed: ' + msg, taskId);
      throw e;
    }
  }
}
