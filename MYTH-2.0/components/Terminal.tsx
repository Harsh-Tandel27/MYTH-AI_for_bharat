'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Define the props that TerminalCore accepts
interface TerminalCoreProps {
    sandboxId?: string;
}

interface TerminalProps {
    isOpen: boolean;
    onClose: () => void;
    onToggleMinimize?: () => void;
    isMinimized?: boolean;
    sandboxId?: string;
}

// Dynamically import xterm to avoid SSR issues with proper typing
const TerminalCore = dynamic<TerminalCoreProps>(
    () => import('./TerminalCore').then(mod => mod.default),
    {
        ssr: false,
        loading: () => <div className="flex items-center justify-center h-full text-gray-500">Loading terminal...</div>
    }
);

export default function Terminal({
    isOpen,
    onClose,
    onToggleMinimize,
    isMinimized = false,
    sandboxId,
}: TerminalProps) {
    if (!isOpen) return null;

    return (
        <div
            className={`border-t border-purple-500/30 bg-gray-900/95 backdrop-blur-sm transition-all duration-300 ${isMinimized ? 'h-10' : 'h-64'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-gray-200">Terminal</span>
                    {sandboxId && (
                        <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-700/50 rounded">
                            sandbox: {sandboxId.slice(0, 8)}...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {onToggleMinimize && (
                        <button
                            onClick={onToggleMinimize}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                            title={isMinimized ? 'Maximize' : 'Minimize'}
                        >
                            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                        title="Close terminal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Terminal Content */}
            {!isMinimized && (
                <TerminalCore sandboxId={sandboxId} />
            )}
        </div>
    );
}
