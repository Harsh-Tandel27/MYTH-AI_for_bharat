'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Brain, Sparkles } from 'lucide-react';
import { useWorkflowStore, type NodeExecutionState } from '../../lib/workflow-store';

export interface AINodeData {
    label?: string;
    description?: string;
    nodeType?: string;
    model?: string;
}

const AINode = memo(({ data, selected, id }: NodeProps) => {
    const nodeData = data as AINodeData;
    const executionState = useWorkflowStore((state) => state.nodeExecutionStates[id] || 'idle');
    const isExecuting = executionState === 'executing';
    const isSuccess = executionState === 'success';

    const getBorderStyle = () => {
        if (isExecuting) {
            return {
                border: '2px solid #3b82f6',
                boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)',
            };
        }
        if (isSuccess) {
            return {
                border: '2px solid #22c55e',
                boxShadow: '0 0 25px rgba(34, 197, 94, 0.6)',
            };
        }
        return {
            border: '1px solid rgba(168, 162, 158, 0.3)',
            boxShadow: selected ? undefined : '0 0 20px rgba(139, 92, 246, 0.1)',
        };
    };

    return (
        <div
            className={`
        min-w-[240px] rounded-xl overflow-hidden
        transition-all duration-300
        ${selected && !isExecuting && !isSuccess ? 'ring-2 ring-violet-400/50 shadow-lg shadow-violet-500/20' : ''}
      `}
            style={{
                background: 'rgba(17, 17, 17, 0.85)',
                backdropFilter: 'blur(12px)',
                ...getBorderStyle(),
            }}
        >
            {/* n8n Style Input Handle - On the LEFT side */}
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    width: '20px',
                    height: '40px',
                    borderRadius: '8px 0 0 8px',
                    background: '#8b5cf6',
                    border: '2px solid #7c3aed',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'crosshair',
                    boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
                }}
            />

            {/* Header with gradient */}
            <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                    borderBottom: '1px solid rgba(168, 162, 158, 0.2)',
                    background: isExecuting
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, transparent 100%)'
                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-colors duration-300 ${isExecuting ? 'bg-blue-500/30' : 'bg-violet-500/20'
                        }`}>
                        <Brain className={`w-4 h-4 transition-colors duration-300 ${isExecuting ? 'text-blue-400 animate-pulse' : 'text-violet-400'
                            }`} />
                        <Sparkles className={`w-2.5 h-2.5 absolute -top-0.5 -right-0.5 transition-colors duration-300 ${isExecuting ? 'text-blue-300 animate-spin' : 'text-violet-300'
                            }`} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white flex items-center gap-1.5">
                            {nodeData.label || 'AI Agent'}
                        </div>
                    </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors duration-300 ${isExecuting
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                    }`}>
                    {isExecuting ? 'Processing' : 'AI'}
                </span>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
                <p className="text-xs text-gray-500 mb-2">
                    {nodeData.description || 'Processes with LLM intelligence'}
                </p>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Model</span>
                    <span className={`font-mono px-1.5 py-0.5 rounded border transition-colors duration-300 ${isExecuting
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        : 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                        }`}>
                        {nodeData.model || 'gemini-3-pro-preview'}
                    </span>
                </div>
            </div>

            {/* n8n Style Output Handle - On the RIGHT side */}
            <Handle
                type="source"
                position={Position.Right}
                style={{
                    width: '20px',
                    height: '40px',
                    borderRadius: '0 8px 8px 0',
                    background: '#8b5cf6',
                    border: '2px solid #7c3aed',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'crosshair',
                    boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
                }}
            />
        </div>
    );
});

AINode.displayName = 'AINode';

export default AINode;
