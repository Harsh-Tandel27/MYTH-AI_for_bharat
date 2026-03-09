'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Zap, Brain, Mail, Database, MessageSquare } from 'lucide-react';
import { type Node } from '@xyflow/react';

interface VariableOption {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    path: string;
    fullPath: string;
    displayName: string;
}

interface VariablePickerProps {
    availableNodes: Node[];
    onSelect: (variable: string) => void;
    className?: string;
}

// Get available variables for a node type
function getNodeVariables(nodeType: string): { path: string; displayName: string }[] {
    switch (nodeType) {
        case 'webhookTrigger':
        case 'trigger':
            return [
                { path: 'body', displayName: 'Request Body' },
                { path: 'body.name', displayName: 'Body → Name' },
                { path: 'body.email', displayName: 'Body → Email' },
                { path: 'body.message', displayName: 'Body → Message' },
                { path: 'query', displayName: 'Query Params' },
                { path: 'headers', displayName: 'Headers' },
                { path: 'method', displayName: 'HTTP Method' },
            ];
        case 'aiLogic':
        case 'ai':
            return [
                { path: 'text', displayName: 'AI Response' },
                { path: 'model', displayName: 'Model Used' },
                { path: 'usage.totalTokens', displayName: 'Tokens Used' },
            ];
        case 'emailAction':
            return [
                { path: 'sent', displayName: 'Was Sent' },
                { path: 'to', displayName: 'Recipient' },
                { path: 'subject', displayName: 'Subject' },
                { path: 'messageId', displayName: 'Message ID' },
            ];
        case 'databaseAction':
            return [
                { path: 'success', displayName: 'Success' },
                { path: 'data', displayName: 'Returned Data' },
                { path: 'affectedCount', displayName: 'Affected Count' },
            ];
        case 'slackAction':
            return [
                { path: 'sent', displayName: 'Was Sent' },
                { path: 'channel', displayName: 'Channel' },
                { path: 'messageTs', displayName: 'Message TS' },
            ];
        default:
            return [{ path: 'result', displayName: 'Result' }];
    }
}

// Get friendly node ID
function getNodeVariableId(nodeType: string, index: number): string {
    const typeMap: Record<string, string> = {
        webhookTrigger: 'trigger',
        trigger: 'trigger',
        aiLogic: 'ai',
        ai: 'ai',
        emailAction: 'email',
        databaseAction: 'db',
        slackAction: 'slack',
    };
    const baseName = typeMap[nodeType] || nodeType;
    return baseName === 'trigger' ? 'trigger' : `${baseName}_${index + 1}`;
}

// Get icon for node type
function getNodeIcon(nodeType: string) {
    switch (nodeType) {
        case 'webhookTrigger':
        case 'trigger':
            return <Zap className="w-3.5 h-3.5 text-green-400" />;
        case 'aiLogic':
        case 'ai':
            return <Brain className="w-3.5 h-3.5 text-violet-400" />;
        case 'emailAction':
            return <Mail className="w-3.5 h-3.5 text-red-400" />;
        case 'databaseAction':
            return <Database className="w-3.5 h-3.5 text-amber-400" />;
        case 'slackAction':
            return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
        default:
            return <Database className="w-3.5 h-3.5 text-gray-400" />;
    }
}

const VariablePicker = memo(({ availableNodes, onSelect, className = '' }: VariablePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleNode = (nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const handleSelect = (variable: string) => {
        onSelect(variable);
        setIsOpen(false);
    };

    // Build variable options grouped by node
    const nodeGroups: { node: Node; variableId: string; variables: VariableOption[] }[] = [];
    const typeCounters: Record<string, number> = {};

    for (const node of availableNodes) {
        const nodeData = node.data as any;
        const nodeType = nodeData?.nodeType || node.type || 'unknown';
        const nodeName = nodeData?.label || 'Node';

        // Count for variable ID
        const baseType = nodeType === 'webhookTrigger' ? 'trigger' : nodeType;
        typeCounters[baseType] = (typeCounters[baseType] || 0);
        const variableId = getNodeVariableId(nodeType, typeCounters[baseType]);
        typeCounters[baseType]++;

        const variables = getNodeVariables(nodeType);
        const variableOptions: VariableOption[] = variables.map((v) => ({
            nodeId: node.id,
            nodeName,
            nodeType,
            path: v.path,
            fullPath: `${variableId}.${v.path}`,
            displayName: v.displayName,
        }));

        nodeGroups.push({ node, variableId, variables: variableOptions });
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded hover:bg-violet-500/20 text-violet-400 transition-colors"
                title="Insert variable"
                type="button"
            >
                <Plus className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-y-auto rounded-lg shadow-xl z-50"
                    style={{
                        backgroundColor: '#111111',
                        border: '1px solid #333',
                    }}
                >
                    <div className="p-2 border-b border-[#333]">
                        <span className="text-xs text-gray-400 font-medium">Insert Variable</span>
                    </div>

                    {nodeGroups.length === 0 ? (
                        <div className="p-3 text-gray-500 text-xs">No upstream nodes available</div>
                    ) : (
                        <div className="py-1">
                            {nodeGroups.map(({ node, variableId, variables }) => {
                                const nodeData = node.data as any;
                                const nodeType = nodeData?.nodeType || node.type;
                                const isExpanded = expandedNodes.has(node.id);

                                return (
                                    <div key={node.id}>
                                        <button
                                            onClick={() => toggleNode(node.id)}
                                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors"
                                        >
                                            <ChevronDown
                                                className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                            />
                                            {getNodeIcon(nodeType)}
                                            <span className="text-sm text-gray-300 flex-1 text-left truncate">
                                                {nodeData?.label || 'Node'}
                                            </span>
                                            <span className="text-xs text-gray-600 font-mono">{variableId}</span>
                                        </button>

                                        {isExpanded && (
                                            <div className="pl-6">
                                                {variables.map((v) => (
                                                    <button
                                                        key={v.fullPath}
                                                        onClick={() => handleSelect(`{{${v.fullPath}}}`)}
                                                        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-violet-500/10 transition-colors group"
                                                    >
                                                        <span className="text-xs text-gray-400 group-hover:text-violet-300">
                                                            {v.displayName}
                                                        </span>
                                                        <span className="text-[10px] text-gray-600 font-mono group-hover:text-violet-400">
                                                            {`{{${v.fullPath}}}`}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

VariablePicker.displayName = 'VariablePicker';

export default VariablePicker;
