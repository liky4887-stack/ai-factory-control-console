// The Master Brain. Turns a user prompt into an executed task graph.
//
// Flow:
//   submit(prompt)
//     → emit understand
//     → build DAG (understand → plan → generate)
//     → run each node, emitting activity events
//     → state transitions emitted to subscribers
//
// Today, phases run against ModelAgentRegistry (real LLM calls).
// Audit/Diff/Simulate/Deploy/Heal/Evolution are added in later phases
// as additional DAG nodes. This class is the single place where a
// new phase becomes part of the standard pipeline.

import { activityLog } from './ActivityLog';
import { ModelAgentRegistry } from './ModelAgentRegistry';
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
  /** Optional initial snapshot overrides. */
  initial?: Partial<OrchestratorSnapshot>;
}

export interface SubmitOptions {
  taskId?: string;
  /** Preferred engine order for this request. */
  enginePreference?: string[];
  /** Called as each node completes. */
  onProgress?: (graph: TaskGraph) => void;
}

let nextTaskNum = 1;

function makeTaskId(): string {
  return 'task_' + Date.now().toString(36) + '_' + (nextTaskNum++).toString(36);
}

function makeNodeId(taskId: string, kind: TaskKind): string {
  return taskId + ':' + kind + ':' + Math.random().toString(36).slice(2, 6);
}

export class CognitiveOrchestrator {
  private snapshot: OrchestratorSnapshot;
  private listeners = new Set<StateListener>();
  private registry: ModelAgentRegistry;

  constructor(deps: OrchestratorDeps) {
    this.registry = deps.registry;
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
      try { l(this.snapshot); } catch { /* swallow */ }
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
      try { l(this.snapshot); } catch { /* swallow */ }
    }
  }

  /**
   * Build the DAG for a prompt.
   * Today: understand → plan → generate.
   * Later phases append audit/diff/simulate/deploy/monitor/heal nodes here,
   * without changing any caller.
   */
  private buildGraph(taskId: string, prompt: string): TaskGraph {
    const understand: TaskNode = {
      id: makeNodeId(taskId, 'understand'),
      parentTaskId: null,
      kind: 'understand',
      title: 'Understand request',
      description: prompt,
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      dependsOn: [],
      output: {},
      error: null,
    };
    const plan: TaskNode = {
      id: makeNodeId(taskId, 'plan'),
      parentTaskId: understand.id,
      kind: 'plan',
      title: 'Draft execution plan',
      description: 'Break the request into concrete steps.',
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      dependsOn: [understand.id],
      output: {},
      error: null,
    };
    const generate: TaskNode = {
      id: makeNodeId(taskId, 'generate'),
      parentTaskId: plan.id,
      kind: 'generate',
      title: 'Produce output',
      description: 'Answer or code the request.',
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      dependsOn: [plan.id],
      output: {},
      error: null,
    };
    return {
      id: taskId,
      rootPrompt: prompt,
      createdAt: Date.now(),
      nodes: [understand, plan, generate],
    };
  }

  private async runNode(
    graph: TaskGraph,
    node: TaskNode,
    ctx: {
      prompt: string;
      plan?: string;
      onProgress?: (g: TaskGraph) => void;
      enginePreference?: string[];
    },
  ): Promise<void> {
    node.status = 'running';
    node.startedAt = Date.now();
    ctx.onProgress?.(graph);

    activityLog.emit({
      source: node.kind === 'generate' ? 'CodeGen' : 'Planning',
      phase: node.kind,
      status: 'start',
      message: node.title,
      taskId: graph.id,
    });

    try {
      let userContent = '';
      if (node.kind === 'understand') {
        userContent =
          'Restate the following request in one sentence, in the form: ' +
          '"The user wants X." No other text.\n\nREQUEST:\n' + ctx.prompt;
      } else if (node.kind === 'plan') {
        userContent =
          'Create a numbered plan (max 6 steps, short one-line steps) to fulfil ' +
          'this request. No preamble, no code.\n\nREQUEST:\n' + ctx.prompt;
      } else {
        userContent =
          'Produce the final answer for this request. Be concise.\n\nREQUEST:\n' +
          ctx.prompt + (ctx.plan ? '\n\nFOLLOW THIS PLAN:\n' + ctx.plan : '');
      }

      const resp = await this.registry.callWithFallback({
        messages: [{ role: 'user', content: userContent }],
        taskId: graph.id,
        enginePreference: ctx.enginePreference,
      });

      node.status = 'success';
      node.finishedAt = Date.now();
      node.output = {
        content: resp.content,
        engineId: resp.engineId,
        engineLabel: resp.engineLabel,
        fellBack: resp.fellBack,
        elapsedMs: resp.elapsedMs,
      };

      if (node.kind === 'plan') ctx.plan = resp.content;

      activityLog.emit({
        source: node.kind === 'generate' ? 'CodeGen' : 'Planning',
        phase: node.kind,
        status: 'success',
        message: node.title + ' — done in ' + resp.elapsedMs + 'ms',
        taskId: graph.id,
        metadata: {
          engineId: resp.engineId,
          fellBack: resp.fellBack,
          chars: resp.content.length,
        },
      });
    } catch (e) {
      node.status = 'failed';
      node.finishedAt = Date.now();
      node.error = e instanceof Error ? e.message : String(e);
      activityLog.emit({
        source: node.kind === 'generate' ? 'CodeGen' : 'Planning',
        phase: node.kind,
        status: 'error',
        message: node.title + ' — ' + node.error,
        taskId: graph.id,
      });
      throw e;
    } finally {
      ctx.onProgress?.(graph);
    }
  }

  /**
   * Full pipeline for a prompt. Returns the final task graph.
   * The orchestrator publishes state transitions throughout; the UI
   * simply renders the orchestrator snapshot plus the ActivityLog feed.
   */
  async submit(prompt: string, options: SubmitOptions = {}): Promise<TaskGraph> {
    const taskId = options.taskId || makeTaskId();
    const trimmed = prompt.trim();
    if (!trimmed) {
      this.fail('empty prompt', taskId);
      throw new Error('empty prompt');
    }

    this.transition('understand', 'Reading the request...', taskId);
    const graph = this.buildGraph(taskId, trimmed);
    const ctx = {
      prompt: trimmed,
      onProgress: options.onProgress,
      enginePreference: options.enginePreference,
    } as {
      prompt: string;
      plan?: string;
      onProgress?: (g: TaskGraph) => void;
      enginePreference?: string[];
    };

    try {
      // Phase: understand
      await this.runNode(graph, graph.nodes[0], ctx);

      // Phase: plan
      this.transition('plan', 'Drafting a plan...', taskId);
      await this.runNode(graph, graph.nodes[1], ctx);

      // Phase: generate
      this.transition('generate', 'Producing output...', taskId);
      await this.runNode(graph, graph.nodes[2], ctx);

      this.transition('idle', 'Task complete.', taskId);
      return graph;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.fail('Pipeline failed: ' + msg, taskId);
      throw e;
    }
  }
}
