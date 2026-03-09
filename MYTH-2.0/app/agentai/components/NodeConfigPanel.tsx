'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { X, Settings, Zap, Brain, Mail, Database, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { type Node } from '@xyflow/react';
import VariablePicker from './VariablePicker';

interface NodeConfigPanelProps {
    selectedNode: Node | null;
    availableNodes: Node[];
    onClose: () => void;
    onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
}

// Get icon for node type
function getNodeIcon(nodeType: string) {
    switch (nodeType) {
        case 'webhookTrigger':
        case 'trigger':
            return <Zap className="w-4 h-4 text-green-400" />;
        case 'aiLogic':
        case 'ai':
            return <Brain className="w-4 h-4 text-violet-400" />;
        case 'emailAction':
            return <Mail className="w-4 h-4 text-red-400" />;
        case 'databaseAction':
            return <Database className="w-4 h-4 text-amber-400" />;
        case 'slackAction':
            return <MessageSquare className="w-4 h-4 text-cyan-400" />;
        default:
            return <Settings className="w-4 h-4 text-gray-400" />;
    }
}

// Field definitions with type
interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'password' | 'select' | 'range' | 'toggle';
    options?: string[];
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
}

// Get config fields for each node type
function getConfigFields(nodeType: string): ConfigField[] {
    switch (nodeType) {
        case 'emailAction':
            return [
                { key: 'to', label: 'To', type: 'text', placeholder: 'recipient@example.com' },
                { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
                { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Email body (HTML supported)' },
            ];
        case 'aiLogic':
        case 'ai':
            return [
                { key: 'systemInstruction', label: 'System Instructions', type: 'textarea', placeholder: 'You are a helpful AI assistant...' },
                { key: 'prompt', label: 'User Prompt', type: 'textarea', placeholder: 'Analyze: {{trigger.body}}' },
                { key: 'model', label: 'Model', type: 'select', options: ['gemini-3-pro-preview'] },
                { key: 'temperature', label: 'Temperature', type: 'range', min: 0, max: 1, step: 0.1 },
                { key: 'jsonMode', label: 'Output as JSON', type: 'toggle' },
            ];
        case 'slackAction':
            return [
                { key: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
                { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Slack message' },
            ];
        case 'databaseAction':
            return [
                { key: 'connectionUri', label: 'Connection URI', type: 'password', placeholder: 'mongodb+srv://...' },
                { key: 'dbName', label: 'Database', type: 'text', placeholder: 'my_database' },
                { key: 'collection', label: 'Collection', type: 'text', placeholder: 'users' },
                { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'findOne', 'insert', 'insertMany', 'update', 'delete'] },
                { key: 'query', label: 'Query / Filter', type: 'textarea', placeholder: '{ "email": "{{trigger.body.email}}" }' },
                { key: 'data', label: 'Data (for insert/update)', type: 'textarea', placeholder: '{ "name": "{{ai_1.text}}" }' },
            ];
        case 'webhookTrigger':
        case 'trigger':
            return [
                { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/webhook' },
                { key: 'method', label: 'Method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
            ];
        case 'textInput':
            return [
                { key: 'text', label: 'Your Text', type: 'textarea', placeholder: 'Enter your custom text here for testing...\n\nExample: I love your product!' },
            ];
        case 'semanticRouter':
            return [
                { key: 'condition', label: 'Condition Logic', type: 'textarea', placeholder: 'If the sentiment is negative...\nIf the price is over $100...\nIf the user is asking about pricing...' },
            ];
        case 'codeNode':
            return [
                { key: 'aiPrompt', label: 'AI Prompt (Generate Code)', type: 'text', placeholder: 'Extract all email addresses from this text' },
                { key: 'code', label: 'JavaScript Code', type: 'textarea', placeholder: '// Your code here\n// Use `input` to access previous node outputs\n// Return an object with your results\n\nconst result = input.ai_1?.text || "No input";\nreturn { processed: result };' },
            ];
        case 'httpRequest':
            return [
                { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/data/{{trigger.body.id}}' },
                { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{\n  "Content-Type": "application/json"\n}' },
                { key: 'body', label: 'Body (JSON)', type: 'textarea', placeholder: '{\n  "data": "{{ai_1.text}}"\n}' },
                { key: 'authType', label: 'Auth Type', type: 'select', options: ['none', 'bearer', 'apiKey', 'basic'] },
                { key: 'authValue', label: 'Auth Value', type: 'password', placeholder: 'Token or API key...' },
            ];
        default:
            return [{ key: 'config', label: 'Configuration', type: 'textarea', placeholder: 'Configuration...' }];
    }
}

// Default values for fields
function getDefaultValues(nodeType: string): Record<string, string> {
    switch (nodeType) {
        case 'emailAction':
            return { to: '', subject: 'Notification', message: '' };
        case 'aiLogic':
        case 'ai':
            return {
                systemInstruction: 'You are a helpful AI assistant.',
                prompt: 'Analyze the following data: {{trigger.body}}',
                model: 'gemini-3-pro-preview',
                temperature: '0.7',
                jsonMode: 'false',
            };
        case 'slackAction':
            return { channel: '#general', message: '' };
        case 'databaseAction':
            return { connectionUri: '', dbName: '', collection: '', operation: 'find', query: '{}', data: '{}' };
        case 'webhookTrigger':
        case 'trigger':
            return { endpoint: '/webhook', method: 'POST' };
        case 'textInput':
            return { text: 'I love your product! Best purchase ever!' };
        case 'semanticRouter':
            return { condition: 'If the sentiment is negative' };
        case 'codeNode':
            return { aiPrompt: '', code: '// Your code here\nconst result = input.ai_1?.text || "No input";\nreturn { processed: result };' };
        case 'httpRequest':
            return { method: 'GET', url: '', headers: '{}', body: '{}', authType: 'none', authValue: '' };
        default:
            return { config: '' };
    }
}

const NodeConfigPanel = memo(({ selectedNode, availableNodes, onClose, onUpdateNode }: NodeConfigPanelProps) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>({});

    // Initialize form data when node changes
    useEffect(() => {
        if (selectedNode) {
            const nodeData = selectedNode.data as any;
            const nodeType = nodeData?.nodeType || selectedNode.type || 'unknown';
            const defaults = getDefaultValues(nodeType);
            const config = nodeData?.config || {};
            setFormData({ ...defaults, ...config });
            setTestStatus('idle');
            setTestMessage('');
        }
    }, [selectedNode?.id]);

    if (!selectedNode) return null;

    const nodeData = selectedNode.data as any;
    const nodeType = nodeData?.nodeType || selectedNode.type || 'unknown';
    const nodeName = nodeData?.label || 'Node';
    const fields = getConfigFields(nodeType);

    // Filter upstream nodes
    const upstreamNodes = availableNodes.filter((n) => n.id !== selectedNode.id);

    const handleFieldChange = (key: string, value: string) => {
        const newData = { ...formData, [key]: value };
        setFormData(newData);
        onUpdateNode(selectedNode.id, { config: newData });
    };

    const handleInsertVariable = (fieldKey: string, variable: string) => {
        const input = inputRefs.current[fieldKey];
        if (input && 'selectionStart' in input) {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentValue = formData[fieldKey] || '';
            const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
            handleFieldChange(fieldKey, newValue);

            setTimeout(() => {
                input.focus();
                const newPos = start + variable.length;
                if ('setSelectionRange' in input) {
                    input.setSelectionRange(newPos, newPos);
                }
            }, 0);
        } else {
            handleFieldChange(fieldKey, (formData[fieldKey] || '') + variable);
        }
    };

    // Test MongoDB Connection
    const handleTestConnection = async () => {
        if (!formData.connectionUri) {
            setTestStatus('error');
            setTestMessage('Enter a connection URI first');
            return;
        }

        setTestStatus('testing');
        setTestMessage('Testing connection...');

        try {
            const response = await fetch('/api/agentai/test-connection/mongodb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uri: formData.connectionUri,
                    dbName: formData.dbName,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setTestStatus('success');
                setTestMessage(`Connected! ${data.databases?.length || 0} databases found`);
            } else {
                setTestStatus('error');
                setTestMessage(data.error || 'Connection failed');
            }
        } catch (error) {
            setTestStatus('error');
            setTestMessage('Network error');
        }
    };

    const isDatabase = nodeType === 'databaseAction';

    return (
        <div
            className="flex flex-col h-full shrink-0"
            style={{
                width: '320px',
                backgroundColor: '#0A0A0A',
                borderLeft: '1px solid #262626',
            }}
        >
            {/* Header */}
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getNodeIcon(nodeType)}
                    <span className="text-white text-sm font-medium">{nodeName}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Config Fields */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {fields.map((field) => (
                    <div key={field.key}>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-gray-400 text-xs font-medium">{field.label}</label>
                            {field.type !== 'password' && field.type !== 'select' && (
                                <VariablePicker
                                    availableNodes={upstreamNodes}
                                    onSelect={(v) => handleInsertVariable(field.key, v)}
                                />
                            )}
                        </div>

                        {field.type === 'textarea' ? (
                            <textarea
                                ref={(el) => { inputRefs.current[field.key] = el; }}
                                value={formData[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                className="w-full h-24 p-2.5 rounded-lg text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 font-mono"
                                style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                placeholder={field.placeholder}
                            />
                        ) : field.type === 'password' ? (
                            <input
                                ref={(el) => { inputRefs.current[field.key] = el; }}
                                type="password"
                                value={formData[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                className="w-full p-2.5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 font-mono"
                                style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                placeholder={field.placeholder}
                            />
                        ) : field.type === 'select' ? (
                            <select
                                ref={(el) => { inputRefs.current[field.key] = el; }}
                                value={formData[field.key] || field.options?.[0] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                className="w-full p-2.5 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                                style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                            >
                                {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : field.type === 'range' ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={field.min || 0}
                                    max={field.max || 1}
                                    step={field.step || 0.1}
                                    value={formData[field.key] || '0.7'}
                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(Number(formData[field.key] || 0.7) * 100)}%, #262626 ${(Number(formData[field.key] || 0.7) * 100)}%, #262626 100%)`
                                    }}
                                />
                                <span className="text-violet-400 text-sm font-mono w-10 text-right">
                                    {formData[field.key] || '0.7'}
                                </span>
                            </div>
                        ) : field.type === 'toggle' ? (
                            <button
                                onClick={() => handleFieldChange(field.key, formData[field.key] === 'true' ? 'false' : 'true')}
                                className={`relative w-12 h-6 rounded-full transition-colors ${formData[field.key] === 'true' ? 'bg-violet-500' : 'bg-[#262626]'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData[field.key] === 'true' ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        ) : (
                            <input
                                ref={(el) => { inputRefs.current[field.key] = el; }}
                                type="text"
                                value={formData[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                className="w-full p-2.5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 font-mono"
                                style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                                placeholder={field.placeholder}
                            />
                        )}
                    </div>
                ))}

                {/* Test Connection Button (for Database) */}
                {isDatabase && (
                    <div className="pt-2">
                        <button
                            onClick={handleTestConnection}
                            disabled={testStatus === 'testing'}
                            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{
                                backgroundColor: testStatus === 'success' ? 'rgba(34, 197, 94, 0.2)' :
                                    testStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' : '#111111',
                                border: `1px solid ${testStatus === 'success' ? '#22c55e' :
                                    testStatus === 'error' ? '#ef4444' : '#262626'}`,
                                color: testStatus === 'success' ? '#22c55e' :
                                    testStatus === 'error' ? '#ef4444' : '#999',
                            }}
                        >
                            {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {testStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                            {testStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                            {testStatus === 'idle' ? 'Test Connection' : testMessage}
                        </button>
                    </div>
                )}

                {/* Variables Reference */}
                <div className="pt-4 border-t border-[#262626]">
                    <p className="text-gray-500 text-xs mb-2">Available Variables</p>
                    <div className="space-y-1">
                        {upstreamNodes.length === 0 ? (
                            <p className="text-gray-600 text-xs">No upstream nodes</p>
                        ) : (
                            upstreamNodes.slice(0, 3).map((n) => {
                                const nData = n.data as any;
                                const nType = nData?.nodeType || n.type;
                                return (
                                    <div key={n.id} className="flex items-center gap-2 text-xs text-gray-500">
                                        {getNodeIcon(nType)}
                                        <span>{nData?.label || 'Node'}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#262626]">
                <p className="text-gray-600 text-xs text-center">
                    Use {'{{node.property}}'} for variables
                </p>
            </div>
        </div>
    );
});

NodeConfigPanel.displayName = 'NodeConfigPanel';

export default NodeConfigPanel;
