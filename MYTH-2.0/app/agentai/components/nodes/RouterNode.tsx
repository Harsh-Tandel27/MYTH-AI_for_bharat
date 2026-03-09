'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';

interface RouterNodeData {
    label: string;
    nodeType: string;
    config?: Record<string, string>;
    state?: 'idle' | 'executing' | 'success' | 'error';
    routeResult?: boolean | null;
}

const RouterNode = memo(({ data, selected }: NodeProps) => {
    const nodeData = data as unknown as RouterNodeData;
    const state = nodeData.state || 'idle';
    const routeResult = nodeData.routeResult;

    // Border color based on state
    const getBorderColor = () => {
        if (selected) return '#8b5cf6';
        switch (state) {
            case 'executing': return '#f59e0b';
            case 'success': return '#22c55e';
            case 'error': return '#ef4444';
            default: return '#3f3f46';
        }
    };

    // Glow effect for execution
    const getBoxShadow = () => {
        if (state === 'executing') {
            return '0 0 20px rgba(245, 158, 11, 0.5)';
        }
        if (selected) {
            return '0 0 15px rgba(139, 92, 246, 0.4)';
        }
        return 'none';
    };

    return (
        <div
            style={{
                minWidth: '180px',
                background: 'linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: `2px solid ${getBorderColor()}`,
                borderRadius: '12px',
                boxShadow: getBoxShadow(),
                transition: 'all 0.2s ease',
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
                    background: '#f97316',
                    border: '2px solid #ea580c',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'crosshair',
                    boxShadow: '0 0 8px rgba(249, 115, 22, 0.5)',
                }}
            />

            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderBottom: '1px solid #262626',
                }}
            >
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(249, 115, 22, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <GitBranch style={{ width: '16px', height: '16px', color: '#f97316' }} />
                </div>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
                        {nodeData.label || 'Semantic Router'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                        AI-powered routing
                    </div>
                </div>
            </div>

            {/* Condition Preview */}
            <div style={{ padding: '10px 12px', fontSize: '11px', color: '#a1a1aa' }}>
                {nodeData.config?.condition ? (
                    <span style={{ fontStyle: 'italic' }}>
                        &quot;{nodeData.config.condition.substring(0, 40)}...&quot;
                    </span>
                ) : (
                    <span style={{ color: '#52525b' }}>Configure condition...</span>
                )}
            </div>

            {/* Output Handles - Right Side */}
            <div style={{ position: 'relative', height: '60px' }}>
                {/* TRUE Handle */}
                <div
                    style={{
                        position: 'absolute',
                        right: '0',
                        top: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: routeResult === true ? '#22c55e' : '#52525b',
                        textTransform: 'uppercase',
                    }}>
                        True
                    </span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="true"
                        style={{
                            position: 'relative',
                            transform: 'none',
                            width: '20px',
                            height: '24px',
                            borderRadius: '0 6px 6px 0',
                            background: routeResult === true ? '#22c55e' : '#3f3f46',
                            border: `2px solid ${routeResult === true ? '#16a34a' : '#52525b'}`,
                            right: '-8px',
                            cursor: 'crosshair',
                            boxShadow: routeResult === true ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
                        }}
                    />
                </div>

                {/* FALSE Handle */}
                <div
                    style={{
                        position: 'absolute',
                        right: '0',
                        bottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: routeResult === false ? '#ef4444' : '#52525b',
                        textTransform: 'uppercase',
                    }}>
                        False
                    </span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="false"
                        style={{
                            position: 'relative',
                            transform: 'none',
                            width: '20px',
                            height: '24px',
                            borderRadius: '0 6px 6px 0',
                            background: routeResult === false ? '#ef4444' : '#3f3f46',
                            border: `2px solid ${routeResult === false ? '#dc2626' : '#52525b'}`,
                            right: '-8px',
                            cursor: 'crosshair',
                            boxShadow: routeResult === false ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
                        }}
                    />
                </div>
            </div>

            {/* Route Result Indicator */}
            {routeResult !== null && routeResult !== undefined && (
                <div
                    style={{
                        padding: '8px 12px',
                        borderTop: '1px solid #262626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: routeResult ? '#22c55e' : '#ef4444',
                    }}
                >
                    {routeResult ? (
                        <>
                            <Check style={{ width: '12px', height: '12px' }} />
                            <span>Routed → True</span>
                        </>
                    ) : (
                        <>
                            <X style={{ width: '12px', height: '12px' }} />
                            <span>Routed → False</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

RouterNode.displayName = 'RouterNode';

export default RouterNode;
