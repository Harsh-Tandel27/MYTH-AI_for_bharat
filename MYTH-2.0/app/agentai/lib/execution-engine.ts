import { type Node, type Edge } from '@xyflow/react';
import { getMockOutput, type ExecutionContext, type NodeOutput } from './node-schemas';
import { resolveVariables } from './variable-resolver';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'system' | 'data';
  nodeId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  logs: LogEntry[];
  context: ExecutionContext;
}

// Get the message for each node type
function getNodeExecutionMessage(nodeType: string, label: string): { start: string; end: string } {
  switch (nodeType) {
    case 'webhookTrigger':
      return {
        start: `Triggering webhook: ${label}...`,
        end: `Webhook triggered successfully`,
      };
    case 'aiLogic':
      return {
        start: `AI Agent processing: ${label}...`,
        end: `AI processing complete`,
      };
    case 'emailAction':
      return {
        start: `Sending email: ${label}...`,
        end: `Email sent successfully`,
      };
    case 'databaseAction':
      return {
        start: `Database operation: ${label}...`,
        end: `Database operation complete`,
      };
    case 'slackAction':
      return {
        start: `Sending Slack notification: ${label}...`,
        end: `Slack notification sent`,
      };
    default:
      return {
        start: `Executing: ${label}...`,
        end: `Execution complete`,
      };
  }
}

// Find the starting node (trigger)
export function findTriggerNode(nodes: Node[]): Node | null {
  return nodes.find((node) => 
    node.type === 'trigger' || 
    (node.data as any)?.nodeType === 'webhookTrigger'
  ) || null;
}

// Get the next nodes connected to the current node
export function getNextNodes(currentNodeId: string, edges: Edge[], nodes: Node[]): Node[] {
  const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);
  const nextNodeIds = outgoingEdges.map((edge) => edge.target);
  return nodes.filter((node) => nextNodeIds.includes(node.id));
}

// Create a friendly node ID for variables (e.g., "trigger", "ai_1", "email_1")
function getNodeVariableId(node: Node, nodeCounters: Map<string, number>): string {
  const nodeData = node.data as any;
  const nodeType = nodeData?.nodeType || node.type || 'node';
  
  // Use friendly names for common types
  const typeMap: Record<string, string> = {
    webhookTrigger: 'trigger',
    aiLogic: 'ai',
    emailAction: 'email',
    databaseAction: 'db',
    slackAction: 'slack',
    trigger: 'trigger',
    action: 'action',
  };
  
  const baseName = typeMap[nodeType] || nodeType;
  
  // For trigger, just use "trigger" without number
  if (baseName === 'trigger') {
    return 'trigger';
  }
  
  // For others, add a counter
  const count = (nodeCounters.get(baseName) || 0) + 1;
  nodeCounters.set(baseName, count);
  return `${baseName}_${count}`;
}

// Execute a single node (simulated) and return its output
export async function executeNode(
  node: Node,
  context: ExecutionContext,
  variableId: string,
  onLog: (log: LogEntry) => void,
  onNodeStateChange: (nodeId: string, state: 'executing' | 'success' | 'idle') => void,
  onContextUpdate: (context: ExecutionContext) => void,
): Promise<NodeOutput> {
  const nodeData = node.data as any;
  const nodeType = nodeData?.nodeType || node.type || 'unknown';
  const label = nodeData?.label || 'Node';
  const messages = getNodeExecutionMessage(nodeType, label);

  // Mark node as executing
  onNodeStateChange(node.id, 'executing');

  // Log start message
  onLog({
    id: `log-${Date.now()}-start`,
    timestamp: new Date(),
    type: 'system',
    nodeId: node.id,
    message: messages.start,
  });

  // Simulate execution time (1-2 seconds)
  const executionTime = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, executionTime));

  // Generate mock output for this node type
  const output = getMockOutput(nodeType);
  
  // Store output in context with friendly variable ID
  const updatedContext = {
    ...context,
    [variableId]: output,
  };
  onContextUpdate(updatedContext);

  // Mark node as success
  onNodeStateChange(node.id, 'success');

  // Log success message with output data preview
  onLog({
    id: `log-${Date.now()}-end`,
    timestamp: new Date(),
    type: 'success',
    nodeId: node.id,
    message: messages.end,
  });

  // Log the output data
  onLog({
    id: `log-${Date.now()}-data`,
    timestamp: new Date(),
    type: 'data',
    nodeId: node.id,
    message: `Output → {{${variableId}}}`,
    data: output as Record<string, unknown>,
  });

  // Brief pause to show success state
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Reset to idle
  onNodeStateChange(node.id, 'idle');

  return output;
}

// Execute the entire workflow with data lineage
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  onLog: (log: LogEntry) => void,
  onNodeStateChange: (nodeId: string, state: 'executing' | 'success' | 'idle') => void,
  onContextUpdate?: (context: ExecutionContext) => void,
): Promise<ExecutionResult> {
  const logs: LogEntry[] = [];
  const context: ExecutionContext = {};
  const nodeCounters = new Map<string, number>();
  const nodeVariableIds = new Map<string, string>();
  
  const addLog = (log: LogEntry) => {
    logs.push(log);
    onLog(log);
  };

  const updateContext = (newContext: ExecutionContext) => {
    Object.assign(context, newContext);
    onContextUpdate?.(context);
  };

  // Find trigger node
  const triggerNode = findTriggerNode(nodes);
  
  if (!triggerNode) {
    const errorLog: LogEntry = {
      id: `log-${Date.now()}-error`,
      timestamp: new Date(),
      type: 'error',
      message: 'No trigger node found. Add a trigger node to start the workflow.',
    };
    addLog(errorLog);
    return { success: false, logs, context };
  }

  // Assign variable IDs to all nodes upfront
  for (const node of nodes) {
    const varId = getNodeVariableId(node, nodeCounters);
    nodeVariableIds.set(node.id, varId);
  }
  // Reset counters for actual execution
  nodeCounters.clear();

  // Start execution log
  addLog({
    id: `log-${Date.now()}-init`,
    timestamp: new Date(),
    type: 'info',
    message: '─── Workflow Execution Started ───',
  });

  // Execute nodes recursively
  const visited = new Set<string>();
  const queue: Node[] = [triggerNode];
  // Reset counters for variable IDs
  const execCounters = new Map<string, number>();

  while (queue.length > 0) {
    const currentNode = queue.shift()!;
    
    if (visited.has(currentNode.id)) {
      continue;
    }
    visited.add(currentNode.id);

    // Get variable ID for this node
    const variableId = getNodeVariableId(currentNode, execCounters);

    // Execute current node with context
    await executeNode(
      currentNode,
      context,
      variableId,
      addLog,
      onNodeStateChange,
      updateContext
    );

    // Get and queue next nodes
    const nextNodes = getNextNodes(currentNode.id, edges, nodes);
    queue.push(...nextNodes);
  }

  // End execution log with context summary
  addLog({
    id: `log-${Date.now()}-summary`,
    timestamp: new Date(),
    type: 'info',
    message: `Available variables: ${Object.keys(context).map(k => `{{${k}}}`).join(', ')}`,
  });

  addLog({
    id: `log-${Date.now()}-complete`,
    timestamp: new Date(),
    type: 'info',
    message: '─── Workflow Execution Complete ───',
  });

  return { success: true, logs, context };
}

// Re-export for external use
export type { ExecutionContext } from './node-schemas';
