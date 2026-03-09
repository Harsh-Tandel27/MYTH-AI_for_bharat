'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, Download, RotateCcw, GitBranch, X, ChevronRight, FileCode } from 'lucide-react';

export interface CheckpointFile {
    path: string;
    content: string;
    type: string;
    completed?: boolean;
    edited?: boolean;
}

export interface Checkpoint {
    id: string | number;
    timestamp: Date;
    files: CheckpointFile[];
    prompt: string;
    type: 'clone' | 'edit' | 'creation';
}

interface CheckpointPanelProps {
    checkpoints: Checkpoint[];
    isOpen: boolean;
    onClose: () => void;
    onRestore: (checkpointId: string | number) => void;
    onDownload: (checkpointId: string | number) => void;
    onFork?: (checkpointId: string | number) => void;
    currentCheckpointId?: string | number;
}

export default function CheckpointPanel({
    checkpoints,
    isOpen,
    onClose,
    onRestore,
    onDownload,
    onFork,
    currentCheckpointId,
}: CheckpointPanelProps) {
    const [expandedId, setExpandedId] = useState<string | number | null>(null);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getTypeLabel = (type: Checkpoint['type']) => {
        switch (type) {
            case 'clone': return { label: 'Cloned', color: 'bg-blue-500/20 text-blue-300' };
            case 'creation': return { label: 'Created', color: 'bg-green-500/20 text-green-300' };
            case 'edit': return { label: 'Edited', color: 'bg-purple-500/20 text-purple-300' };
            default: return { label: 'Version', color: 'bg-gray-500/20 text-gray-300' };
        }
    };

    const truncatePrompt = (prompt: string, maxLength = 60) => {
        return prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-[400px] max-w-[90vw] bg-gray-900/95 backdrop-blur-xl border-l border-purple-500/20 z-50 flex flex-col shadow-2xl shadow-purple-500/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <History className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Version History</h2>
                                    <p className="text-xs text-gray-400">{checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Checkpoints List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {checkpoints.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm">No checkpoints yet</p>
                                    <p className="text-gray-500 text-xs mt-1">Checkpoints are saved automatically after each generation</p>
                                </div>
                            ) : (
                                checkpoints.map((checkpoint, index) => {
                                    const { label, color } = getTypeLabel(checkpoint.type);
                                    const isExpanded = expandedId === checkpoint.id;
                                    const isCurrent = currentCheckpointId === checkpoint.id;

                                    return (
                                        <motion.div
                                            key={checkpoint.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`group bg-gray-800/50 border rounded-xl overflow-hidden transition-all duration-200 ${isCurrent ? 'border-purple-500/50 ring-1 ring-purple-500/30' : 'border-gray-700/50 hover:border-gray-600'
                                                }`}
                                        >
                                            {/* Main row */}
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${color}`}>
                                                            {label}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-500/30 text-purple-200">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{formatTime(new Date(checkpoint.timestamp))}</span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-300 mb-3" title={checkpoint.prompt}>
                                                    {truncatePrompt(checkpoint.prompt)}
                                                </p>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => onRestore(checkpoint.id)}
                                                        disabled={isCurrent}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        Restore
                                                    </button>
                                                    <button
                                                        onClick={() => onDownload(checkpoint.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <Download className="h-3 w-3" />
                                                        Download
                                                    </button>
                                                    {onFork && (
                                                        <button
                                                            onClick={() => onFork(checkpoint.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Fork from this checkpoint"
                                                        >
                                                            <GitBranch className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : checkpoint.id)}
                                                        className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                                                    >
                                                        <FileCode className="h-3 w-3" />
                                                        <span>{checkpoint.files.length} files</span>
                                                        <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded files list */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="border-t border-gray-700/50 bg-gray-800/30"
                                                    >
                                                        <div className="p-3 space-y-1 max-h-32 overflow-y-auto">
                                                            {checkpoint.files.map((file, fileIndex) => (
                                                                <div
                                                                    key={fileIndex}
                                                                    className="flex items-center gap-2 text-xs text-gray-400 py-1 px-2 rounded hover:bg-gray-700/30"
                                                                >
                                                                    <FileCode className="h-3 w-3 text-gray-500" />
                                                                    <span className="truncate">{file.path}</span>
                                                                    {file.edited && (
                                                                        <span className="text-yellow-400 text-[10px]">modified</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer hint */}
                        <div className="p-4 border-t border-gray-700/50 bg-gray-900/80">
                            <p className="text-xs text-gray-500 text-center">
                                💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Ctrl+Z</kbd> to quickly undo changes
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
