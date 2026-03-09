'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Mail, Database, MessageSquare, Settings } from 'lucide-react';
import { useWorkflowStore, type NodeExecutionState } from '../../lib/workflow-store';

export interface ActionNodeData {
    label?: string;
    description?: string;
    nodeType?: string;
    config?: Record<string, string>;
}

// Icon mapping for different action types
const getActionIcon = (nodeType?: string, isExecuting?: boolean) => {
    const baseClass = `w-4 h-4 transition-colors duration-300 ${isExecuting ? 'text-blue-400 animate-pulse' : ''}`;
    switch (nodeType) {
        case 'emailAction':
            return <Mail className={isExecuting ? baseClass : 'w-4 h-4 text-red-400'} />;
        case 'databaseAction':
            return <Database className={isExecuting ? baseClass : 'w-4 h-4 text-amber-400'} />;
        case 'slackAction':
            return <MessageSquare className={isExecuting ? baseClass : 'w-4 h-4 text-cyan-400'} />;
        default:
            return <Settings className={isExecuting ? baseClass : 'w-4 h-4 text-gray-400'} />;
    }
};

const ActionNode = memo(({ data, selected, id }: NodeProps) => {
    const nodeData = data as ActionNodeData;
    const executionState = useWorkflowStore((state) => state.nodeExecutionStates[id] || 'idle');
    const isExecuting = executionState === 'executing';
    const isSuccess = executionState === 'success';

    // Default config for different action types
    const defaultConfig: Record<string, Record<string, string>> = {
        emailAction: { To: 'user@example.com', Subject: 'Notification' },
        databaseAction: { Collection: 'users', Operation: 'insert' },
        slackAction: { Channel: '#general', Message: 'Alert' },
    };

    const config = nodeData.config || defaultConfig[nodeData.nodeType || ''] || {};

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
        };
    };

    return (
        <div
            className={`
        min-w-[240px] rounded-xl overflow-hidden
        transition-all duration-300
        ${selected && !isExecuting && !isSuccess ? 'ring-2 ring-gray-500/50 shadow-lg' : ''}
      `}
            style={{
                background: 'rgba(17, 17, 17, 0.8)',
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
                style={{ borderBottom: '1px solid #262626' }}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${isExecuting ? 'bg-blue-500/30' : 'bg-gray-500/20'
                    }`}>
                    {getActionIcon(nodeData.nodeType, isExecuting)}
                </div>
                <div>
                    <div className="text-sm font-medium text-white">
                        {nodeData.label || 'Action'}
                    </div>
                    <div className="text-xs text-gray-500">
                        {nodeData.description || 'Performs an action'}
                    </div>
                </div>
            </div>

            {/* Configuration Section */}
            <div className="px-4 py-3">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Configuration
                </div>
                <div className="space-y-1.5">
                    {Object.entries(config).slice(0, 2).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{key}</span>
                            <span className="text-gray-400 font-mono bg-black/30 px-1.5 py-0.5 rounded">
                                {value}
                            </span>
                        </div>
                    ))}
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

ActionNode.displayName = 'ActionNode';

export default ActionNode;
