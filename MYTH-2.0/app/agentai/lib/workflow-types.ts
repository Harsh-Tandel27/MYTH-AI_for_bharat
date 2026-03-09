// Available node types for the workflow builder
export const NODE_TYPES = {
  WEBHOOK_TRIGGER: 'webhookTrigger',
  AI_LOGIC: 'aiLogic',
  EMAIL_ACTION: 'emailAction',
  DATABASE_ACTION: 'databaseAction',
  SLACK_ACTION: 'slackAction',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

// Node metadata for UI display
export const NODE_METADATA: Record<NodeType, {
  label: string;
  description: string;
  color: string;
  icon: string;
}> = {
  webhookTrigger: {
    label: 'Webhook Trigger',
    description: 'Starts the workflow',
    color: '#22c55e',
    icon: '⚡',
  },
  aiLogic: {
    label: 'AI Logic',
    description: 'Process with LLM',
    color: '#8b5cf6',
    icon: '🧠',
  },
  emailAction: {
    label: 'Email Action',
    description: 'Send via Gmail',
    color: '#ef4444',
    icon: '✉️',
  },
  databaseAction: {
    label: 'Database Action',
    description: 'Store in MongoDB',
    color: '#f59e0b',
    icon: '🗄️',
  },
  slackAction: {
    label: 'Slack Action',
    description: 'Send notification',
    color: '#06b6d4',
    icon: '💬',
  },
};

// Workflow graph schema
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
