'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Send, Wifi, WifiOff, Loader2, Bot, User, Wrench,
    ChevronDown, ChevronRight, Square, Terminal, FileText, Globe,
    Code2, Sparkles, AlertCircle, CheckCircle2, Copy, Check,
    Settings2, Zap, MessageSquare, ExternalLink, PlayCircle,
    Rocket, Clock, Info, Mic, MicOff, PhoneOff, X,
    History, Trash2, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';
import { useTheme } from '../lib/theme-context';
import ThemeToggle from './ThemeToggle';
import { OpenClawClient, type ConnectionStatus, type ToolCall, type ChatMessage } from '../lib/openclaw-ws';
import { BlueprintData, generatePrompt } from '../lib/prompt-generator';
import { div } from 'three/src/nodes/math/OperatorNode.js';

/* ─── localStorage keys ──────────────────────────── */
const LS_WS_URL = 'myth_copilot_ws_url';
const LS_TOKEN = 'myth_copilot_token';
const LS_AUTO_CONNECT = 'myth_copilot_auto_connect';
const LS_MESSAGES = 'myth_copilot_messages';
const LS_AGENT_LOGS = 'myth_copilot_agent_logs';
const LS_SESSION_ID = 'myth_copilot_session_id';

/* ─── Agent log type ─────────────────────────────── */
interface AgentLog {
    id: string;
    ts: number;
    type: 'lifecycle' | 'tool_start' | 'tool_done' | 'deploy' | 'info' | 'error';
    message: string;
    detail?: string;
}

