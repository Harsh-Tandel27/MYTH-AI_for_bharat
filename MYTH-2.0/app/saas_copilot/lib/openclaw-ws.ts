/* ─── OpenClaw WebSocket Protocol v3 Client ─── */

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
    output?: string;
    status: 'running' | 'done' | 'error';
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    toolCalls: ToolCall[];
    state: 'streaming' | 'final' | 'error';
    runId?: string;
}

export interface OpenClawCallbacks {
    onConnectionChange: (status: ConnectionStatus) => void;
    onChatDelta: (runId: string, text: string) => void;
    onChatFinal: (runId: string, content: string) => void;
    onChatError: (runId: string, errorMessage: string) => void;
    onChatAborted: (runId: string) => void;
    onToolUse: (runId: string, name: string, input: Record<string, unknown>, status: string) => void;
    onToolResult: (runId: string, name: string, output: string, status: string) => void;
    onHistoryLoaded: (messages: ChatMessage[]) => void;
}

const SESSION_KEY = 'agent:main:main';
const PROTOCOL_VERSION = 3;
const MAX_RECONNECT_DELAY = 30000;
const LOG_PREFIX = '[OpenClaw]';

function log(...args: unknown[]) {
    console.log(LOG_PREFIX, ...args);
}
function logError(...args: unknown[]) {
    console.error(LOG_PREFIX, '❌', ...args);
}
function logWarn(...args: unknown[]) {
    console.warn(LOG_PREFIX, '⚠️', ...args);
}

export class OpenClawClient {
    private ws: WebSocket | null = null;
    private url = '';
    private token = '';
    private callbacks: OpenClawCallbacks;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private intentionalClose = false;
    private pendingRequests = new Map<string, (response: unknown) => void>();
    private handshakeId: string | null = null;

    constructor(callbacks: OpenClawCallbacks) {
        this.callbacks = callbacks;
    }

    /* ── Public API ─────────────────────────── */

    connect(url: string, token: string) {
        log('connect() called with URL:', url);
        this.url = url;
        this.token = token;
        this.intentionalClose = false;
        this.reconnectAttempts = 0;
        this._connect();
    }

