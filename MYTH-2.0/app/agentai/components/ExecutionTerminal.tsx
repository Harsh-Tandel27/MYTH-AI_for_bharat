'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Terminal, CheckCircle, AlertCircle, Info, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { type LogEntry } from '../lib/execution-engine';

interface ExecutionTerminalProps {
    logs: LogEntry[];
    isRunning: boolean;
    onClose: () => void;
}

const ExecutionTerminal = memo(({ logs, isRunning, onClose }: ExecutionTerminalProps) => {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const toggleExpand = (logId: string) => {
        setExpandedLogs((prev) => {
            const next = new Set(prev);
            if (next.has(logId)) {
                next.delete(logId);
            } else {
                next.add(logId);
            }
            return next;
        });
    };

    const getLogIcon = (type: LogEntry['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
            case 'info':
                return <Info className="w-3.5 h-3.5 text-blue-400" />;
            case 'data':
                return <Database className="w-3.5 h-3.5 text-violet-400" />;
            default:
                return <Terminal className="w-3.5 h-3.5 text-gray-500" />;
        }
    };

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'success':
                return 'text-green-400';
            case 'error':
                return 'text-red-400';
            case 'info':
                return 'text-blue-400';
            case 'data':
                return 'text-violet-400';
            default:
                return 'text-gray-400';
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatData = (data: Record<string, unknown>): string => {
        return JSON.stringify(data, null, 2);
    };

    return (
        <div
            className="absolute bottom-0 left-0 right-0 z-20 border-t"
            style={{
                backgroundColor: '#0A0A0A',
                borderColor: '#262626',
                height: '240px',
            }}
        >
            {/* Terminal Header */}
            <div
                className="flex items-center justify-between px-4 py-2 border-b"
                style={{ borderColor: '#262626' }}
            >
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-300">Execution Log</span>
                    {isRunning && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-400">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            Running...
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-300 text-sm px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors"
                >
                    Close
                </button>
            </div>

            {/* Terminal Content */}
            <div
                className="h-[calc(100%-40px)] overflow-y-auto p-4 font-mono text-xs"
                style={{ backgroundColor: '#000000' }}
            >
                {logs.length === 0 ? (
                    <div className="text-gray-600 text-xs">
                        Waiting for execution...
                    </div>
                ) : (
                    <div className="space-y-1">
                        {logs.map((log) => (
                            <div key={log.id}>
                                <div className="flex items-start gap-2">
                                    <span className="text-gray-600 shrink-0">
                                        [{formatTime(log.timestamp)}]
                                    </span>
                                    <span className="shrink-0">{getLogIcon(log.type)}</span>

                                    {/* Data logs are expandable */}
                                    {log.type === 'data' && log.data ? (
                                        <button
                                            onClick={() => toggleExpand(log.id)}
                                            className="flex items-center gap-1 text-left hover:opacity-80"
                                        >
                                            {expandedLogs.has(log.id) ? (
                                                <ChevronDown className="w-3 h-3 text-violet-400" />
                                            ) : (
                                                <ChevronRight className="w-3 h-3 text-violet-400" />
                                            )}
                                            <span className={getLogColor(log.type)}>
                                                {log.message}
                                            </span>
                                        </button>
                                    ) : (
                                        <span className={getLogColor(log.type)}>
                                            {log.message}
                                        </span>
                                    )}
                                </div>

                                {/* Expanded data view */}
                                {log.type === 'data' && log.data && expandedLogs.has(log.id) && (
                                    <div
                                        className="ml-16 mt-1 p-2 rounded text-[10px] leading-relaxed overflow-x-auto"
                                        style={{
                                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                            border: '1px solid rgba(139, 92, 246, 0.2)',
                                        }}
                                    >
                                        <pre className="text-violet-300 whitespace-pre-wrap">
                                            {formatData(log.data)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>
        </div>
    );
});

ExecutionTerminal.displayName = 'ExecutionTerminal';

export default ExecutionTerminal;
