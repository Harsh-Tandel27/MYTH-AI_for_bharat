'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { BlueprintData } from '../lib/prompt-generator';

/* ─── Types ─── */
interface TranscriptMessage {
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    isFinal: boolean;
}

interface VapiCallScreenProps {
    onBack: () => void;
    onBlueprintReady: (data: BlueprintData) => void;
}

/* ═══════════════════════════════════════════════════
   VapiCallScreen — Voice conversation with SitePilot
   ═══════════════════════════════════════════════════ */
export default function VapiCallScreen({ onBack, onBlueprintReady }: VapiCallScreenProps) {
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const vapiRef = useRef<Vapi | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isInitializedRef = useRef(false);
    const blueprintSentRef = useRef(false);

    // Auto-scroll transcript
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [transcript]);

    // Initialize Vapi — runs once on mount
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

        if (!publicKey || !assistantId) {
            console.error('[SitePilot] Missing Vapi keys — set NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID');
            return;
        }

        setCallStatus('connecting');
        const vapi = new Vapi(publicKey);
        vapiRef.current = vapi;

        vapi.on('call-start', () => setCallStatus('active'));
        vapi.on('call-end', () => setCallStatus('ended'));
        vapi.on('speech-start', () => setIsSpeaking(true));
        vapi.on('speech-end', () => setIsSpeaking(false));
        vapi.on('volume-level', (level: number) => setVolumeLevel(level));
        vapi.on('error', (error: any) => console.error('[SitePilot] Vapi error:', error));

        vapi.on('message', (msg: any) => {
            // Transcript messages
            if (msg.type === 'transcript') {
                const role = msg.role === 'assistant' ? 'assistant' : 'user';
                const isFinal = msg.transcriptType === 'final';

                if (isFinal) {
                    setTranscript(prev => {
                        const filtered = prev.filter(t => !(t.role === role && !t.isFinal));
                        return [...filtered, { role, text: msg.transcript, timestamp: new Date(), isFinal: true }];
                    });
                } else {
                    setTranscript(prev => {
                        const idx = prev.findIndex(t => t.role === role && !t.isFinal);
                        if (idx >= 0) {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], text: msg.transcript };
                            return updated;
                        }
                        return [...prev, { role, text: msg.transcript, timestamp: new Date(), isFinal: false }];
                    });
                }
            }

            // Tool calls — capture blueprint data
            if (msg.type === 'tool-calls' || msg.type === 'tool-call') {
                const toolCalls = msg.toolCallList || msg.toolCalls || [msg];
                for (const tc of toolCalls) {
                    if (tc.function?.name === 'generateProjectBlueprint' && !blueprintSentRef.current) {
                        blueprintSentRef.current = true;
                        const args = typeof tc.function.arguments === 'string'
                            ? JSON.parse(tc.function.arguments)
                            : tc.function.arguments;
                        // Delay to let assistant finish speaking
                        setTimeout(() => onBlueprintReady(args as BlueprintData), 3000);
                    }
                }
            }
        });

        vapi.start(assistantId).catch((error) => {
            console.error('[SitePilot] Failed to start call:', error);
            setCallStatus('idle');
        });

        return () => {
            if (vapiRef.current) { vapiRef.current.stop(); vapiRef.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMute = () => {
        if (vapiRef.current) {
            vapiRef.current.setMuted(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const endCall = () => {
        if (vapiRef.current) vapiRef.current.stop();
        setCallStatus('ended');
    };

    return (
        <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between h-14 px-5 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
                        <ArrowLeft size={17} />
                    </button>
                    <div className="w-px h-5 bg-white/[0.06]" />
                    <Sparkles size={16} className="text-cyan-400" />
                    <span className="text-sm font-medium text-gray-300">SitePilot Voice</span>
                </div>
                <div className="flex items-center gap-3">
                    {callStatus === 'active' && (
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </div>
                    )}
                    {callStatus === 'connecting' && (
                        <div className="flex items-center gap-2 text-sm text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Connecting...
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6">
                {/* Voice Indicator */}
                <div className="flex flex-col items-center justify-center py-10">
                    <div className="relative">
                        {/* Pulse rings */}
                        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-cyan-500/10 scale-150' : 'scale-100'
                            }`} />
                        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isSpeaking ? 'bg-cyan-500/5 scale-[1.8]' : 'scale-100'
                            }`} />
                        {/* Core orb */}
                        <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${callStatus === 'active' ? 'bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/30'
                                : callStatus === 'connecting' ? 'bg-gray-700 animate-pulse'
                                    : 'bg-gray-800'
                            }`}>
                            {callStatus === 'active' ? (
                                <div className="flex items-center gap-1">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="w-1 bg-white rounded-full transition-all duration-150"
                                            style={{ height: `${8 + (volumeLevel * 20) + Math.sin(Date.now() / 200 + i) * 4}px` }} />
                                    ))}
                                </div>
                            ) : callStatus === 'connecting' ? (
                                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <Mic size={24} className="text-gray-500" />
                            )}
                        </div>
                    </div>
                    <p className="mt-5 text-sm text-gray-500">
                        {callStatus === 'connecting' && 'Connecting to SitePilot...'}
                        {callStatus === 'active' && (isSpeaking ? 'SitePilot is speaking...' : 'Listening...')}
                        {callStatus === 'ended' && 'Call ended — generating your prompt...'}
                        {callStatus === 'idle' && 'Ready to start'}
                    </p>
                </div>

                {/* Transcript */}
                <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs uppercase tracking-[0.15em] text-gray-600 font-medium">Transcript</h3>
                        <span className="text-xs text-gray-700">{transcript.filter(t => t.isFinal).length} messages</span>
                    </div>
                    <div ref={scrollRef} className="h-[380px] overflow-y-auto space-y-3 pr-2">
                        {transcript.filter(t => t.isFinal || !transcript.some(o => o.role === t.role && o.isFinal && o.timestamp > t.timestamp)).map((msg, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-br-md'
                                        : 'bg-white/[0.04] border border-white/[0.06] text-gray-400 rounded-bl-md'
                                    } ${!msg.isFinal ? 'opacity-50' : ''}`}>
                                    {!msg.isFinal && <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-pulse mr-1.5 mb-0.5" />}
                                    {msg.text}
                                </div>
                            </motion.div>
                        ))}
                        {transcript.length === 0 && callStatus === 'active' && (
                            <div className="text-center py-10 text-sm text-gray-700">Waiting for conversation to begin...</div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="py-6 flex items-center justify-center gap-4">
                    {callStatus === 'active' && (
                        <>
                            <button onClick={toggleMute}
                                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'
                                    }`}>
                                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <button onClick={endCall}
                                className="px-6 py-3 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
                                <PhoneOff size={16} />
                                End Call
                            </button>
                        </>
                    )}
                    {callStatus === 'ended' && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <svg className="w-4 h-4 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Processing your blueprint...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
