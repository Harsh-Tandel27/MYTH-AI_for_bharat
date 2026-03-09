'use client';

import { memo, useState, type DragEvent } from 'react';
import { Search, Zap, Brain, Mail, Database, MessageSquare, GitBranch, Code, Globe, Clock } from 'lucide-react';

// Node definitions with categories
export interface NodeDefinition {
    type: string;
    nodeType: string;
    label: string;
    description: string;
    category: 'triggers' | 'ai' | 'actions' | 'logic';
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
    // Triggers
    {
        type: 'trigger',
        nodeType: 'webhookTrigger',
        label: 'Webhook',
        description: 'Receives HTTP requests',
        category: 'triggers',
        icon: Zap,
        color: 'green',
    },
    {
        type: 'trigger',
        nodeType: 'scheduleTrigger',
        label: 'Schedule',
        description: 'Runs on a cron schedule',
        category: 'triggers',
        icon: Clock,
        color: 'green',
    },
    {
        type: 'trigger',
        nodeType: 'textInput',
        label: 'Text Input',
        description: 'Manual text for testing',
        category: 'triggers',
        icon: MessageSquare,
        color: 'green',
    },
    // AI
    {
        type: 'ai',
        nodeType: 'aiLogic',
        label: 'AI Agent',
        description: 'Process with Gemini AI',
        category: 'ai',
        icon: Brain,
        color: 'violet',
    },
    // Actions
    {
        type: 'action',
        nodeType: 'emailAction',
        label: 'Send Email',
        description: 'Send via Resend',
        category: 'actions',
        icon: Mail,
        color: 'red',
    },
    {
        type: 'action',
        nodeType: 'slackAction',
        label: 'Slack Message',
        description: 'Post to Slack channel',
        category: 'actions',
        icon: MessageSquare,
        color: 'cyan',
    },
    {
        type: 'action',
        nodeType: 'databaseAction',
        label: 'Database',
        description: 'MongoDB operations',
        category: 'actions',
        icon: Database,
        color: 'amber',
    },
    {
        type: 'action',
        nodeType: 'httpRequest',
        label: 'HTTP Request',
        description: 'Call external API',
        category: 'actions',
        icon: Globe,
        color: 'blue',
    },
    // Logic
    {
        type: 'router',
        nodeType: 'semanticRouter',
        label: 'Semantic Router',
        description: 'AI-powered conditional branching',
        category: 'logic',
        icon: GitBranch,
        color: 'orange',
    },
    {
        type: 'code',
        nodeType: 'codeNode',
        label: 'Code',
        description: 'Run custom JavaScript',
        category: 'logic',
        icon: Code,
        color: 'gray',
    },
];

const CATEGORIES = [
    { id: 'triggers', label: 'Triggers', color: 'text-green-400' },
    { id: 'ai', label: 'AI', color: 'text-violet-400' },
    { id: 'actions', label: 'Actions', color: 'text-blue-400' },
    { id: 'logic', label: 'Logic', color: 'text-orange-400' },
] as const;

interface NodeLibraryProps {
    onClose?: () => void;
}

const NodeLibrary = memo(({ onClose }: NodeLibraryProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['triggers', 'ai', 'actions', 'logic'])
    );

    const filteredNodes = NODE_DEFINITIONS.filter(
        (node) =>
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const onDragStart = (event: DragEvent<HTMLDivElement>, node: NodeDefinition) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
        event.dataTransfer.effectAllowed = 'move';
    };

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
            green: { bg: 'bg-green-500/20', text: 'text-green-400', hover: 'hover:bg-green-500/30' },
            violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', hover: 'hover:bg-violet-500/30' },
            red: { bg: 'bg-red-500/20', text: 'text-red-400', hover: 'hover:bg-red-500/30' },
            cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', hover: 'hover:bg-cyan-500/30' },
            amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', hover: 'hover:bg-amber-500/30' },
            blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', hover: 'hover:bg-blue-500/30' },
            orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', hover: 'hover:bg-orange-500/30' },
            gray: { bg: 'bg-gray-500/20', text: 'text-gray-400', hover: 'hover:bg-gray-500/30' },
        };
        return colorMap[color] || colorMap.gray;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-3 border-b border-[#262626]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search nodes..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
                        style={{ backgroundColor: '#111111', border: '1px solid #262626' }}
                    />
                </div>
            </div>

            {/* Node List */}
            <div className="flex-1 overflow-y-auto py-2">
                {CATEGORIES.map((category) => {
                    const categoryNodes = filteredNodes.filter((n) => n.category === category.id);
                    if (categoryNodes.length === 0) return null;

                    const isExpanded = expandedCategories.has(category.id);

                    return (
                        <div key={category.id} className="mb-2">
                            <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider hover:bg-[#1a1a1a]"
                            >
                                <span className={category.color}>{category.label}</span>
                                <span className="text-gray-600">{categoryNodes.length}</span>
                            </button>

                            {isExpanded && (
                                <div className="px-2 space-y-1">
                                    {categoryNodes.map((node) => {
                                        const colors = getColorClasses(node.color);
                                        const Icon = node.icon;

                                        return (
                                            <div
                                                key={node.nodeType}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, node)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${colors.hover}`}
                                                style={{ backgroundColor: '#111111' }}
                                            >
                                                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                                    <Icon className={`w-4 h-4 ${colors.text}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">{node.label}</div>
                                                    <div className="text-xs text-gray-500 truncate">{node.description}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredNodes.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">No nodes found</div>
                )}
            </div>

            {/* Help Text */}
            <div className="p-3 border-t border-[#262626]">
                <p className="text-xs text-gray-600 text-center">
                    Drag nodes to canvas or click to add
                </p>
            </div>
        </div>
    );
});

NodeLibrary.displayName = 'NodeLibrary';

export default NodeLibrary;