    disconnect() {
        log('disconnect() called');
        this.intentionalClose = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close(1000, 'User disconnect');
            this.ws = null;
        }
        this.callbacks.onConnectionChange('disconnected');
    }

    sendChat(message: string): string {
        const id = crypto.randomUUID();
        const idempotencyKey = crypto.randomUUID();
        const frame = {
            type: 'req',
            id,
            method: 'chat.send',
            params: {
                sessionKey: SESSION_KEY,
                message,
                idempotencyKey,
            },
        };
        log('📤 chat.send:', message.slice(0, 80), '...');
        this._send(frame);
        return id;
    }

    abortChat() {
        log('📤 chat.abort');
        this._send({
            type: 'req',
            id: crypto.randomUUID(),
            method: 'chat.abort',
            params: { sessionKey: SESSION_KEY },
        });
    }

    loadHistory(limit = 50) {
        const id = crypto.randomUUID();
        log('📤 chat.history, limit:', limit);
        this._send({
            type: 'req',
            id,
            method: 'chat.history',
            params: { sessionKey: SESSION_KEY, limit },
        });
        this.pendingRequests.set(id, (res: unknown) => {
            const payload = res as { messages?: ChatMessage[] };
            this.callbacks.onHistoryLoaded(payload.messages || []);
        });
    }

    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /* ── Internal ───────────────────────────── */

    private _connect() {
        this.callbacks.onConnectionChange('connecting');
        log('🔌 Opening WebSocket to:', this.url);

        try {
            this.ws = new WebSocket(this.url);
        } catch (err) {
            logError('WebSocket constructor threw:', err);
            this.callbacks.onConnectionChange('error');
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            log('✅ WebSocket OPEN — readyState:', this.ws?.readyState);
            // Send handshake immediately (some gateways don't require challenge)
            this._sendHandshake();
        };

        this.ws.onmessage = (event) => {
            const raw = event.data as string;
            log('📥 RAW frame:', raw.length > 500 ? raw.slice(0, 500) + '...' : raw);

            try {
                const frame = JSON.parse(raw);
                this._handleFrame(frame);
            } catch (err) {
                logError('Failed to parse frame:', err, 'raw:', raw.slice(0, 200));
            }
        };

        this.ws.onerror = (event) => {
            logError('WebSocket ERROR event:', event);
            // Don't set error status here — wait for onclose which always follows
        };

        this.ws.onclose = (event) => {
            log('🔴 WebSocket CLOSED — code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean);
            this.handshakeId = null;

            if (!this.intentionalClose) {
                this.callbacks.onConnectionChange('disconnected');
                this._scheduleReconnect();
            }
        };
    }

    private _sendHandshake() {
        const id = crypto.randomUUID();
        this.handshakeId = id;

        const frame = {
            type: 'req',
            id,
            method: 'connect',
            params: {
                minProtocol: PROTOCOL_VERSION,
                maxProtocol: PROTOCOL_VERSION,
                client: {
                    id: 'openclaw-control-ui',
                    version: '1.0.0',
                    platform: 'web',
                    mode: 'webchat',
                },
                caps: ['tool-events'],
                commands: [],
                role: 'operator',
                scopes: ['operator.read', 'operator.write', 'operator.admin', 'operator.approvals', 'operator.pairing'],
                auth: { token: this.token },
            },
        };

        log('📤 Sending handshake frame:', JSON.stringify(frame).slice(0, 300));
        this._send(frame);

        this.pendingRequests.set(id, (res: unknown) => {
            log('📥 Handshake response payload:', JSON.stringify(res).slice(0, 500));
            const payload = res as { type?: string };
            if (payload?.type === 'hello-ok') {
                log('🎉 Handshake SUCCESS — hello-ok received');
                this.reconnectAttempts = 0;
                this.callbacks.onConnectionChange('connected');
            } else {
                logError('Handshake FAILED — unexpected payload type:', payload?.type);
                this.callbacks.onConnectionChange('error');
                this.disconnect();
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _handleFrame(frame: any) {
        // ── Response frames ──
        if (frame.type === 'res') {
            log(`📥 RES id=${frame.id} ok=${frame.ok}`);

            if (!frame.ok) {
                logError('Response ERROR:', JSON.stringify(frame.error || frame));
                // If this is the handshake that failed
                if (frame.id === this.handshakeId) {
                    logError('Handshake REJECTED by server:', frame.error);
                    this.callbacks.onConnectionChange('error');
                    return;
                }
            }

            const handler = this.pendingRequests.get(frame.id);
            if (handler) {
                this.pendingRequests.delete(frame.id);
                if (frame.ok) {
                    handler(frame.payload);
                }
            } else {
                log('No pending handler for response id:', frame.id);
            }
            return;
        }

        // ── Event frames ──
        if (frame.type === 'event') {
            const { event, payload } = frame;

            // Ignore operational events silently
            if (event === 'tick' || event === 'health' || event === 'heartbeat' || event === 'presence' || event === 'shutdown') return;

            // Handle connect.challenge (some gateways send this)
            if (event === 'connect.challenge') {
                log('📥 connect.challenge received (gateway requires challenge-response)');
                // Re-send handshake — the server is telling us it's ready
                // Our handshake was already sent on open, this is fine
                return;
            }

            log(`📥 EVENT: ${event}`, JSON.stringify(payload).slice(0, 300));

            if (event === 'chat') {
                const { runId, state, message, errorMessage } = payload;
                log(`  chat state=${state} runId=${runId}`);

                switch (state) {
                    case 'delta': {
                        const text = message?.content
                            ?.filter((c: { type: string }) => c.type === 'text')
                            .map((c: { text: string }) => c.text)
                            .join('') || '';
                        if (text) this.callbacks.onChatDelta(runId, text);
                        break;
                    }
                    case 'final': {
                        const text = message?.content
                            ?.filter((c: { type: string }) => c.type === 'text')
                            .map((c: { text: string }) => c.text)
                            .join('') || '';
                        this.callbacks.onChatFinal(runId, text);
                        break;
                    }
                    case 'error':
                        this.callbacks.onChatError(runId, errorMessage || 'Unknown error');
                        break;
                    case 'aborted':
                        this.callbacks.onChatAborted(runId);
                        break;
                }
            }

            if (event === 'agent-event') {
                const { runId, type, name, input, output, status } = payload;
                log(`  agent-event type=${type} name=${name} status=${status}`);

                if (type === 'tool_use') {
                    this.callbacks.onToolUse(runId, name, input || {}, status);
                } else if (type === 'tool_result') {
                    this.callbacks.onToolResult(runId, name, typeof output === 'string' ? output : JSON.stringify(output, null, 2), status);
                }
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const json = JSON.stringify(data);
            this.ws.send(json);
        } else {
            logWarn('Cannot send — WebSocket not open. readyState:', this.ws?.readyState);
        }
    }

    private _scheduleReconnect() {
        if (this.intentionalClose) return;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), MAX_RECONNECT_DELAY);
        this.reconnectAttempts++;
        log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => {
            log('🔄 Reconnecting...');
            this._connect();
        }, delay);
    }
}
