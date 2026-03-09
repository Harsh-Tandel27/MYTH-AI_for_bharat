// Node Output Schema Types
// Defines the data structure each node type outputs during execution

export interface WebhookTriggerOutput {
  body: Record<string, unknown>;
  query: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  timestamp: string;
}

export interface AILogicOutput {
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: string;
}

export interface EmailActionOutput {
  sent: boolean;
  to: string;
  subject: string;
  messageId: string;
  timestamp: string;
}

export interface SlackActionOutput {
  sent: boolean;
  channel: string;
  messageTs: string;
  timestamp: string;
}

export interface DatabaseActionOutput {
  success: boolean;
  operation: 'insert' | 'update' | 'delete' | 'find';
  collection: string;
  affectedCount: number;
  data: Record<string, unknown>;
  timestamp: string;
}

// Union type for all possible node outputs
export type NodeOutput = 
  | WebhookTriggerOutput 
  | AILogicOutput 
  | EmailActionOutput 
  | SlackActionOutput 
  | DatabaseActionOutput
  | Record<string, unknown>;

// Map node types to their output types
export type NodeOutputMap = {
  webhookTrigger: WebhookTriggerOutput;
  aiLogic: AILogicOutput;
  emailAction: EmailActionOutput;
  slackAction: SlackActionOutput;
  databaseAction: DatabaseActionOutput;
};

// Default/mock output generators for simulation
export function getMockOutput(nodeType: string): NodeOutput {
  const timestamp = new Date().toISOString();
  
  switch (nodeType) {
    case 'webhookTrigger':
      return {
        body: { 
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Hello from webhook!'
        },
        query: { source: 'api', version: 'v1' },
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        timestamp,
      } as WebhookTriggerOutput;
      
    case 'aiLogic':
      return {
        text: 'This is a simulated AI response analyzing the incoming data and generating insights.',
        model: 'gemini-3-pro-preview',
        usage: {
          promptTokens: 150,
          completionTokens: 80,
          totalTokens: 230,
        },
        timestamp,
      } as AILogicOutput;
      
    case 'emailAction':
      return {
        sent: true,
        to: 'user@example.com',
        subject: 'Notification',
        messageId: `msg_${Date.now()}`,
        timestamp,
      } as EmailActionOutput;
      
    case 'slackAction':
      return {
        sent: true,
        channel: '#general',
        messageTs: `${Date.now()}.000001`,
        timestamp,
      } as SlackActionOutput;
      
    case 'databaseAction':
      return {
        success: true,
        operation: 'insert',
        collection: 'records',
        affectedCount: 1,
        data: { _id: `doc_${Date.now()}` },
        timestamp,
      } as DatabaseActionOutput;
      
    default:
      return { result: 'success', timestamp };
  }
}

// Execution context stores all node outputs
export interface ExecutionContext {
  [nodeId: string]: NodeOutput;
}
