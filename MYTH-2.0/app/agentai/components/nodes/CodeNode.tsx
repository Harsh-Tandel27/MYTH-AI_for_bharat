'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Code, Settings } from 'lucide-react';
import { useWorkflowStore, type NodeExecutionState } from '../../lib/workflow-store';

interface CodeNodeData {
    label?: string;
    description?: string;
    nodeType?: string;
    config?: Record<string, string>;
}

const CodeNode = memo(({ data, selected, id }: NodeProps) => {
    const nodeData = data as unknown as CodeNodeData;
    const executionState = useWorkflowStore((state) => state.nodeExecutionStates[id] || 'idle');
    const isExecuting = executionState === 'executing';
    const isSuccess = executionState === 'success';

    const getBorderStyle = () => {
        if (isExecuting) {
            return {
                border: '2px solid #3b82f6',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            };
        }
        if (isSuccess) {
            return {
                border: '2px solid #22c55e',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
            };
        }
        return {
            border: '1px solid #262626',
            boxShadow: selected ? '0 0 20px rgba(156, 163, 175, 0.2)' : 'none',
        };
    };

    const borderStyle = getBorderStyle();
    const code = nodeData.config?.code || '';
    const firstLine = code.split('\n')[0]?.substring(0, 30) || 'No code yet...';

    return (
        <div
            className={`min-w-[220px] rounded-xl overflow-hidden transition-all duration-300 ${selected ? 'ring-2 ring-gray-400/50' : ''}`}
            style={{
                background: 'rgba(17, 17, 17, 0.85)',
                backdropFilter: 'blur(12px)',
                ...borderStyle,
            }}
        >
            {/* Input Handle - Left */}
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    width: '20px',
                    height: '40px',
                    borderRadius: '8px 0 0 8px',
                    background: '#6b7280',
                    border: '2px solid #4b5563',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'crosshair',
                    boxShadow: '0 0 8px rgba(107, 114, 128, 0.5)',
                }}
            />

            {/* Header */}
            <div
                className="px-4 py-3 flex items-center gap-3"
                style={{
                    borderBottom: '1px solid #262626',
                    background: isExecuting
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)'
                        : 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, transparent 100%)',
                }}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${isExecuting ? 'bg-blue-500/30' : 'bg-gray-500/20'}`}>
                    <Code className={`w-4 h-4 transition-colors duration-300 ${isExecuting ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
                </div>
                <div>
                    <div className="text-sm font-medium text-white">
                        {nodeData.label || 'Code'}
                    </div>
                    <div className="text-xs text-gray-500">
                        {nodeData.description || 'Run custom JavaScript'}
                    </div>
                </div>
            </div>

            {/* Code Preview */}
            <div className="px-4 py-3">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Code Preview
                </div>
                <div className="font-mono text-xs text-gray-400 bg-black/30 px-2 py-1.5 rounded truncate">
                    {firstLine}...
                </div>
            </div>

            {/* Output Handle - Right */}
            <Handle
                type="source"
                position={Position.Right}
                style={{
                    width: '20px',
                    height: '40px',
                    borderRadius: '0 8px 8px 0',
                    background: '#6b7280',
                    border: '2px solid #4b5563',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'crosshair',
                    boxShadow: '0 0 8px rgba(107, 114, 128, 0.5)',
                }}
            />
        </div>
    );
});

CodeNode.displayName = 'CodeNode';

export default CodeNode;
