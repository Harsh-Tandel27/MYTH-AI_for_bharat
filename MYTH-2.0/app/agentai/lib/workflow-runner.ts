import { type Node, type Edge } from '@xyflow/react';
import { type ExecutionContext, getMockOutput } from './node-schemas';
import { resolveVariables } from './variable-resolver';
import { type LogEntry } from './execution-engine';

export type NodeExecutionStatus = 'pending' | 'executing' | 'success' | 'error';

export interface ExecutionStep {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: number;
  endTime?: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface WorkflowRunnerCallbacks {
  onLog: (log: LogEntry) => void;
  onNodeStateChange: (nodeId: string, state: 'executing' | 'success' | 'error' | 'idle') => void;
  onContextUpdate: (context: ExecutionContext) => void;
}

/**
 * WorkflowRunner - Handles real workflow execution
 * 
 * Features:
 * - Topological sort for proper node ordering
 * - Real data passing between nodes
 * - Error handling with node highlighting
 * - Real-time log streaming
 */
export class WorkflowRunner {
  private nodes: Node[];
  private edges: Edge[];
  private callbacks: WorkflowRunnerCallbacks;
  private context: ExecutionContext = {};
  private nodeVariableIds: Map<string, string> = new Map();
  private baseUrl: string;

  constructor(
    nodes: Node[], 
    edges: Edge[], 
    callbacks: WorkflowRunnerCallbacks,
    baseUrl: string = ''
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.callbacks = callbacks;
    this.baseUrl = baseUrl;
  }

  /**
   * Build a dependency graph from edges
   */
  private buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    // Initialize all nodes
    for (const node of this.nodes) {
      graph.set(node.id, []);
    }
    
    // Add dependencies (edges go from source -> target, so target depends on source)
    for (const edge of this.edges) {
      const deps = graph.get(edge.target) || [];
      deps.push(edge.source);
      graph.set(edge.target, deps);
    }
    
    return graph;
  }

  /**
   * Topological sort - returns nodes in execution order
   */
  private topologicalSort(): Node[] {
    const graph = this.buildDependencyGraph();
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const deps = graph.get(nodeId) || [];
      for (const dep of deps) {
        visit(dep);
      }
      result.push(nodeId);
    };

    for (const node of this.nodes) {
      visit(node.id);
    }

