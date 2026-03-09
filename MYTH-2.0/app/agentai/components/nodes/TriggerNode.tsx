'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, MessageSquare } from 'lucide-react';
import { useWorkflowStore, type NodeExecutionState } from '../../lib/workflow-store';

export interface TriggerNodeData {
    label?: string;
    description?: string;
    nodeType?: string;
}

const TriggerNode = memo(({ data, selected, id }: NodeProps) => {
    const nodeData = data as TriggerNodeData;
    const executionState = useWorkflowStore((state) => state.nodeExecutionStates[id] || 'idle');
    const isTextInput = nodeData.nodeType === 'textInput';

    const getBorderStyle = (state: NodeExecutionState, isSelected: boolean) => {
        if (state === 'executing') {
            return {
                border: '2px solid #3b82f6',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            };
        }
        if (state === 'success') {
            return {
                border: '2px solid #22c55e',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
            };
        }
        return {
            border: '1px solid #262626',
            boxShadow: isSelected ? '0 0 20px rgba(34, 197, 94, 0.2)' : 'none',
        };
    };

    const borderStyle = getBorderStyle(executionState, selected || false);

    // Choose icon based on nodeType
    const Icon = isTextInput ? MessageSquare : Zap;
    const iconBgClass = executionState === 'executing' ? 'bg-blue-500/30' : (isTextInput ? 'bg-cyan-500/20' : 'bg-green-500/20');
    const iconTextClass = executionState === 'executing' ? 'text-blue-400 animate-pulse' : (isTextInput ? 'text-cyan-400' : 'text-green-400');
    const badgeBgClass = executionState === 'executing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : (isTextInput ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30');

    return (
        <div
            className={`
        min-w-[220px] rounded-xl overflow-hidden
        transition-all duration-300
        ${selected ? 'ring-2 ring-green-500/50' : ''}
      `}
            style={{
                background: 'rgba(17, 17, 17, 0.8)',
                backdropFilter: 'blur(12px)',
                ...borderStyle,
            }}
        >
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid #262626' }}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${iconBgClass}`}>
                        <Icon className={`w-4 h-4 transition-colors duration-300 ${iconTextClass}`} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white">
                            {nodeData.label || (isTextInput ? 'Text Input' : 'Trigger')}
                        </div>
                    </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors duration-300 ${badgeBgClass}`}>
                    {executionState === 'executing' ? 'Running' : 'Start'}
                </span>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
                <p className="text-xs text-gray-500">
                    {nodeData.description || (isTextInput ? 'Manual text for testing' : 'Workflow entry point')}
                </p>
            </div>

            {/* n8n Style Output Handle - On the RIGHT side */}
            <Handle
                type="source"
                position={Position.Right}
                style={{
                    width: '20px',
                    height: '40px',
                    borderRadius: '0 8px 8px 0',
                    background: '#22c55e',
                    border: '2px solid #16a34a',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'crosshair',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                }}
            />
        </div>
    );
});

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode;