/* ─── Markdown-lite renderer ─────────────────────── */
function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';

    lines.forEach((line, i) => {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`} className="bg-[#0d0d0d] border border-[var(--color-border)] rounded-xl p-4 my-3 overflow-x-auto text-sm">
                        {codeLang && <div className="text-[10px] text-[var(--color-muted-foreground)] mb-2 uppercase tracking-wider">{codeLang}</div>}
                        <code className="text-emerald-400 font-mono">{codeBuffer.join('\n')}</code>
                    </pre>
                );
                codeBuffer = [];
                inCodeBlock = false;
                codeLang = '';
            } else {
                inCodeBlock = true;
                codeLang = line.slice(3).trim();
            }
            return;
        }
        if (inCodeBlock) { codeBuffer.push(line); return; }

        if (line.startsWith('### ')) elements.push(<h3 key={i} className="text-sm font-bold text-[var(--color-foreground)] mt-3 mb-1">{line.slice(4)}</h3>);
        else if (line.startsWith('## ')) elements.push(<h2 key={i} className="text-base font-bold text-[var(--color-foreground)] mt-3 mb-1">{line.slice(3)}</h2>);
        else if (line.startsWith('# ')) elements.push(<h1 key={i} className="text-lg font-bold text-[var(--color-foreground)] mt-3 mb-1">{line.slice(2)}</h1>);
        else if (line.match(/^[-*]\s/)) elements.push(<div key={i} className="flex gap-2 ml-3 my-0.5"><span className="text-[var(--color-muted-foreground)] mt-0.5">•</span><span>{renderInline(line.slice(2))}</span></div>);
        else if (line.match(/^\d+\.\s/)) {
            const num = line.match(/^(\d+)\./)?.[1];
            elements.push(<div key={i} className="flex gap-2 ml-3 my-0.5"><span className="text-[var(--color-muted-foreground)] text-sm font-mono w-5">{num}.</span><span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span></div>);
        }
        else if (line.trim() === '') elements.push(<div key={i} className="h-1.5" />);
        else elements.push(<p key={i} className="my-0.5 leading-relaxed">{renderInline(line)}</p>);
    });

    if (inCodeBlock && codeBuffer.length > 0) {
        elements.push(
            <pre key="code-end" className="bg-[#0d0d0d] border border-[var(--color-border)] rounded-xl p-4 my-3 overflow-x-auto text-sm">
                <code className="text-emerald-400 font-mono">{codeBuffer.join('\n')}</code>
            </pre>
        );
    }
    return elements;
}

function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s)\]]+)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        const m = match[0];
        if (m.startsWith('`')) parts.push(<code key={match.index} className="bg-[var(--color-secondary)] text-[#3b82f6] px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-[var(--color-border)]">{m.slice(1, -1)}</code>);
        else if (m.startsWith('**')) parts.push(<strong key={match.index} className="text-[var(--color-foreground)] font-semibold">{m.slice(2, -2)}</strong>);
        else if (m.startsWith('*')) parts.push(<em key={match.index} className="text-[var(--color-muted-foreground)]">{m.slice(1, -1)}</em>);
        else if (m.startsWith('http')) parts.push(<a key={match.index} href={m} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:text-blue-400 underline underline-offset-2 decoration-[#3b82f6]/30 hover:decoration-[#3b82f6] transition-colors break-all">{m}</a>);
        lastIndex = match.index + m.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length === 0 ? text : <>{parts}</>;
}

/* ─── Tool icon helper ───────────────────────────── */
function getToolIcon(name: string) {
    const n = name.toLowerCase();
    if (n.includes('bash') || n.includes('exec') || n.includes('command') || n.includes('shell')) return Terminal;
    if (n.includes('file') || n.includes('read') || n.includes('write') || n.includes('edit')) return FileText;
    if (n.includes('web') || n.includes('browse') || n.includes('search') || n.includes('url')) return Globe;
    if (n.includes('code') || n.includes('python') || n.includes('node')) return Code2;
    if (n.includes('deploy') || n.includes('vercel')) return Rocket;
    return Wrench;
}

/* ─── Tool Call Card ─────────────────────────────── */
function ToolCallCard({ tool }: { tool: ToolCall }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const Icon = getToolIcon(tool.name);

    const statusConfig = {
        running: { icon: Loader2, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20', label: 'Running', spin: true },
        done: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Done', spin: false },
        error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Error', spin: false },
    };
    const st = statusConfig[tool.status] || statusConfig.running;
    const StatusIcon = st.icon;

    const copyOutput = () => {
        if (tool.output) { navigator.clipboard.writeText(tool.output); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`my-2 rounded-xl border ${st.border} ${st.bg} overflow-hidden`}>
            <button onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                    <Icon size={13} className={st.color} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-foreground)]">{tool.name}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-background)]/50 border border-[var(--color-border)]">
                            <StatusIcon size={10} className={`${st.color} ${st.spin ? 'animate-spin' : ''}`} />
                            <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>
                        </div>
                    </div>
                </div>
                {expanded ? <ChevronDown size={13} className="text-[var(--color-muted-foreground)]" /> : <ChevronRight size={13} className="text-[var(--color-muted-foreground)]" />}
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-3 space-y-2 border-t border-white/[0.04]">
                            {tool.input && Object.keys(tool.input).length > 0 && (
                                <div className="mt-2">
                                    <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider mb-1 font-semibold">Input</p>
                                    <pre className="bg-[#0a0a0a] border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-muted-foreground)] overflow-x-auto font-mono max-h-36 overflow-y-auto">
                                        {JSON.stringify(tool.input, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {tool.output && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-semibold">Output</p>
                                        <button onClick={copyOutput} className="flex items-center gap-1 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                                            {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <pre className="bg-[#0a0a0a] border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-muted-foreground)] overflow-x-auto font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                                        {tool.output}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ─── Agent activity log item ────────────────────── */
function AgentLogItem({ log }: { log: AgentLog }) {
    const iconMap = {
        lifecycle: PlayCircle,
        tool_start: Wrench,
        tool_done: CheckCircle2,
        deploy: Rocket,
        info: Info,
        error: AlertCircle,
    };
    const colorMap = {
        lifecycle: 'text-[#3b82f6]',
        tool_start: 'text-amber-400',
        tool_done: 'text-emerald-400',
        deploy: 'text-violet-400',
        info: 'text-[var(--color-muted-foreground)]',
        error: 'text-red-400',
    };
    const Icon = iconMap[log.type];
    const color = colorMap[log.type];

    return (
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 py-1.5 px-3">
            <Icon size={12} className={`${color} mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
                <span className="text-xs text-[var(--color-muted-foreground)] leading-snug">{log.message}</span>
                {log.detail && <span className="text-[10px] text-[var(--color-muted-foreground)]/60 ml-1.5">{log.detail}</span>}
            </div>
            <span className="text-[9px] text-[var(--color-muted-foreground)]/40 flex-shrink-0 tabular-nums">
                {new Date(log.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </motion.div>
    );
}

/* ─── Streaming Dots ─────────────────────────────── */
function StreamingDots() {
    return (
        <div className="flex items-center gap-1.5 px-2 py-1">
            {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
        </div>
    );
}

/* ─── Connection Status Dot ──────────────────────── */
function StatusDot({ status }: { status: ConnectionStatus }) {
    const config: Record<ConnectionStatus, { color: string; pulse: boolean; label: string }> = {
        idle: { color: 'bg-[var(--color-muted-foreground)]', pulse: false, label: 'Not Connected' },
        connecting: { color: 'bg-amber-400', pulse: true, label: 'Connecting...' },
        connected: { color: 'bg-emerald-400', pulse: false, label: 'Connected' },
        disconnected: { color: 'bg-red-400', pulse: false, label: 'Disconnected' },
        error: { color: 'bg-red-500', pulse: true, label: 'Error' },
    };
    const c = config[status];
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${c.color} ${c.pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${status === 'connected' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-[var(--color-muted-foreground)]'}`}>{c.label}</span>
        </div>
    );
}

/* ─── Detect preview URLs (Vercel/deployed) ──────── */
function extractPreviewUrl(messages: ChatMessage[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== 'assistant') continue;
        // Match vercel, netlify, or any https deployment url
        const urlMatch = msg.content.match(/https?:\/\/[^\s)]+\.(vercel\.app|netlify\.app|pages\.dev)[^\s)]*/i);
        if (urlMatch) return urlMatch[0].replace(/[*.,!?]+$/, '');
        // Also check tool outputs
        for (const tool of msg.toolCalls) {
            if (tool.output) {
                const toolMatch = tool.output.match(/https?:\/\/[^\s)]+\.(vercel\.app|netlify\.app|pages\.dev)[^\s)]*/i);
                if (toolMatch) return toolMatch[0].replace(/[*.,!?]+$/, '');
            }
        }
    }
    return null;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT — OpenClawChat (MYTH theme)
   ═══════════════════════════════════════════════════ */
export default function OpenClawChat({ onBack, initialPrompt }: { onBack: () => void; initialPrompt?: string }) {
    /* ── State ────────────────────────────── */
    const [wsUrl, setWsUrl] = useState('');
    const [token, setToken] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState(initialPrompt || '');
    const [isStreaming, setIsStreaming] = useState(false);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [showConnectionPanel, setShowConnectionPanel] = useState(false);
    const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
    const [showLogs, setShowLogs] = useState(true);
    const { isDark } = useTheme();

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const clientRef = useRef<OpenClawClient | null>(null);
    const autoConnectDone = useRef(false);

    /* ── History State ───────────────────── */
    const [showHistory, setShowHistory] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionList, setSessionList] = useState<{ _id: string; title: string; messageCount: number; updatedAt: string }[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);

    /* ── Vapi State ───────────────────────── */
    const [vapiActive, setVapiActive] = useState(false);
    const [vapiStatus, setVapiStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
    const [vapiTranscript, setVapiTranscript] = useState<{ role: 'user' | 'assistant'; text: string; isFinal: boolean }[]>([]);
    const [vapiMuted, setVapiMuted] = useState(false);
    const [vapiSpeaking, setVapiSpeaking] = useState(false);
    const [vapiVolume, setVapiVolume] = useState(0);
    const vapiRef = useRef<Vapi | null>(null);
    const vapiInitRef = useRef(false);
    const blueprintSentRef = useRef(false);
    const vapiScrollRef = useRef<HTMLDivElement>(null);

    /* ── Derived ──────────────────────────── */
    const isConnected = connectionStatus === 'connected';
    const previewUrl = extractPreviewUrl(messages);

    /* ── Load persisted state & auto-connect ─── */
    useEffect(() => {
        const savedUrl = localStorage.getItem(LS_WS_URL) || 'wss://unguided-alana-prominent.ngrok-free.dev';
        const savedToken = localStorage.getItem(LS_TOKEN) || 'hackathon_admin_2024';
        setWsUrl(savedUrl);
        setToken(savedToken);

        // Restore messages and logs
        try {
            const savedMsgs = localStorage.getItem(LS_MESSAGES);
            if (savedMsgs) {
                const parsed = JSON.parse(savedMsgs) as ChatMessage[];
                // Mark any leftover streaming messages as final
                setMessages(parsed.map(m => m.state === 'streaming' ? { ...m, state: 'final' as const } : m));
            }
        } catch { /* ignore corrupt data */ }
        try {
            const savedLogs = localStorage.getItem(LS_AGENT_LOGS);
            if (savedLogs) setAgentLogs(JSON.parse(savedLogs));
        } catch { /* ignore */ }

        // Auto-connect on load if we have credentials
        if (savedUrl && savedToken && !autoConnectDone.current) {
            autoConnectDone.current = true;
            setTimeout(() => {
                const client = buildClient();
                client.connect(savedUrl, savedToken);
            }, 300);
        }
        // Load session history for sidebar
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Persist credentials ─────────────── */
    useEffect(() => {
        if (wsUrl) localStorage.setItem(LS_WS_URL, wsUrl);
        if (token) localStorage.setItem(LS_TOKEN, token);
    }, [wsUrl, token]);

    /* ── Persist messages & logs ──────────── */
    useEffect(() => {
        localStorage.setItem(LS_MESSAGES, JSON.stringify(messages));
    }, [messages]);
    useEffect(() => {
        localStorage.setItem(LS_AGENT_LOGS, JSON.stringify(agentLogs.slice(-50)));
    }, [agentLogs]);

    /* ── Auto-scroll ─────────────────────── */
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isStreaming, agentLogs]);

    /* ── Auto-resize textarea on programmatic input change (e.g. Vapi) ── */
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.6) + 'px';
    }, [input]);

    /* ── Add agent log helper ────────────── */
    const addLog = useCallback((type: AgentLog['type'], message: string, detail?: string) => {
        setAgentLogs(prev => [...prev.slice(-50), { id: crypto.randomUUID(), ts: Date.now(), type, message, detail }]);
    }, []);

    /* ── Build client ────────────────────── */
    const buildClient = useCallback(() => {
        if (clientRef.current) return clientRef.current;
        const client = new OpenClawClient({
            onConnectionChange: (status) => {
                console.log('[MYTH Copilot] status:', status);
                setConnectionStatus(status);
                if (status === 'connected') {
                    setShowConnectionPanel(false);
                    setConnectionError(null);
                    addLog('lifecycle', 'Connected to MYTH Gateway');
                }
                else if (status === 'error') setConnectionError('Connection failed — check URL, token, and allowed origins.');
                else if (status === 'disconnected') setConnectionError('Disconnected. Reconnecting...');
            },
            onChatDelta: (runId, text) => {
                setActiveRunId(runId); setIsStreaming(true);
                setMessages(prev => {
                    const existing = prev.find(m => m.runId === runId && m.role === 'assistant');
                    if (existing) return prev.map(m => m.runId === runId && m.role === 'assistant' ? { ...m, content: m.content + text, state: 'streaming' as const } : m);
                    return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: text, timestamp: Date.now(), toolCalls: [], state: 'streaming' as const, runId }];
                });
            },
            onChatFinal: (runId, content) => {
                setIsStreaming(false); setActiveRunId(null);
                setMessages(prev => prev.map(m => m.runId === runId && m.role === 'assistant' ? { ...m, content: content || m.content, state: 'final' as const } : m));
                addLog('lifecycle', 'Agent response complete');
            },
            onChatError: (runId, errorMessage) => {
                setIsStreaming(false); setActiveRunId(null);
                setMessages(prev => {
                    const existing = prev.find(m => m.runId === runId && m.role === 'assistant');
                    if (existing) return prev.map(m => m.runId === runId && m.role === 'assistant' ? { ...m, content: m.content + `\n\n⚠️ ${errorMessage}`, state: 'error' as const } : m);
                    return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `⚠️ ${errorMessage}`, timestamp: Date.now(), toolCalls: [], state: 'error' as const, runId }];
                });
                addLog('error', `Agent error: ${errorMessage}`);
            },
            onChatAborted: (runId) => {
                setIsStreaming(false); setActiveRunId(null);
                setMessages(prev => prev.map(m => m.runId === runId && m.role === 'assistant' ? { ...m, state: 'final' as const, content: m.content + '\n\n_(aborted)_' } : m));
                addLog('info', 'Agent task was aborted');
            },
            onToolUse: (runId, name, toolInput, status) => {
                addLog('tool_start', `Using tool: ${name}`, name.includes('bash') ? (toolInput as { command?: string })?.command?.slice(0, 60) : undefined);
                setMessages(prev => {
                    const msgIdx = prev.findIndex(m => m.runId === runId && m.role === 'assistant');
                    if (msgIdx === -1) return [...prev, { id: crypto.randomUUID(), role: 'assistant' as const, content: '', timestamp: Date.now(), toolCalls: [{ id: crypto.randomUUID(), name, input: toolInput, status: (status === 'done' ? 'done' : status === 'error' ? 'error' : 'running') as ToolCall['status'] }], state: 'streaming' as const, runId }];
                    return prev.map((m, idx) => {
                        if (idx !== msgIdx) return m;
                        const existingTool = m.toolCalls.find(t => t.name === name && t.status === 'running');
                        if (existingTool) return m;
                        return { ...m, toolCalls: [...m.toolCalls, { id: crypto.randomUUID(), name, input: toolInput, status: (status === 'done' ? 'done' : status === 'error' ? 'error' : 'running') as ToolCall['status'] }] };
                    });
                });
            },
            onToolResult: (runId, name, output, status) => {
                const isDeployUrl = output?.match(/https?:\/\/[^\s]+\.(vercel\.app|netlify\.app|pages\.dev)/i);
                if (isDeployUrl) addLog('deploy', `Deployed! ${isDeployUrl[0]}`);
                else addLog('tool_done', `Tool finished: ${name}`, status === 'error' ? '(error)' : undefined);

                setMessages(prev => prev.map(m => {
                    if (m.runId !== runId || m.role !== 'assistant') return m;
                    const updatedTools = [...m.toolCalls];
                    const toolIdx = updatedTools.findLastIndex(t => t.name === name && t.status === 'running');
                    if (toolIdx !== -1) updatedTools[toolIdx] = { ...updatedTools[toolIdx], output, status: (status === 'error' ? 'error' : 'done') as ToolCall['status'] };
                    return { ...m, toolCalls: updatedTools };
                }));
            },
            onHistoryLoaded: () => { },
        });
        clientRef.current = client;
        return client;
    }, [addLog]);

    useEffect(() => { return () => { clientRef.current?.disconnect(); }; }, []);

    /* ── Handlers ────────────────────────── */
    const handleConnect = () => {
        if (!wsUrl.trim() || !token.trim()) return;
        setConnectionError(null);
        localStorage.setItem(LS_WS_URL, wsUrl.trim());
        localStorage.setItem(LS_TOKEN, token.trim());
        localStorage.setItem(LS_AUTO_CONNECT, 'true');
        buildClient().connect(wsUrl.trim(), token.trim());
        addLog('lifecycle', 'Connecting to gateway...');
    };
    const handleDisconnect = () => {
        clientRef.current?.disconnect();
        setConnectionStatus('disconnected');
        localStorage.removeItem(LS_AUTO_CONNECT);
        addLog('lifecycle', 'Disconnected from gateway');
    };
    const handleSend = () => {
        const text = input.trim();
        if (!text || !clientRef.current?.isConnected || isStreaming) return;
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now(), toolCalls: [], state: 'final' }]);
        setInput(''); setIsStreaming(true);
        clientRef.current.sendChat(text);
        addLog('lifecycle', 'Message sent — agent is thinking...');
        setTimeout(() => inputRef.current?.focus(), 50);
    };
    const handleAbort = () => { clientRef.current?.abortChat(); addLog('info', 'Abort requested'); };
    const handleNewSession = () => {
        setMessages([]);
        setIsStreaming(false);
        setActiveRunId(null);
        setAgentLogs([]);
        setSessionId(null);
        localStorage.removeItem(LS_MESSAGES);
        localStorage.removeItem(LS_AGENT_LOGS);
        localStorage.removeItem(LS_SESSION_ID);
    };
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    /* ── History: fetch session list ─────────── */
    const fetchSessions = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const res = await fetch('/api/copilot-sessions');
            if (res.ok) {
                const data = await res.json();
                setSessionList(data.sessions || []);
            }
        } catch (e) {
            console.error('[History] Failed to fetch sessions:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    /* ── History: open sidebar ───────────── */
    const handleToggleHistory = useCallback(() => {
        if (!showHistory) fetchSessions();
        setShowHistory(s => !s);
    }, [showHistory, fetchSessions]);

    /* ── History: load a past session ────── */
    const handleLoadSession = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/copilot-sessions/${id}`);
            if (!res.ok) return;
            const { session } = await res.json();
            setMessages(session.messages || []);
            setAgentLogs([]);
            setIsStreaming(false);
            setActiveRunId(null);
            setSessionId(id);
            localStorage.setItem(LS_SESSION_ID, id);
            localStorage.removeItem(LS_MESSAGES);
            setShowHistory(false);
        } catch (e) {
            console.error('[History] Failed to load session:', e);
        }
    }, []);

    /* ── History: delete session ───────── */
    const handleDeleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/copilot-sessions/${id}`, { method: 'DELETE' });
            setSessionList(prev => prev.filter(s => s._id !== id));
            if (sessionId === id) handleNewSession();
        } catch (e) {
            console.error('[History] Failed to delete session:', e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    /* ── History: auto-save messages to DB ── */
    useEffect(() => {
        if (messages.length === 0) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            if (isSavingRef.current) return;
            isSavingRef.current = true;
            try {
                let sid = sessionId;
                // Create session on first save
                if (!sid) {
                    const res = await fetch('/api/copilot-sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wsUrl }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        sid = data.sessionId;
                        setSessionId(sid);
                        localStorage.setItem(LS_SESSION_ID, sid!);
                    }
                }
                if (!sid) return;
                await fetch(`/api/copilot-sessions/${sid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages }),
                });
            } catch (e) {
                console.error('[History] Auto-save failed:', e);
            } finally {
                isSavingRef.current = false;
            }
        }, 1500);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    /* ── Vapi Handlers ────────────────────── */
    const startVapiCall = useCallback(() => {
        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
        if (!publicKey || !assistantId) {
            console.error('[SitePilot] Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY or NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env');
            return;
        }

        setVapiActive(true);
        setVapiStatus('connecting');
        setVapiTranscript([]);
        setVapiMuted(false);
        blueprintSentRef.current = false;

        const vapi = new Vapi(publicKey);
        vapiRef.current = vapi;

        vapi.on('call-start', () => setVapiStatus('active'));
        vapi.on('call-end', () => setVapiStatus('ended'));
        vapi.on('speech-start', () => setVapiSpeaking(true));
        vapi.on('speech-end', () => setVapiSpeaking(false));
        vapi.on('volume-level', (level: number) => setVapiVolume(level));
        vapi.on('error', (error: any) => console.error('[SitePilot] Vapi error:', error));

        vapi.on('message', (msg: any) => {
            if (msg.type === 'transcript') {
                const role = msg.role === 'assistant' ? 'assistant' as const : 'user' as const;
                const isFinal = msg.transcriptType === 'final';
                if (isFinal) {
                    setVapiTranscript(prev => {
                        const filtered = prev.filter(t => !(t.role === role && !t.isFinal));
                        return [...filtered, { role, text: msg.transcript, isFinal: true }];
                    });
                } else {
                    setVapiTranscript(prev => {
                        const idx = prev.findIndex(t => t.role === role && !t.isFinal);
                        if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], text: msg.transcript }; return u; }
                        return [...prev, { role, text: msg.transcript, isFinal: false }];
                    });
                }
            }
            if (msg.type === 'tool-calls' || msg.type === 'tool-call') {
                const toolCalls = msg.toolCallList || msg.toolCalls || [msg];
                for (const tc of toolCalls) {
                    if (tc.function?.name === 'generateProjectBlueprint' && !blueprintSentRef.current) {
                        blueprintSentRef.current = true;
                        const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                        setTimeout(() => {
                            const prompt = generatePrompt(args as BlueprintData);
                            setInput(prompt);
                            setVapiActive(false);
                            setVapiStatus('idle');
                            if (vapiRef.current) { vapiRef.current.stop(); vapiRef.current = null; }
                            // Focus the input so user can see and edit
                            setTimeout(() => inputRef.current?.focus(), 200);
                        }, 2000);
                    }
                }
            }
        });

        vapi.start(assistantId).catch((err) => {
            console.error('[SitePilot] Failed to start Vapi call:', err);
            setVapiStatus('idle');
            setVapiActive(false);
        });
    }, []);

    const endVapiCall = useCallback(() => {
        if (vapiRef.current) { vapiRef.current.stop(); vapiRef.current = null; }
        setVapiActive(false);
        setVapiStatus('idle');
    }, []);

    const toggleVapiMute = useCallback(() => {
        if (vapiRef.current) { vapiRef.current.setMuted(!vapiMuted); setVapiMuted(!vapiMuted); }
    }, [vapiMuted]);

    // Auto-scroll Vapi transcript
    useEffect(() => {
        if (vapiScrollRef.current) vapiScrollRef.current.scrollTo({ top: vapiScrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [vapiTranscript]);

    return (
        <div className="h-screen bg-[var(--color-background)] text-[var(--color-foreground)] flex flex-row overflow-hidden selection:bg-[#3b82f6]/20">

            {/* ── Persistent History Sidebar ─── */}
            <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)]/40 z-10">
                {/* Header */}
                <div className="px-4 pt-5 pb-3 flex items-center gap-2">
                    <History size={13} className="text-[var(--color-muted-foreground)]" />
                    <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Recent Projects</span>
                    {sessionList.length > 0 && (
                        <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--color-muted-foreground)]">{sessionList.length}</span>
                    )}
                </div>

                {/* New Chat */}
                <div className="px-3 pb-3">
                    <button onClick={() => { handleNewSession(); fetchSessions(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)] border border-[var(--color-border)] transition-all">
                        <MessageSquare size={12} />
                        New Chat
                    </button>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {historyLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={14} className="animate-spin text-[var(--color-muted-foreground)]" />
                        </div>
                    ) : sessionList.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-[11px] text-[var(--color-muted-foreground)] opacity-50">No recent projects</p>
                            <p className="text-[10px] text-[var(--color-muted-foreground)] opacity-30 mt-1">Sessions auto-save as you chat</p>
                        </div>
                    ) : (
                        sessionList.map(s => (
                            <button
                                key={s._id}
                                onClick={() => handleLoadSession(s._id)}
                                className={`group w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-[var(--color-border)]/60 transition-colors ${sessionId === s._id ? 'bg-[var(--color-border)]/80 border-l-2 border-l-[#3b82f6]' : 'border-l-2 border-l-transparent'
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate leading-snug ${sessionId === s._id ? 'text-[var(--color-foreground)]' : 'text-[var(--color-foreground)]/80'
                                        }`}>{s.title}</p>
                                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                                        {new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteSession(s._id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-muted-foreground)] hover:text-red-400 transition-all flex-shrink-0"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* ── Right content area ─── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* ── Ambient glow ─── */}
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08)_0%,transparent_60%)] pointer-events-none z-0" />

                {/* ── Header ─── */}
                <header className="w-[calc(100%-2rem)] sticky top-4 z-50 bg-[var(--color-card)]/60 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl mx-auto mt-4 transition-all hover:bg-[var(--color-card)]/80 flex-shrink-0">
                    <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="text-lg font-extrabold tracking-widest text-[var(--color-foreground)] drop-shadow-sm hover:text-[#3b82f6] transition-colors">
                                MYTH
                            </Link>
                            <span className="text-[var(--color-muted-foreground)]">/</span>
                            <span className="text-[var(--color-foreground)] font-medium">SaaS Copilot</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <StatusDot status={connectionStatus} />
                            <button onClick={() => setShowConnectionPanel(!showConnectionPanel)}
                                className="text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[#3b82f6]/30 transition-all">
                                <Settings2 size={12} className="inline mr-1.5 -mt-0.5" />
                                {showConnectionPanel ? 'Hide' : 'Settings'}
                            </button>
                            <ThemeToggle className="border-[var(--color-border)] hover:border-[#3b82f6]/30 bg-[var(--color-background)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" />
                            {messages.length > 0 && (
                                <button onClick={handleNewSession}
                                    className="text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[#3b82f6]/30 transition-all">
                                    <MessageSquare size={12} className="inline mr-1.5 -mt-0.5" />
                                    New Chat
                                </button>
                            )}
                            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[#3b82f6]/30 transition-all">
                                <ArrowLeft size={12} />
                                <span className="hidden sm:inline">Dashboard</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* ── Connection Panel ─── */}
                <AnimatePresence>
                    {showConnectionPanel && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden z-10 flex-shrink-0 mx-auto w-full px-4">
                            <div className="mt-3 bg-[var(--color-card)]/60 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-5">
                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="flex-1 min-w-[220px]">
                                        <label className="block text-[11px] text-[var(--color-muted-foreground)] uppercase tracking-wider mb-1.5 font-semibold">WebSocket URL</label>
                                        <input value={wsUrl} onChange={e => setWsUrl(e.target.value)} placeholder="wss://..."
                                            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]/50 outline-none focus:border-[#3b82f6]/40 transition-all" />
                                    </div>
                                    <div className="min-w-[180px]">
                                        <label className="block text-[11px] text-[var(--color-muted-foreground)] uppercase tracking-wider mb-1.5 font-semibold">Token</label>
                                        <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="gateway token"
                                            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]/50 outline-none focus:border-[#3b82f6]/40 transition-all" />
                                    </div>
                                    <div className="flex gap-2">
                                        {!isConnected ? (
                                            <button onClick={handleConnect} disabled={!wsUrl.trim() || !token.trim() || connectionStatus === 'connecting'}
                                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#3b82f6]/20">
                                                {connectionStatus === 'connecting' ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                                                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                                            </button>
                                        ) : (
                                            <button onClick={handleDisconnect}
                                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                                                <WifiOff size={14} /> Disconnect
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {connectionError && (
                                    <div className="mt-3 flex items-start gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-red-400">{connectionError}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Main area: Chat + SitePilot Card ─── */}
                <div className="flex-1 flex overflow-hidden relative z-10 mx-auto w-full px-4 py-4 gap-4">
                    {/* ── Chat column ─── */}
                    <div className="flex-1 flex flex-col min-w-0">

                        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
                            <div className="max-w-3xl mx-auto py-4 space-y-1">

                                {/* Empty state */}
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                            <div className="w-16 h-16 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#3b82f6]/10">
                                                <Sparkles size={28} className="text-[#3b82f6]" />
                                            </div>
                                            <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-2">MYTH SaaS Copilot</h2>
                                            <p className="text-sm text-[var(--color-muted-foreground)] max-w-md leading-relaxed mb-8">
                                                {isConnected
                                                    ? 'Connected! Send a message to start — the agent can read files, run commands, browse the web, and write code.'
                                                    : connectionStatus === 'connecting' ? 'Connecting to gateway...' : 'Connect to a gateway to chat with the AI agent.'}
                                            </p>
                                            {isConnected && (
                                                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                                                    {['Build me a landing page', 'List all files', 'Create a REST API', 'Deploy to Vercel'].map(prompt => (
                                                        <button key={prompt} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                                                            className="text-sm text-[var(--color-muted-foreground)] hover:text-[#3b82f6] px-4 py-2 rounded-xl border border-[var(--color-border)] hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/5 transition-all">
                                                            {prompt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                )}

                                {/* Messages */}
                                {messages.map((msg) => (
                                    <div key={msg.id} className="mb-5">
                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                                                    <Bot size={14} className="text-[#3b82f6]" />
                                                </div>
                                            )}
                                            <div className="max-w-2xl flex flex-col">
                                                {msg.content && (
                                                    <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user'
                                                        ? 'bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/20'
                                                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)]'
                                                        }`}>
                                                        {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                                                    </div>
                                                )}
                                                {msg.toolCalls.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {msg.toolCalls.map(tool => <ToolCallCard key={tool.id} tool={tool} />)}
                                                    </div>
                                                )}
                                                <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[10px] text-[var(--color-muted-foreground)]/40">{formatTime(msg.timestamp)}</span>
                                                    {msg.state === 'streaming' && <span className="text-[10px] text-[#3b82f6] font-medium">streaming...</span>}
                                                </div>
                                            </div>
                                            {msg.role === 'user' && (
                                                <div className="w-8 h-8 rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border)] flex items-center justify-center ml-3 mt-1 flex-shrink-0">
                                                    <User size={14} className="text-[var(--color-muted-foreground)]" />
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                ))}

                                {/* Streaming indicator */}
                                {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
                                            <Bot size={14} className="text-[#3b82f6]" />
                                        </div>
                                        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl px-4 py-3">
                                            <StreamingDots />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Agent activity log ─── */}
                        {agentLogs.length > 0 && (
                            <div className="flex-shrink-0 border-t border-[var(--color-border)]">
                                <button onClick={() => setShowLogs(!showLogs)}
                                    className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-[var(--color-card)]/40 transition-colors">
                                    <Clock size={11} className="text-[#3b82f6]" />
                                    <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Agent Activity</span>
                                    <span className="text-[10px] text-[var(--color-muted-foreground)]/50 ml-1">{agentLogs.length}</span>
                                    <div className="flex-1" />
                                    {showLogs ? <ChevronDown size={11} className="text-[var(--color-muted-foreground)]" /> : <ChevronRight size={11} className="text-[var(--color-muted-foreground)]" />}
                                </button>
                                <AnimatePresence>
                                    {showLogs && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className="max-h-32 overflow-y-auto scrollbar-hide bg-[var(--color-card)]/30 border-t border-[var(--color-border)]">
                                                {agentLogs.slice(-10).map(log => <AgentLogItem key={log.id} log={log} />)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* ── Input Area ─── */}
                        <div className="pt-3 pb-2 flex-shrink-0">
                            <div className="max-w-3xl mx-auto">
                                <div className={`flex gap-3 items-end bg-[var(--color-card)]/60 backdrop-blur-xl border rounded-2xl px-4 py-3 transition-all ${isConnected ? 'border-[var(--color-border)] focus-within:border-[#3b82f6]/40 focus-within:shadow-lg focus-within:shadow-[#3b82f6]/5' : 'border-[var(--color-border)]/50 opacity-50'
                                    }`}>
                                    <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown} disabled={!isConnected}
                                        placeholder={isConnected ? 'Message MYTH Copilot... (Shift+Enter for new line)' : 'Connecting to gateway...'}
                                        rows={1}
                                        className="flex-1 bg-transparent text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] resize-none outline-none min-h-[24px] disabled:cursor-not-allowed"
                                        style={{ height: 'auto', maxHeight: '60vh', overflowY: 'auto' }}
                                        onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.6) + 'px'; }} />
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {isStreaming ? (
                                            <button onClick={handleAbort} title="Stop"
                                                className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all">
                                                <Square size={13} className="text-red-400" />
                                            </button>
                                        ) : (
                                            <button onClick={handleSend} disabled={!input.trim() || !isConnected}
                                                className="w-9 h-9 rounded-xl bg-[#3b82f6] flex items-center justify-center disabled:opacity-20 hover:bg-[#2563eb] shadow-lg shadow-[#3b82f6]/20 transition-all">
                                                <Send size={14} className="text-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-center text-[10px] text-[var(--color-muted-foreground)]/40 mt-2">MYTH SaaS Copilot • Protocol v3</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Preview panel (shown when deployment URL detected) ─── */}
                    <AnimatePresence>
                        {previewUrl && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 420, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
                            >
                                <div className="flex-1 flex flex-col bg-[var(--color-card)]/60 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                                        <div className="flex items-center gap-2">
                                            <Rocket size={13} className="text-[#3b82f6]" />
                                            <span className="text-xs font-semibold text-[var(--color-foreground)]">Live Preview</span>
                                        </div>
                                        <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-[#3b82f6] hover:underline">
                                            Open <ExternalLink size={10} />
                                        </a>
                                    </div>
                                    <div className="flex-1 bg-white">
                                        <iframe src={previewUrl} title="Preview" className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-popups" />
                                    </div>
                                    <div className="px-3 py-2 border-t border-[var(--color-border)]">
                                        <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{previewUrl}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── SitePilot Voice Card (right side) ─── */}
                    {!previewUrl && (
                        <div className="hidden lg:flex flex-col flex-shrink-0 w-[280px]">
                            <div className="flex-1 flex flex-col bg-[var(--color-card)]/60 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                {/* Card Header */}
                                <div className="px-5 py-4 border-b border-[var(--color-border)]">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={13} className="text-emerald-400" />
                                        <span className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">SitePilot</span>
                                    </div>
                                </div>

                                {/* Avatar + Info */}
                                <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
                                    {/* Avatar */}
                                    <div className="relative mb-5">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-cyan-500/20">
                                            <Bot size={36} className="text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[var(--color-background)] flex items-center justify-center">
                                            <Mic size={9} className="text-white" />
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-[var(--color-foreground)] mb-1">Voice Assistant</h3>
                                    <p className="text-[11px] text-[var(--color-muted-foreground)] text-center leading-relaxed mb-6 max-w-[200px]">
                                        Describe your project by voice. SitePilot will generate a detailed prompt for the copilot.
                                    </p>

                                    {/* Start Call Button */}
                                    <button
                                        onClick={startVapiCall}
                                        disabled={vapiActive}
                                        className="group w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Mic size={22} className="text-white group-hover:scale-110 transition-transform" />
                                    </button>
                                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-3">Click to start</p>
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 border-t border-[var(--color-border)]">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                                            <span className="text-[10px] text-[var(--color-muted-foreground)]">{isConnected ? 'Ready' : 'Offline'}</span>
                                        </div>
                                        <div className="flex-1" />
                                        <span className="text-[10px] text-[var(--color-muted-foreground)]/50">Vapi-powered</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ Vapi Call Overlay ═══ */}
                <AnimatePresence>
                    {vapiActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="w-full max-w-lg mx-4 bg-[#0c0c12] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
                            >
                                {/* Overlay Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                                            <Sparkles size={14} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">SitePilot Voice</p>
                                            <p className="text-[10px] text-gray-500">Describe your project by voice</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {vapiStatus === 'active' && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Live
                                            </div>
                                        )}
                                        {vapiStatus === 'connecting' && (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                Connecting
                                            </div>
                                        )}
                                        <button onClick={endVapiCall} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Voice Orb */}
                                <div className="flex flex-col items-center py-8">
                                    <div className="relative">
                                        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${vapiSpeaking ? 'bg-cyan-500/10 scale-150' : 'scale-100'}`} />
                                        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${vapiSpeaking ? 'bg-cyan-500/5 scale-[1.8]' : 'scale-100'}`} />
                                        <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${vapiStatus === 'active' ? 'bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/30'
                                            : vapiStatus === 'connecting' ? 'bg-gray-700 animate-pulse'
                                                : 'bg-gray-800'
                                            }`}>
                                            {vapiStatus === 'active' ? (
                                                <div className="flex items-center gap-0.5">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div key={i} className="w-0.5 bg-white rounded-full transition-all duration-150"
                                                            style={{ height: `${6 + (vapiVolume * 16) + Math.sin(Date.now() / 200 + i) * 3}px` }} />
                                                    ))}
                                                </div>
                                            ) : vapiStatus === 'connecting' ? (
                                                <Loader2 size={20} className="text-white animate-spin" />
                                            ) : (
                                                <Mic size={20} className="text-gray-500" />
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-4 text-xs text-gray-500">
                                        {vapiStatus === 'connecting' && 'Connecting to SitePilot...'}
                                        {vapiStatus === 'active' && (vapiSpeaking ? 'SitePilot is speaking...' : 'Listening...')}
                                        {vapiStatus === 'ended' && 'Generating prompt...'}
                                    </p>
                                </div>

                                {/* Transcript */}
                                <div className="px-6 pb-3">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">Transcript</p>
                                    <div ref={vapiScrollRef} className="h-[180px] overflow-y-auto space-y-2 scrollbar-hide">
                                        {vapiTranscript.filter(t => t.isFinal || !vapiTranscript.some(o => o.role === t.role && o.isFinal)).map((msg, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-[#3b82f6] text-white'
                                                    : 'bg-white/[0.04] border border-white/[0.06] text-gray-400'
                                                    } ${!msg.isFinal ? 'opacity-50' : ''}`}>
                                                    {!msg.isFinal && <span className="inline-block w-1 h-1 bg-current rounded-full animate-pulse mr-1 mb-px" />}
                                                    {msg.text}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {vapiTranscript.length === 0 && vapiStatus === 'active' && (
                                            <p className="text-center py-6 text-xs text-gray-700">Waiting for conversation...</p>
                                        )}
                                    </div>
                                </div>

                                {/* Call Controls */}
                                <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-center gap-3">
                                    {vapiStatus === 'active' && (
                                        <>
                                            <button onClick={toggleVapiMute}
                                                className={`p-3 rounded-full transition-all ${vapiMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'}`}>
                                                {vapiMuted ? <MicOff size={18} /> : <Mic size={18} />}
                                            </button>
                                            <button onClick={endVapiCall}
                                                className="px-5 py-2.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
                                                <PhoneOff size={14} />
                                                End Call
                                            </button>
                                        </>
                                    )}
                                    {vapiStatus === 'ended' && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Loader2 size={12} className="animate-spin text-cyan-400" />
                                            Generating your prompt...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
