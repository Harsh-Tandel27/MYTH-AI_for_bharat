'use client';

import { useCallback, useState, useEffect, useRef, type DragEvent } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useReactFlow,
    type OnConnect,
    type NodeTypes,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriggerNode, ActionNode, AINode, RouterNode, CodeNode } from './nodes';
import { useWorkflowStore } from '../lib/workflow-store';
import ExecutionTerminal from './ExecutionTerminal';
import NodeConfigPanel from './NodeConfigPanel';
import NodeLibrary, { NODE_DEFINITIONS } from './NodeLibrary';
import { getLayoutedElements } from '../lib/auto-layout';
import {
    FolderOpen, Plus, Save, Play, Trash2, ChevronDown, Square,
    Wand2, Undo2, Redo2, Library, MessageSquare, Home
} from 'lucide-react';
import Link from 'next/link';

// Define custom node types
const nodeTypes: NodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    ai: AINode,
    router: RouterNode,
    code: CodeNode,
} as NodeTypes;

// Default edge options for Vercel-dark theme
const defaultEdgeOptions = {
    style: { stroke: '#444444', strokeWidth: 1.5 },
    markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: '#444444',
    },
    animated: false,
};

type SidebarTab = 'prompt' | 'nodes';

export default function WorkflowCanvas() {
    const [promptInput, setPromptInput] = useState('');
    const [showWorkflows, setShowWorkflows] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('nodes');
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // Get state and actions from Zustand store
    const {
        nodes,
        edges,
        workflowId,
        workflowName,
        isGenerating,
        isSaving,
        isLoading,
        isRunning,
        error,
        savedWorkflows,
        executionLogs,
        showTerminal,
        onNodesChange,
        onEdgesChange,
        setEdges,
        setNodes,
        addNode,
        clearCanvas,
        generateWorkflow,
        setError,
        setWorkflowName,
        saveWorkflow,
        loadWorkflow,
        fetchWorkflows,
        newWorkflow,
        runWorkflow,
        setShowTerminal,
        selectedNodeId,
        setSelectedNodeId,
        updateNodeData,
    } = useWorkflowStore();

    // Get selected node
    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

    // Get upstream nodes for variable picker
    const getUpstreamNodes = (nodeId: string): typeof nodes => {
        const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
        return nodeIndex > 0 ? nodes.slice(0, nodeIndex) : [];
    };

    // Fetch workflows on mount
    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete/Backspace to remove selected nodes or edges
            if ((e.key === 'Delete' || e.key === 'Backspace')) {
                if (document.activeElement?.tagName !== 'INPUT' &&
                    document.activeElement?.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    // Delete selected node
                    if (selectedNodeId) {
                        setNodes(nodes.filter((n) => n.id !== selectedNodeId));
                        // Also remove edges connected to the deleted node
                        setEdges(edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
                        setSelectedNodeId(null);
                    }
                    // Delete selected edge
                    if (selectedEdgeId) {
                        setEdges(edges.filter((e) => e.id !== selectedEdgeId));
                        setSelectedEdgeId(null);
                    }
                }
            }

            // Ctrl/Cmd + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveWorkflow();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeId, selectedEdgeId, nodes, edges, setNodes, setEdges, setSelectedNodeId, saveWorkflow]);

    // Handle edge click for selection
    const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
        setSelectedEdgeId(edge.id);
        setSelectedNodeId(null); // Deselect node when selecting edge
    }, [setSelectedNodeId]);

    const onConnect: OnConnect = useCallback(
        (params) => setEdges(addEdge(params, edges)),
        [setEdges, edges]
    );

    const handleGenerate = async () => {
        await generateWorkflow(promptInput);
    };

    const handleSave = async () => {
        await saveWorkflow();
    };

    const handleRun = async () => {
        await runWorkflow();
    };

    const handleAutoLayout = () => {
        if (nodes.length === 0) return;
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    // Handle drag-drop from node library
    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();

            const data = event.dataTransfer.getData('application/reactflow');
            if (!data) return;

            const nodeDef = JSON.parse(data);

            // Calculate position relative to the canvas
            const bounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!bounds) return;

            const position = {
                x: event.clientX - bounds.left - 120,
                y: event.clientY - bounds.top - 50,
            };

            const newNode = {
                id: `node-${Date.now()}`,
                type: nodeDef.type,
                position,
                data: {
                    label: nodeDef.label,
                    description: nodeDef.description,
                    nodeType: nodeDef.nodeType,
                },
            };

            addNode(newNode);
        },
        [addNode]
    );

    const handleLoadWorkflow = async (id: string) => {
        await loadWorkflow(id);
        setShowWorkflows(false);
    };

    // Get webhook URL for current workflow
    const webhookUrl = workflowId
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/webhooks/${workflowId}`
        : null;

    return (
        <div className="flex h-full w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Left Sidebar */}
            <div
                className="flex flex-col h-full shrink-0"
                style={{
                    width: '320px',
                    backgroundColor: '#0A0A0A',
                    borderRight: '1px solid #262626',
                }}
            >
                {/* Sidebar Header with Workflow Name */}
                <div className="p-4 border-b border-[#262626]">
                    <div className="flex items-center gap-3 mb-2">
                        <Link
                            href="/"
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-gray-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
                            title="Go to Home"
                        >
                            <Home className="w-4 h-4 text-gray-300" />
                        </Link>
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="text-white text-sm font-medium bg-transparent border-none outline-none focus:ring-1 focus:ring-gray-600 rounded px-1 flex-1"
                            placeholder="Workflow name..."
                        />
                    </div>
                    <p className="text-gray-500 text-xs ml-12">
                        {workflowId ? 'Saved' : 'Unsaved'} • {nodes.length} nodes
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-[#262626]">
                    <button
                        onClick={() => setSidebarTab('nodes')}
                        className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'nodes'
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Library className="w-4 h-4" />
                        Nodes
                    </button>
                    <button
                        onClick={() => setSidebarTab('prompt')}
                        className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'prompt'
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        AI Prompt
                    </button>
                </div>

                {/* Tab Content */}
                {sidebarTab === 'nodes' ? (
                    <NodeLibrary />
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Saved Workflows Dropdown */}
                        <div className="p-4 border-b border-[#262626]">
                            <button
                                onClick={() => setShowWorkflows(!showWorkflows)}
                                className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm text-gray-300 transition-colors hover:bg-[#1a1a1a]"
                                style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4" />
                                    My Workflows
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showWorkflows ? 'rotate-180' : ''}`} />
                            </button>

                            {showWorkflows && (
                                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                                    <button
                                        onClick={newWorkflow}
                                        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Workflow
                                    </button>
                                    {savedWorkflows.map((wf) => (
                                        <button
                                            key={wf.id}
                                            onClick={() => handleLoadWorkflow(wf.id)}
                                            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-colors ${workflowId === wf.id
                                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                                                }`}
                                        >
                                            <span className="truncate">{wf.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Prompt Input */}
                        <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
                            <div>
                                <label className="text-gray-400 text-xs font-medium mb-2 block">
                                    Prompt
                                </label>
                                <textarea
                                    value={promptInput}
                                    onChange={(e) => {
                                        setPromptInput(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder="e.g., Create a mail sending agent..."
                                    className="w-full h-28 p-3 rounded-lg text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
                                    style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                    disabled={isGenerating}
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-xs p-2 rounded bg-red-500/10 border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !promptInput.trim()}
                                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                            >
                                {isGenerating ? 'Generating...' : 'Generate Workflow'}
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={clearCanvas}
                                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                    style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                >
                                    <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                            </div>
                        </div>

                        {/* Webhook URL (if saved) */}
                        {webhookUrl && (
                            <div className="p-4 border-t border-[#262626]">
                                <p className="text-gray-500 text-xs mb-2">Webhook URL</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={webhookUrl}
                                        readOnly
                                        className="flex-1 p-2 rounded text-xs text-gray-400 font-mono truncate"
                                        style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                    />
                                    <button
                                        onClick={() => navigator.clipboard.writeText(webhookUrl)}
                                        className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
                                        style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative" ref={reactFlowWrapper}>
                {/* Top Action Bar */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                        onClick={handleAutoLayout}
                        disabled={nodes.length === 0}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 transition-all hover:bg-[#1a1a1a] hover:text-white disabled:opacity-50 flex items-center gap-2"
                        style={{ backgroundColor: '#000000', border: '1px solid #333333' }}
                        title="Auto-layout nodes"
                    >
                        <Wand2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || nodes.length === 0}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:bg-[#1a1a1a] disabled:opacity-50 flex items-center gap-2"
                        style={{ backgroundColor: '#000000', border: '1px solid #333333' }}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={nodes.length === 0 || isRunning}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2 ${isRunning ? 'bg-blue-500 text-white' : 'bg-white text-black hover:bg-gray-200'
                            }`}
                        style={{ border: isRunning ? '1px solid #3b82f6' : '1px solid #333333' }}
                    >
                        {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isRunning ? 'Running...' : 'Run'}
                    </button>
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <div className="text-white text-sm flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading workflow...
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {nodes.length === 0 && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                        <div className="text-center">
                            <p className="text-gray-600 text-sm">No nodes yet</p>
                            <p className="text-gray-700 text-xs mt-1">Drag nodes from sidebar or use AI prompt</p>
                        </div>
                    </div>
                )}

                {/* React Flow Canvas */}
                <ReactFlow
                    nodes={nodes}
                    edges={edges.map(e => ({
                        ...e,
                        selected: e.id === selectedEdgeId,
                        style: {
                            ...e.style,
                            stroke: e.id === selectedEdgeId ? '#ef4444' : '#444444',
                            strokeWidth: e.id === selectedEdgeId ? 3 : 1.5,
                        },
                    }))}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={(_, node) => {
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                    }}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={() => {
                        setSelectedNodeId(null);
                        setSelectedEdgeId(null);
                    }}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    className="bg-black"
                    style={{ height: showTerminal ? 'calc(100% - 240px)' : '100%' }}
                >
                    <Background color="#333333" gap={20} size={1} />
                    <Controls
                        className="!bg-[#0A0A0A] !border-[#262626] !rounded-lg [&>button]:!bg-[#111] [&>button]:!border-[#262626] [&>button]:!text-gray-400 [&>button:hover]:!bg-[#1a1a1a]"
                    />
                    <MiniMap
                        nodeColor={(node) => {
                            if (node.type === 'trigger') return '#22c55e';
                            if (node.type === 'ai') return '#8b5cf6';
                            return '#444444';
                        }}
                        maskColor="rgba(0, 0, 0, 0.8)"
                        className="!bg-[#0A0A0A] !border-[#262626] !rounded-lg"
                    />
                </ReactFlow>

                {/* Execution Terminal */}
                {showTerminal && (
                    <ExecutionTerminal
                        logs={executionLogs}
                        isRunning={isRunning}
                        onClose={() => setShowTerminal(false)}
                    />
                )}
            </div>

            {/* Right Config Panel */}
            {selectedNode && (
                <NodeConfigPanel
                    selectedNode={selectedNode}
                    availableNodes={getUpstreamNodes(selectedNode.id)}
                    onClose={() => setSelectedNodeId(null)}
                    onUpdateNode={updateNodeData}
                />
            )}
        </div>
    );
}