    return result.map((id) => this.nodes.find((n) => n.id === id)!).filter(Boolean);
  }

  /**
   * Get friendly variable ID for a node
   */
  private getVariableId(node: Node): string {
    const nodeData = node.data as any;
    const nodeType = nodeData?.nodeType || node.type || 'node';
    
    const typeMap: Record<string, string> = {
      webhookTrigger: 'trigger',
      trigger: 'trigger',
      aiLogic: 'ai',
      ai: 'ai',
      emailAction: 'email',
      databaseAction: 'db',
      slackAction: 'slack',
      action: 'action',
    };
    
    const baseName = typeMap[nodeType] || nodeType;
    
    // Count existing nodes of this type
    let count = 0;
    for (const [, varId] of this.nodeVariableIds) {
      if (varId.startsWith(baseName)) count++;
    }
    
    const varId = baseName === 'trigger' ? 'trigger' : `${baseName}_${count + 1}`;
    this.nodeVariableIds.set(node.id, varId);
    return varId;
  }

  /**
   * Log a message
   */
  private log(type: LogEntry['type'], message: string, nodeId?: string, data?: Record<string, unknown>) {
    this.callbacks.onLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      nodeId,
      message,
      data,
    });
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: Node): Promise<Record<string, unknown>> {
    const nodeData = node.data as any;
    const nodeType = nodeData?.nodeType || node.type || 'unknown';
    const label = nodeData?.label || 'Node';
    const config = nodeData?.config || {};
    const variableId = this.getVariableId(node);

    const startTime = performance.now();
    this.callbacks.onNodeStateChange(node.id, 'executing');
    this.log('system', `Executing: ${label}...`, node.id);

    try {
      let output: Record<string, unknown>;

      switch (nodeType) {
        case 'webhookTrigger':
        case 'trigger':
          // Trigger provides initial data
          output = getMockOutput('webhookTrigger') as Record<string, unknown>;
          break;

        case 'textInput':
          // User's custom text input
          output = {
            text: config.text || '',
            message: config.text || '',
            body: { message: config.text || '' },
            timestamp: new Date().toISOString(),
          };
          break;

        case 'aiLogic':
        case 'ai':
          // Call real Gemini API
          output = await this.executeGeminiNode(config);
          break;

        case 'emailAction':
          // Call real email API
          output = await this.executeEmailNode(config);
          break;

        case 'slackAction':
          // Call real Slack API
          output = await this.executeSlackNode(config);
          break;

        case 'databaseAction':
          // Call real MongoDB API
          output = await this.executeMongoDBNode(config);
          break;

        case 'semanticRouter':
          // Call semantic router API
          output = await this.executeRouterNode(config);
          break;

        case 'codeNode':
          // Execute custom JavaScript code
          output = await this.executeCodeNode(config);
          break;

        case 'httpRequest':
          // Make HTTP request
          output = await this.executeHttpNode(config);
          break;

        default:
          output = { result: 'success', timestamp: new Date().toISOString() };
      }

      // Store in context
      this.context[variableId] = output;
      this.callbacks.onContextUpdate({ ...this.context });

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      this.callbacks.onNodeStateChange(node.id, 'success');
      this.log('success', `${label} completed in ${duration}s`, node.id);
      this.log('data', `Output → {{${variableId}}}`, node.id, output);

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onNodeStateChange(node.id, 'error');
      this.log('error', `${label} failed: ${errorMessage}`, node.id);
      throw error;
    }
  }

  /**
   * Execute Gemini AI node
   */
  private async executeGeminiNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    const prompt = config.prompt || 'Hello';
    const systemInstruction = config.systemInstruction || '';
    const model = config.model || 'gemini-3-pro-preview';
    const temperature = config.temperature || '0.7';
    const jsonMode = config.jsonMode === 'true';

    // Resolve variables in prompt and system instruction
    const resolvedPrompt = resolveVariables(prompt, this.context);
    const resolvedSystem = systemInstruction ? resolveVariables(systemInstruction, this.context) : undefined;

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: resolvedPrompt, 
        systemInstruction: resolvedSystem,
        model, 
        temperature: parseFloat(temperature),
        jsonMode,
        context: this.context,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gemini execution failed');
    
    return data.output;
  }

  /**
   * Execute Email node via Resend
   */
  private async executeEmailNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    const to = resolveVariables(config.to || 'user@example.com', this.context);
    const subject = resolveVariables(config.subject || 'Notification', this.context);
    const message = resolveVariables(config.message || '', this.context);

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html: message || `<p>${subject}</p>` }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Email send failed');
    
    return data.output;
  }

  /**
   * Execute Slack node
   */
  private async executeSlackNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    const channel = resolveVariables(config.channel || '#general', this.context);
    const message = resolveVariables(config.message || 'Hello from workflow!', this.context);

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/slack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Slack send failed');
    
    return data.output;
  }

  /**
   * Execute MongoDB node
   */
  private async executeMongoDBNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    console.log('[MongoDB Runner] Raw config received:', JSON.stringify(config, null, 2));
    
    const uri = config.connectionUri;
    const dbName = config.dbName;
    const collection = config.collection;
    const operation = config.operation || 'find';
    const query = config.query || '{}';
    const data = config.data || '{}';

    if (!uri || !dbName || !collection) {
      throw new Error('MongoDB requires: Connection URI, Database, and Collection');
    }

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/mongodb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri,
        dbName,
        collectionName: collection,
        operation,
        query,
        data,
        context: this.context,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'MongoDB operation failed');
    
    return result.output;
  }

  /**
   * Execute Semantic Router node
   */
  private async executeRouterNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    const condition = config.condition || 'If true';

    // Build data context from all previous node outputs
    const dataContext = { ...this.context };

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition,
        data: dataContext,
        context: this.context,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Router evaluation failed');
    
    // Log the routing decision
    const decision = result.output.result ? 'TRUE' : 'FALSE';
    this.log('info', `Router decision: ${decision} (${result.output.reasoning})`);
    
    return result.output;
  }

  /**
   * Execute Code Node
   */
  private async executeCodeNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    const code = config.code || 'return { result: "No code provided" };';
    
    this.log('info', 'Executing custom JavaScript code...');

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        context: this.context,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      this.log('error', `Code execution error: ${result.error}`);
    }
    
    return result.output || { error: result.error };
  }

  /**
   * Execute HTTP Request Node
   */
  private async executeHttpNode(config: Record<string, string>): Promise<Record<string, unknown>> {
    const { method, url, headers, body, authType, authValue } = config;
    
    this.log('info', `Making ${method || 'GET'} request to ${url?.substring(0, 50)}...`);

    const response = await fetch(`${this.baseUrl}/api/agentai/execute/http`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: method || 'GET',
        url,
        headers,
        body,
        authType: authType !== 'none' ? authType : undefined,
        authValue,
        context: this.context,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      this.log('error', `HTTP request failed: ${result.error}`);
    }
    
    return result.output || { error: result.error };
  }

  /**
   * Get nodes reachable from a specific router output handle
   */
  private getNodesFromRouterHandle(routerNodeId: string, handleId: string): Set<string> {
    const reachable = new Set<string>();
    
    // Find edges that start from this router with the specific handle
    const startEdges = this.edges.filter(
      e => e.source === routerNodeId && (e.sourceHandle === handleId || (!e.sourceHandle && handleId === 'true'))
    );
    
    // BFS to find all reachable nodes from those edges
    const queue = startEdges.map(e => e.target);
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      
      // Find outgoing edges from this node
      const outgoing = this.edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
    
    return reachable;
  }

  /**
   * Run the entire workflow with conditional branching support
   */
  async run(): Promise<{ success: boolean; context: ExecutionContext }> {
    this.context = {};
    this.nodeVariableIds.clear();

    this.log('info', '─── Workflow Execution Started ───');

    // Get nodes in topological order
    const orderedNodes = this.topologicalSort();
    this.log('info', `Executing ${orderedNodes.length} nodes in order`);

    // Track which nodes to skip based on router decisions
    const nodesToSkip = new Set<string>();
    const routerResults = new Map<string, boolean>(); // routerId -> result (true/false)

    try {
      for (const node of orderedNodes) {
        // Skip if this node is on the wrong branch of a router
        if (nodesToSkip.has(node.id)) {
          this.log('info', `Skipping ${node.data?.label || node.id} (router branch not taken)`);
          continue;
        }

        const output = await this.executeNode(node);
        
        // Check if this was a semantic router node
        const nodeType = (node.data as any)?.nodeType;
        if (nodeType === 'semanticRouter' && output) {
          const routerResult = Boolean(output.result);
          routerResults.set(node.id, routerResult);
          
          // Determine which handle was NOT taken
          const notTakenHandle = routerResult ? 'false' : 'true';
          
          // Get all nodes reachable ONLY from the not-taken handle
          const nodesFromNotTaken = this.getNodesFromRouterHandle(node.id, notTakenHandle);
          const nodesFromTaken = this.getNodesFromRouterHandle(node.id, routerResult ? 'true' : 'false');
          
          // Skip nodes that are ONLY reachable from the not-taken path
          for (const skipNodeId of nodesFromNotTaken) {
            // Don't skip if also reachable from the taken path
            if (!nodesFromTaken.has(skipNodeId)) {
              nodesToSkip.add(skipNodeId);
            }
          }
          
          this.log('info', `Router decision: ${routerResult ? 'TRUE' : 'FALSE'} → skipping ${nodesToSkip.size} nodes`);
        }
        
        // Small delay between nodes for visual effect
        await new Promise((r) => setTimeout(r, 300));
      }

      this.log('info', `Available variables: ${Object.keys(this.context).map((k) => `{{${k}}}`).join(', ')}`);
      this.log('info', '─── Workflow Execution Complete ───');

      // Reset all nodes to idle after a delay
      setTimeout(() => {
        for (const node of this.nodes) {
          this.callbacks.onNodeStateChange(node.id, 'idle');
        }
      }, 1500);

      return { success: true, context: this.context };

    } catch (error) {
      this.log('error', `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.log('info', '─── Workflow Execution Failed ───');
      return { success: false, context: this.context };
    }
  }
}
