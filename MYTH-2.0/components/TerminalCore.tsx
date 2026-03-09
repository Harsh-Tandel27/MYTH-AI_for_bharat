'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TerminalCoreProps {
    sandboxId?: string;
}

export default function TerminalCore({ sandboxId }: TerminalCoreProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const currentLineRef = useRef('');
    const isExecutingRef = useRef(false);

    useEffect(() => {
        let terminal: any;
        let fitAddon: any;

        const initTerminal = async () => {
            const { Terminal } = await import('@xterm/xterm');
            const { FitAddon } = await import('@xterm/addon-fit');
            const { WebLinksAddon } = await import('@xterm/addon-web-links');

            // Import xterm CSS - use require for CSS in client component
            if (typeof window !== 'undefined') {
                require('@xterm/xterm/css/xterm.css');
            }

            terminal = new Terminal({
                theme: {
                    background: '#0d0d0d',
                    foreground: '#e5e5e5',
                    cursor: '#a855f7',
                    cursorAccent: '#0d0d0d',
                    selectionBackground: '#a855f780',
                    black: '#1c1c1c',
                    red: '#f87171',
                    green: '#4ade80',
                    yellow: '#fbbf24',
                    blue: '#60a5fa',
                    magenta: '#c084fc',
                    cyan: '#22d3ee',
                    white: '#e5e5e5',
                    brightBlack: '#4b5563',
                    brightRed: '#fca5a5',
                    brightGreen: '#86efac',
                    brightYellow: '#fcd34d',
                    brightBlue: '#93c5fd',
                    brightMagenta: '#d8b4fe',
                    brightCyan: '#67e8f9',
                    brightWhite: '#ffffff',
                },
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, monospace',
                fontSize: 13,
                lineHeight: 1.4,
                cursorBlink: true,
                cursorStyle: 'bar',
                scrollback: 1000,
            });

            fitAddon = new FitAddon();
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(new WebLinksAddon());

            if (terminalRef.current) {
                terminal.open(terminalRef.current);
                fitAddon.fit();
            }

            xtermRef.current = terminal;
            fitAddonRef.current = fitAddon;

            // Welcome message
            terminal.writeln('\x1b[1;35m╔═══════════════════════════════════════════════════════╗\x1b[0m');
            terminal.writeln('\x1b[1;35m║\x1b[0m  \x1b[1;36m🚀 MYTH Terminal\x1b[0m                                      \x1b[1;35m║\x1b[0m');
            terminal.writeln('\x1b[1;35m║\x1b[0m  \x1b[90mRun commands in your sandbox environment\x1b[0m              \x1b[1;35m║\x1b[0m');
            terminal.writeln('\x1b[1;35m╚═══════════════════════════════════════════════════════╝\x1b[0m');
            terminal.writeln('');
            terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');

            // Handle input
            terminal.onData((data: string) => {
                if (isExecutingRef.current) return;

                const char = data;
                const currentLine = currentLineRef.current;

                switch (char) {
                    case '\r': // Enter
                        terminal.writeln('');
                        if (currentLine.trim()) {
                            executeCommand(currentLine.trim(), terminal);
                            setCommandHistory(prev => [...prev, currentLine.trim()]);
                            setHistoryIndex(-1);
                        } else {
                            terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
                        }
                        currentLineRef.current = '';
                        break;
                    case '\x7f': // Backspace
                        if (currentLine.length > 0) {
                            currentLineRef.current = currentLine.slice(0, -1);
                            terminal.write('\b \b');
                        }
                        break;
                    case '\x03': // Ctrl+C
                        terminal.writeln('^C');
                        currentLineRef.current = '';
                        terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
                        break;
                    case '\x1b[A': // Up arrow
                        if (commandHistory.length > 0) {
                            const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
                            setHistoryIndex(newIndex);
                            const historyCmd = commandHistory[commandHistory.length - 1 - newIndex];
                            // Clear current line
                            terminal.write('\r\x1b[K\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ' + historyCmd);
                            currentLineRef.current = historyCmd;
                        }
                        break;
                    case '\x1b[B': // Down arrow
                        if (historyIndex > 0) {
                            const newIndex = historyIndex - 1;
                            setHistoryIndex(newIndex);
                            const historyCmd = commandHistory[commandHistory.length - 1 - newIndex];
                            terminal.write('\r\x1b[K\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ' + historyCmd);
                            currentLineRef.current = historyCmd;
                        } else if (historyIndex === 0) {
                            setHistoryIndex(-1);
                            terminal.write('\r\x1b[K\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
                            currentLineRef.current = '';
                        }
                        break;
                    default:
                        if (char >= ' ') {
                            currentLineRef.current += char;
                            terminal.write(char);
                        }
                }
            });

            setIsReady(true);
        };

        initTerminal();

        // Handle resize
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (terminal) {
                terminal.dispose();
            }
        };
    }, []);

    const executeCommand = async (command: string, terminal: any) => {
        isExecutingRef.current = true;

        // Handle built-in commands
        if (command === 'clear' || command === 'cls') {
            terminal.clear();
            terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
            isExecutingRef.current = false;
            return;
        }

        if (command === 'help') {
            terminal.writeln('\x1b[1;36mAvailable commands:\x1b[0m');
            terminal.writeln('  \x1b[33mls\x1b[0m              - List files');
            terminal.writeln('  \x1b[33mnpm install\x1b[0m     - Install packages');
            terminal.writeln('  \x1b[33mnpm run dev\x1b[0m     - Start dev server (already running)');
            terminal.writeln('  \x1b[33mcat <file>\x1b[0m      - View file contents');
            terminal.writeln('  \x1b[33mclear\x1b[0m           - Clear terminal');
            terminal.writeln('  \x1b[33mhelp\x1b[0m            - Show this help');
            terminal.writeln('');
            terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
            isExecutingRef.current = false;
            return;
        }

        try {
            terminal.writeln('\x1b[90mExecuting...\x1b[0m');

            const response = await fetch('/api/run-command-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command }),
            });

            if (!response.ok) {
                const data = await response.json();
                terminal.writeln(`\x1b[31mError: ${data.error || 'Command failed'}\x1b[0m`);
                terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
                isExecutingRef.current = false;
                return;
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                switch (data.type) {
                                    case 'stdout':
                                        terminal.write(data.content.replace(/\n/g, '\r\n'));
                                        break;
                                    case 'stderr':
                                        terminal.write(`\x1b[33m${data.content.replace(/\n/g, '\r\n')}\x1b[0m`);
                                        break;
                                    case 'error':
                                        terminal.writeln(`\x1b[31m${data.message}\x1b[0m`);
                                        break;
                                    case 'complete':
                                        break;
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            terminal.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
        }

        terminal.writeln('');
        terminal.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~/app\x1b[0m $ ');
        isExecutingRef.current = false;
    };

    return (
        <div
            ref={terminalRef}
            className="h-full w-full overflow-hidden"
            style={{ backgroundColor: '#0d0d0d' }}
        />
    );
}
