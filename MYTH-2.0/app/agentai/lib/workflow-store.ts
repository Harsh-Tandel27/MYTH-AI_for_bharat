import { create } from 'zustand';
import { type Node, type Edge, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange } from '@xyflow/react';
import { executeWorkflow, type LogEntry } from './execution-engine';

export interface SavedWorkflow {
  id: string;
  name: string;
  updatedAt: string;
}

export type NodeExecutionState = 'idle' | 'executing' | 'success';

export interface WorkflowState {
  // Current workflow
  workflowId: string | null;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
  promptHistory: string[];
  
  // UI state
  isGenerating: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  savedWorkflows: SavedWorkflow[];
  
  // Execution state
  isRunning: boolean;
  executionLogs: LogEntry[];
  nodeExecutionStates: Record<string, NodeExecutionState>;
  showTerminal: boolean;
  
  // Selection state
  selectedNodeId: string | null;
  
  // Actions
  setSelectedNodeId: (nodeId: string | null) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  clearCanvas: () => void;
  setError: (error: string | null) => void;
  setWorkflowName: (name: string) => void;
  
  // Workflow operations
  generateWorkflow: (prompt: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  fetchWorkflows: () => Promise<void>;
  newWorkflow: () => void;
  
  // Execution operations
  runWorkflow: () => Promise<void>;
  setNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  addExecutionLog: (log: LogEntry) => void;
  clearExecutionLogs: () => void;
  setShowTerminal: (show: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  workflowId: null,
  workflowName: 'Untitled Workflow',
  nodes: [],
  edges: [],
  promptHistory: [],
  isGenerating: false,
  isSaving: false,
  isLoading: false,
  error: null,
  savedWorkflows: [],
  
  // Execution state
  isRunning: false,
  executionLogs: [],
  nodeExecutionStates: {},
  showTerminal: false,
  
  // Selection state
  selectedNodeId: null,

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  
  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },
  
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },
  
  clearCanvas: () => set({ 
    nodes: [], 
    edges: [], 
    error: null,
    workflowId: null,
    workflowName: 'Untitled Workflow',
    promptHistory: [],
    executionLogs: [],
    nodeExecutionStates: {},
  }),
  
  setError: (error) => set({ error }),
  setWorkflowName: (name) => set({ workflowName: name }),

  newWorkflow: () => {
    set({
      workflowId: null,
      workflowName: 'Untitled Workflow',
      nodes: [],
      edges: [],
      promptHistory: [],
      error: null,
      executionLogs: [],
      nodeExecutionStates: {},
    });
  },

  // Execution actions
  setNodeExecutionState: (nodeId, state) => {
    set((prev) => ({
      nodeExecutionStates: {
        ...prev.nodeExecutionStates,
        [nodeId]: state,
      },
    }));
  },

  addExecutionLog: (log) => {
    set((prev) => ({
      executionLogs: [...prev.executionLogs, log],
    }));
  },

  clearExecutionLogs: () => set({ executionLogs: [], nodeExecutionStates: {} }),
  
  setShowTerminal: (show) => set({ showTerminal: show }),

  runWorkflow: async () => {
    const { nodes, edges, setNodeExecutionState, addExecutionLog, clearExecutionLogs } = get();
    
    if (nodes.length === 0) {
      set({ error: 'No nodes to execute' });
      return;
    }

    // Clear previous logs and show terminal
    clearExecutionLogs();
    set({ isRunning: true, showTerminal: true, error: null });

    try {
      // Import WorkflowRunner dynamically to avoid circular deps
      const { WorkflowRunner } = await import('./workflow-runner');
      
      const runner = new WorkflowRunner(nodes, edges, {
        onLog: addExecutionLog,
        onNodeStateChange: setNodeExecutionState,
        onContextUpdate: () => {}, // Could store context in state if needed
      });

      await runner.run();
    } catch (err) {
      console.error('Execution error:', err);
      set({ error: err instanceof Error ? err.message : 'Execution failed' });
    } finally {
      set({ isRunning: false });
    }
  },

  generateWorkflow: async (prompt: string) => {
    const { setError } = get();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    set({ isGenerating: true, error: null });

    try {
      const response = await fetch('/api/agentai/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workflow');
      }

      if (data.success && data.workflow) {
        const transformedNodes: Node[] = data.workflow.nodes.map((node: any) => {
          // Map node type to React Flow node type
          // New format: type is 'trigger', 'ai', 'action', 'router', 'code'
          // Old format: type is 'webhookTrigger', 'aiLogic', etc.
          let reactFlowType = node.type;
          
          // Handle old format nodeTypes
          if (node.type === 'webhookTrigger' || node.type === 'textInput') {
            reactFlowType = 'trigger';
          } else if (node.type === 'aiLogic') {
            reactFlowType = 'ai';
          } else if (node.type === 'semanticRouter') {
            reactFlowType = 'router';
          } else if (node.type === 'codeNode') {
            reactFlowType = 'code';
          } else if (['emailAction', 'databaseAction', 'slackAction', 'httpRequest'].includes(node.type)) {
            reactFlowType = 'action';
          }
          
          // Use data.nodeType if available, otherwise use original type
          const nodeType = node.data?.nodeType || node.type;

          return {
            id: node.id,
            type: reactFlowType,
            position: node.position,
            data: {
              ...node.data,
              nodeType: nodeType,
            },
          };
        });

        const transformedEdges: Edge[] = data.workflow.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle, // For router true/false handles
        }));

        set((state) => ({
          nodes: transformedNodes,
          edges: transformedEdges,
          promptHistory: [...state.promptHistory, prompt],
          nodeExecutionStates: {},
        }));
      }
    } catch (err) {
      console.error('Generate error:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to generate workflow' });
    } finally {
      set({ isGenerating: false });
    }
  },

  saveWorkflow: async () => {
    const { workflowId, workflowName, nodes, edges, promptHistory } = get();
    
    if (nodes.length === 0) {
      set({ error: 'Nothing to save' });
      return;
    }

    set({ isSaving: true, error: null });

    try {
      const response = await fetch('/api/agentai/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: workflowId,
          name: workflowName,
          flowData: { nodes, edges },
          prompt: promptHistory[promptHistory.length - 1],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save workflow');
      }

      if (data.success) {
        set({ workflowId: data.workflow.id });
        get().fetchWorkflows();
      }
    } catch (err) {
      console.error('Save error:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to save workflow' });
    } finally {
      set({ isSaving: false });
    }
  },

  loadWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/agentai/workflow/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load workflow');
      }

      if (data.success && data.workflow) {
        const { flowData, name, promptHistory } = data.workflow;
        
        set({
          workflowId: id,
          workflowName: name,
          nodes: flowData.nodes || [],
          edges: flowData.edges || [],
          promptHistory: promptHistory || [],
          nodeExecutionStates: {},
          executionLogs: [],
        });
      }
    } catch (err) {
      console.error('Load error:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to load workflow' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkflows: async () => {
    try {
      const response = await fetch('/api/agentai/workflow');
      const data = await response.json();

      if (data.success) {
        set({ savedWorkflows: data.workflows || [] });
      }
    } catch (err) {
      console.error('Fetch workflows error:', err);
    }
  },
}));
