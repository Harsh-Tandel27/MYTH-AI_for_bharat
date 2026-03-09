'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MichiBot from "@/components/MichiBot";
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    FiFile,
    FiChevronRight,
    FiChevronDown,
    BsFolderFill,
    BsFolder2Open,
    SiJavascript,
    SiReact,
    SiCss3,
    SiJson,
    FiX,
    FiImage,
    FiFileText,
    FiUploadCloud,
    FiPaperclip
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import CodeApplicationProgress, { type CodeApplicationState } from '@/components/CodeApplicationProgress';
import ActionSteps, { PlanView, type ActionStep, type ActionStatus } from '@/components/ActionSteps';


interface SandboxData {
    sandboxId: string;
    url: string;
}
interface ChatMessage {
    content: string;
    type: 'user' | 'ai' | 'system' | 'command' | 'error';
    timestamp: Date;
    metadata?: { appliedFiles?: string[]; imageUrls?: string[] };
}
interface GeneratedFile {
    path: string;
    content: string;
    type: string;
    completed: boolean;
    edited?: boolean;
}
interface ApplicationVersion {
    id: number;
    timestamp: Date;
    files: GeneratedFile[];
    prompt: string;
    type: 'creation' | 'edit';
}
const styleOptions = ["Neobrutalist", "Glassmorphism", "Minimalist", "Dark Mode", "Gradient", "Retro", "Modern", "Monochrome"];

// Helper to convert an image file to Base64
const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

const FiMic = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);

// Helper to extract text from a PDF file using a stable CDN worker.
const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
        const pdfjsLib = await import('pdfjs-dist');
        const version = pdfjsLib.version || '5.4.149';
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: true,
            isEvalSupported: false,
        });

        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => (item.str !== undefined ? item.str : ''))
                .join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error("PDF Extraction error details:", error);
        throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

function ApplicationAIContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sandboxCreationAttempted = useRef(false);
    const projectLoadingRef = useRef(false); // Synchronous flag to prevent race conditions

    const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ text: 'Not connected', active: false });
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { content: 'Welcome! Describe the React Native application you want to build. I\'ll generate the full Expo codebase for you, which you can then edit with chat.', type: 'system', timestamp: new Date() }
    ]);
    const [aiChatInput, setAiChatInput] = useState('');
    const [aiModel, setAiModel] = useState(() => (searchParams.get('model') && appConfig.ai.availableModels.includes(searchParams.get('model')!)) ? searchParams.get('model')! : appConfig.ai.defaultModel);
    const [showHomeScreen, setShowHomeScreen] = useState(true);
    const [homeScreenFading, setHomeScreenFading] = useState(false);
    const [homePromptInput, setHomePromptInput] = useState('');
    const [homeStyleInput, setHomeStyleInput] = useState<string | null>(null);
    const [homeFiles, setHomeFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState<'code' | 'terminal' | 'preview'>('terminal');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components']));
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [loadingStage, setLoadingStage] = useState<'planning' | 'generating' | 'deploying' | null>(null);
    const [conversationContext, setConversationContext] = useState<{ appliedCode: Array<{ files: string[]; timestamp: Date }>; lastGeneratedCode?: string; }>({ appliedCode: [], lastGeneratedCode: undefined });
    const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({ stage: null });
    const [generationProgress, setGenerationProgress] = useState<{
        isGenerating: boolean; status: string; isStreaming: boolean; isThinking: boolean; thinkingText?: string;
        currentFile: GeneratedFile | null; files: GeneratedFile[]; isEdit?: boolean;
    }>({ isGenerating: false, status: '', isStreaming: false, isThinking: false, files: [], currentFile: null });
    const [applicationHistory, setApplicationHistory] = useState<ApplicationVersion[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
    const [isActionsExpanded, setIsActionsExpanded] = useState(true);
    const [chatImages, setChatImages] = useState<{ timestamp: Date; file: File; dataUrl: string }[]>([]);

    // ApplicationAI-specific state: Terminal output and QR code
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [expoStatus, setExpoStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
    const terminalStreamRef = useRef<EventSource | null>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Project persistence state
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled Project');
    const [userProjects, setUserProjects] = useState<any[]>([]);
    const [isProjectsListOpen, setIsProjectsListOpen] = useState(false);
    const [projectLoadingMessage, setProjectLoadingMessage] = useState<string | null>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const codeDisplayRef = useRef<HTMLDivElement>(null);
    const historyPanelRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatFileInputRef = useRef<HTMLInputElement>(null);

    const isCreatingRef = useRef(false);
    const isGeneratingRef = useRef(false);


    const handleMicTimeout = () => console.log('Mic timeout');

    const isListeningHome = false;
    const toggleListeningHome = () => { };
    const isListeningChat = false;
    const toggleListeningChat = () => { };

    const botVariants = {
        entry: { top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 0.9, opacity: 1 },
        home: { top: 'calc(50% - 220px)', left: '50%', x: '-50%', y: '-50%', scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20, duration: 1.2 } },
        app: { top: 'auto', left: '20px', bottom: '20px', x: '0%', y: '0%', scale: 0.5, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20, duration: 1.2, delay: 0.2 } },
    } as const;

    useEffect(() => {
        // Auto-creation logic removed
        console.log('[ApplicationAI] Auto-creation disabled');
    }, [projectLoadingMessage]);

    useEffect(() => {
        if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }, [chatMessages, codeApplicationState]);

    useEffect(() => {
        if (codeDisplayRef.current && generationProgress.isStreaming) {
            codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
        }
    }, [generationProgress.files, generationProgress.isStreaming, generationProgress.currentFile]);

    // Terminal autoscroll
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [terminalOutput]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyPanelRef.current && !historyPanelRef.current.contains(event.target as Node)) {
                setIsHistoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // Session recovery from localStorage
    useEffect(() => {
        // Logic removed for dismantling
        console.log('[ApplicationAI] Session recovery disabled');
    }, []);

    // Helper to generate QR code SVG from Expo URL
    const generateQRCode = async (url: string) => {
        // Logic removed
        console.log('[QR] Logic disabled');
    };

    // Helper to connect to terminal stream
    const connectTerminalStream = (sandboxId: string) => {
        // Logic removed
        console.log('[Terminal] Stream logic disabled');
    };

    // Cleanup terminal stream on unmount
    useEffect(() => {
        return () => {
            if (terminalStreamRef.current) {
                terminalStreamRef.current.close();
            }
        };
    }, []);

    // Fetch user projects on mount
    useEffect(() => {
        // Project fetching removed
        console.log('[ApplicationAI] Projects list disabled');
    }, []);

    useEffect(() => {
        // Auto-save removed
        console.log('[AutoSave] logic disabled');
    }, [currentProjectId, currentProjectName, sandboxData, generationProgress.files, chatMessages]);

    const updateStatus = (text: string, active: boolean) => setStatus({ text, active });

    const saveChatMessageToDb = async (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
        // Logic removed
    };

    const addChatMessage = (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
        setChatMessages(prev => [...prev, { content, type, timestamp: new Date(), metadata }]);
        // Save to database asynchronously (don't await to avoid blocking UI)
        saveChatMessageToDb(content, type, metadata);
    };

    // Helper to add/update action steps for Bolt-like UI
    const addActionStep = useCallback((step: any) => { }, []);
    const updateActionStep = useCallback((id: string, updates: any) => { }, []);
    // Helper to add chat messages and save history
    const saveToHistory = useCallback((prompt: string, type: 'creation' | 'edit', files: GeneratedFile[]) => {
        const newVersion: ApplicationVersion = {
            id: Date.now(),
            timestamp: new Date(),
            files: [...files],
            prompt,
            type
        };
        setApplicationHistory(prev => [newVersion, ...prev]);
        setConversationContext(prev => ({ ...prev, lastGeneratedCode: files[0]?.content }));
    }, []);

    const returnToHome = () => {
        router.push("/");
    };

    const forceIframeReload = (url: string) => {
        // Logic removed
    };

    const createSandbox = async (isInitial = false) => {
        // Sandbox creation logic removed for dismantling
        console.log('[CreateSandbox] Logic disabled');
        return null;
    };

    const loadProject = async (projectId: string) => {
        // Project loading logic removed
        console.log('[LoadProject] Logic disabled');
    };

    // Helper to read fetch body line by line
    async function* readLines(reader: ReadableStreamDefaultReader<Uint8Array>) {
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                yield line;
            }
        }
        if (buffer) yield buffer;
    }

    const generateCode = async (prompt: string, isEdit: boolean = false, overrideSandboxId?: string) => {
        setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: isEdit ? 'Analyzing edits...' : 'Generating mobile app code...' }));
        let localFiles: GeneratedFile[] = [];
        let accumulatedRawCode = '';

        const activeSandboxId = overrideSandboxId || sandboxData?.sandboxId;

        if (!activeSandboxId) {
            addChatMessage('Error: No active sandbox ID found for generation.', 'error');
            setGenerationProgress(prev => ({ ...prev, isGenerating: false }));
            return [];
        }

        console.log('[GenerateCode] Starting fetch call for sandbox:', activeSandboxId);
        try {
            const response = await fetch('/api/applicationai/generate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    style: homeStyleInput,
                    model: aiModel,
                    sandboxId: activeSandboxId,
                    isEdit,
                    currentCodebase: isEdit ? generationProgress.files : []
                }),
            });

            console.log('[GenerateCode] Fetch response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            if (!response.body) return [];
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep partial line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(trimmedLine.slice(6));
                        if (data.type === 'stream' && data.text) {
                            accumulatedRawCode += data.text;
                            if (accumulatedRawCode.length % 500 < 50) { // Log every ~500 chars
                                console.log('[GenerateCode] Accumulated raw text length:', accumulatedRawCode.length);
                            }

                            // Parse files from the accumulated AI text
                            const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
                            let match;
                            const parsed: GeneratedFile[] = [];
                            while ((match = fileRegex.exec(accumulatedRawCode)) !== null) {
                                parsed.push({
                                    path: match[1],
                                    content: match[2].trim(),
                                    type: match[1].split('.').pop() || 'javascript',
                                    completed: true
                                });
                            }

                            if (parsed.length > localFiles.length) {
                                localFiles = parsed;
                                setGenerationProgress(prev => ({ ...prev, files: parsed }));
                                if (!selectedFile && parsed.length > 0) setSelectedFile(parsed[0].path);
                            }
                        } else if (data.type === 'error') {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        // Silent catch for incomplete JSON is handled by the buffer
                    }
                }
            }
        } catch (e: any) {
            addChatMessage(`Generation failed: ${e.message}`, 'error');
        }

        setGenerationProgress(prev => ({ ...prev, isGenerating: false }));
        return localFiles;
    };

    const applyFiles = async (sandboxId: string, files: GeneratedFile[]) => {
        const res = await fetch('/api/applicationai/apply-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sandboxId, files })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to apply files to sandbox');
        }
    };

    const handlePromptGenerate = async () => {
        if (!homePromptInput || !homeStyleInput || generationProgress.isGenerating) return;

        const originalPrompt = homePromptInput;
        setLoading(true);
        setHomeScreenFading(true);
        setTimeout(() => setShowHomeScreen(false), 500);

        setTerminalOutput([]);
        setQrCodeDataUrl(null);
        setQrCodeUrl(null);
        setExpoStatus('starting');
        setChatMessages([{ content: homePromptInput, type: 'user', timestamp: new Date() }]);

        let fileInstructions = '';
        if (homeFiles.length > 0) {
            try {
                const pdfs = homeFiles.filter(f => f.type === 'application/pdf');
                const images = homeFiles.filter(f => f.type.startsWith('image/'));
                let extractedPdfText = '';

                if (pdfs.length > 0) {
                    for (const pdfFile of pdfs) {
                        try {
                            const text = await extractTextFromPdf(pdfFile);
                            extractedPdfText += `\n\n--- START OF PDF CONTENT: ${pdfFile.name} ---\n\n${text}\n\n--- END OF PDF CONTENT: ${pdfFile.name} ---\n\n`;
                        } catch (pdfError) {
                            console.error(`Error processing PDF ${pdfFile.name}:`, pdfError);
                        }
                    }
                }

                if (images.length > 0 && pdfs.length > 0) {
                    fileInstructions = `\n**FILE CONTEXT:** The user provided images for design and PDFs for content. [PDF Content]: ${extractedPdfText}`;
                } else if (images.length > 0) {
                    fileInstructions = `\n**FILE CONTEXT:** The user provided images for design reference.`;
                } else if (pdfs.length > 0) {
                    fileInstructions = `\n**FILE CONTEXT:** The user provided PDF content: ${extractedPdfText}`;
                }
            } catch (error) {
                console.error("Error processing files:", error);
            }
        }

        const enrichedPrompt = `${homePromptInput}${fileInstructions}`;

        try {
            // Step 1: Create Sandbox
            setLoadingStage('planning');
            const sandboxRes = await fetch('/api/applicationai/create-sandbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: `app_${Date.now()}` })
            });
            const sandboxJson = await sandboxRes.json();
            if (!sandboxJson.success) throw new Error(sandboxJson.error);

            setSandboxData({ sandboxId: sandboxJson.sandboxId, url: sandboxJson.url });
            setStatus({ text: 'Sandbox Ready', active: true });
            console.log('[Build Flow] Sandbox Ready:', sandboxJson.sandboxId);
            setTerminalOutput(prev => [...prev, `\x1b[32m[Sandbox] Ready: ${sandboxJson.sandboxId}\x1b[0m`, `\x1b[32m[Working Dir] /home/user\x1b[0m\n`]);

            // Step 2: Setup Expo environment
            console.log('[Build Flow] Starting Step 2: Setup Expo');
            setLoadingStage('generating');
            const setupRes = await fetch('/api/applicationai/setup-expo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: sandboxJson.sandboxId })
            });

            if (!setupRes.body) throw new Error('Failed to start setup stream');
            const setupReader = setupRes.body.getReader();
            const setupDecoder = new TextDecoder();

            let setupBuffer = '';
            while (true) {
                const { done, value } = await setupReader.read();
                if (done) break;
                const chunk = setupDecoder.decode(value, { stream: true });
                setupBuffer += chunk;
                const lines = setupBuffer.split('\n');
                setupBuffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6));
                            if (data.type === 'stdout' || data.type === 'stderr') {
                                setTerminalOutput(prev => [...prev, data.content]);
                            }
                            if (data.type === 'error') throw new Error(data.content);
                        } catch (e) { }
                    }
                }
            }

            // Step 3: Generate Code (Streaming to UI)
            console.log('[Build Flow] Starting Step 3: Generate Code');
            addChatMessage('Generating mobile application source...', 'system');
            setActiveTab('code');
            const generatedFiles = await generateCode(enrichedPrompt, false, sandboxJson.sandboxId);
            console.log('[Build Flow] Step 3 Complete. Generated files:', generatedFiles.length);
            if (!generatedFiles.length) throw new Error('Code generation failed or returned no files');

            // Step 4: Apply Files to Sandbox (Bulk Write)
            console.log('[Build Flow] Starting Step 4: Apply Files');
            setLoadingStage('deploying');
            addChatMessage(`Deploying ${generatedFiles.length} files to sandbox...`, 'system');
            await applyFiles(sandboxJson.sandboxId, generatedFiles);
            console.log('[Build Flow] Step 4 Complete');

            // Step 5: Sync Dependencies
            addChatMessage('Synchronizing dependencies (npm install)...', 'system');
            const syncRes = await fetch('/api/applicationai/sync-deps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: sandboxJson.sandboxId })
            });

            if (!syncRes.body) throw new Error('Failed to start sync stream');
            const syncReader = syncRes.body.getReader();
            const syncDecoder = new TextDecoder();

            let syncBuffer = '';
            while (true) {
                const { done, value } = await syncReader.read();
                if (done) break;
                const chunk = syncDecoder.decode(value, { stream: true });
                syncBuffer += chunk;
                const lines = syncBuffer.split('\n');
                syncBuffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6));
                            if (data.type === 'stdout' || data.type === 'stderr') {
                                setTerminalOutput(prev => [...prev, data.content]);
                            }
                            if (data.type === 'error') throw new Error(data.content);
                        } catch (e) { }
                    }
                }
            }

            // Step 6: Start Expo Dev Server
            setLoadingStage(null);
            setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: 'Starting Expo server...' }));
            setExpoStatus('starting');
            setActiveTab('terminal');
            addChatMessage('Starting Expo development server...', 'system');

            // 6.1: Trigger start
            const startRes = await fetch('/api/applicationai/start-expo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: sandboxJson.sandboxId })
            });
            if (!startRes.ok) throw new Error('Failed to initiate Expo server');

            // 6.2: Connect to log stream (for terminal visualization only)
            const logsRes = await fetch(`/api/applicationai/expo-logs?sandboxId=${sandboxJson.sandboxId}`);
            if (!logsRes.body) throw new Error('Failed to connect to Expo log stream');

            const logsReader = logsRes.body.getReader();
            const logsDecoder = new TextDecoder();

            // Handle logs stream in background
            (async () => {
                let logsBuffer = '';
                while (true) {
                    const { done, value } = await logsReader.read();
                    if (done) {
                        setExpoStatus('idle');
                        break;
                    }
                    const chunk = logsDecoder.decode(value, { stream: true });
                    logsBuffer += chunk;
                    const lines = logsBuffer.split('\n');
                    logsBuffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(trimmedLine.slice(6));
                                if (data.type === 'stdout' || data.type === 'stderr') {
                                    setTerminalOutput(prev => [...prev, data.content]);
                                }
                                // We still handle expo-url here as a fast-path, 
                                // but the primary reliable way is the polling below.
                                if (data.type === 'expo-url' && !qrCodeUrl) {
                                    console.log('[Build Flow] Received Expo URL from stream:', data.url);
                                    setQrCodeUrl(data.url);
                                    setExpoStatus('running');
                                    setActiveTab('preview');
                                    const dataUrl = await QRCode.toDataURL(data.url, { margin: 2, scale: 10 });
                                    setQrCodeDataUrl(dataUrl);
                                }
                            } catch (e) { }
                        }
                    }
                }
            })().catch(err => {
                console.error('Expo log stream error:', err);
                setExpoStatus('error');
            });

            // 6.3: Poll for QR Code (Robust derived URL extraction)
            const pollForQR = async () => {
                let attempts = 0;
                const maxAttempts = 120; // 4 minutes total (Metro can be slow in sandbox)

                while (attempts < maxAttempts) {
                    try {
                        const qrRes = await fetch('/api/applicationai/expo-qr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sandboxId: sandboxJson.sandboxId })
                        });

                        if (qrRes.status === 200) {
                            const data = await qrRes.json();
                            if (data.status === 'ready' && data.expo?.url) {
                                console.log('[Build Flow] Polled Expo URL:', data.expo.url);
                                setQrCodeUrl(data.expo.url);
                                setExpoStatus('running');
                                setActiveTab('preview');
                                const dataUrl = await QRCode.toDataURL(data.expo.url, { margin: 2, scale: 10 });
                                setQrCodeDataUrl(dataUrl);
                                addChatMessage('🚀 Expo server is LIVE! Scan the QR code to test.', 'system');

                                // Save initial creation to history
                                saveToHistory(originalPrompt, 'creation', generatedFiles);

                                return; // Success
                            }
                        }
                    } catch (e) {
                        console.error('[Build Flow] QR Poll error:', e);
                    }

                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
                }

                console.error('[Build Flow] Failed to retrieve Expo URL after polling.');
            };

            pollForQR();

        } catch (error: any) {
            console.error('[Build Flow] Error:', error);
            addChatMessage(`FATAL ERROR: ${error.message}`, 'error');
            setExpoStatus('error');
        } finally {
            setLoading(false);
            setLoadingStage(null);
        }
    };

    const sendAIRequest = async (aiPrompt: string, userPrompt: string, type: 'creation' | 'edit', isEdit: boolean, codebase: GeneratedFile[] | null = null, files?: { name: string; type: string; content: string }[], sandboxId?: string) => {
        // AI Request logic removed
        console.log('[SendAIRequest] Logic disabled');
    };

    const handleChatSubmit = async () => {
        if (!aiChatInput.trim() || loading || !sandboxData) return;

        const userInput = aiChatInput;
        addChatMessage(userInput, 'user');
        setAiChatInput('');
        setLoading(true);

        try {
            addChatMessage('Analyzing request and existing codebase...', 'system');

            // 1. Generate modifications
            const editPrompt = `BASED ON THE EXISTING CODEBASE, APPLY THIS CHANGE: ${userInput}`;
            setActiveTab('code');
            const modifiedFiles = await generateCode(editPrompt, true, sandboxData.sandboxId);

            if (modifiedFiles.length === 0) {
                addChatMessage('No changes were identified as necessary.', 'system');
                return;
            }

            addChatMessage(`Applying ${modifiedFiles.length} modified files...`, 'system');

            // 2. Apply files
            await applyFiles(sandboxData.sandboxId, modifiedFiles);

            // 3. Sync if package.json changed
            if (modifiedFiles.some(f => f.path === 'package.json')) {
                addChatMessage('Dependencies updated. Synchronizing...', 'system');
                await fetch('/api/applicationai/sync-deps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: sandboxData.sandboxId })
                });
            }

            addChatMessage('Changes applied successfully!', 'system');

            // 4. Update file list
            const filesRes = await fetch(`/api/applicationai/get-files?sandboxId=${sandboxData.sandboxId}`);
            if (filesRes.ok) {
                const filesData = await filesRes.json();
                if (filesData.success) {
                    setGenerationProgress(prev => ({ ...prev, files: filesData.files }));
                    // Save edit to history
                    saveToHistory(userInput, 'edit', filesData.files);
                }
            }

            setActiveTab('terminal');

        } catch (error: any) {
            console.error('[Chat Submit] Error:', error);
            addChatMessage(`Execution failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
            setGenerationProgress(prev => ({ ...prev, isGenerating: false }));
        }
    };
    const downloadZip = async () => {
        if (generationProgress.files.length === 0) return;

        try {
            const zip = new JSZip();
            generationProgress.files.forEach(file => {
                zip.file(file.path, file.content);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${currentProjectName.replace(/\s+/g, '_')}_mobile_app.zip`);
            addChatMessage('Project downloaded successfully!', 'system');
        } catch (error) {
            console.error('Download failed:', error);
            addChatMessage('Failed to generate ZIP file.', 'error');
        }
    };

    const reapplyLastGeneration = async () => {
        if (!conversationContext.lastGeneratedCode || !sandboxData) return;
        // Simple re-apply logic could just re-run applyFiles
        console.log('[Reapply] Logic triggered');
    };

    const handleLoadVersion = async (versionId: number) => {
        const version = applicationHistory.find(v => v.id === versionId);
        if (!version) return;

        setGenerationProgress(prev => ({ ...prev, files: version.files }));
        if (version.files.length > 0) setSelectedFile(version.files[0].path);

        // If we have an active sandbox, apply the files to it
        if (sandboxData?.sandboxId) {
            try {
                addChatMessage(`Restoring version from ${version.timestamp.toLocaleTimeString()} to sandbox...`, 'system');
                await applyFiles(sandboxData.sandboxId, version.files);
                addChatMessage('Sandbox updated successfully.', 'system');
            } catch (error: any) {
                console.error('Failed to apply version to sandbox:', error);
                addChatMessage(`Failed to update sandbox: ${error.message}`, 'error');
            }
        } else {
            addChatMessage(`Loaded version from ${version.timestamp.toLocaleTimeString()} (Preview only - no active sandbox)`, 'system');
        }

        setIsHistoryOpen(false);
    };

    const handleDownloadVersion = async (versionId: number) => {
        const version = applicationHistory.find(v => v.id === versionId);
        if (!version || version.files.length === 0) return;

        try {
            const zip = new JSZip();
            version.files.forEach(file => {
                zip.file(file.path, file.content);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${currentProjectName.replace(/\s+/g, '_')}_v${versionId}.zip`);
        } catch (error) {
            console.error('Version download failed:', error);
        }
    };

    const toggleFolder = (folderPath: string) => setExpandedFolders(prev => { const newSet = new Set(prev); newSet.has(folderPath) ? newSet.delete(folderPath) : newSet.add(folderPath); return newSet; });
    const handleFileClick = (filePath: string) => setSelectedFile(filePath);
    const getFileIcon = (fileName: string) => { const ext = fileName.split('.').pop()?.toLowerCase(); if (['jsx', 'js'].includes(ext!)) return <SiJavascript className="w-4 h-4 text-yellow-400" />; if (['tsx', 'ts'].includes(ext!)) return <SiReact className="w-4 h-4 text-blue-400" />; if (ext === 'css') return <SiCss3 className="w-4 h-4 text-blue-400" />; if (ext === 'json') return <SiJson className="w-4 h-4 text-green-400" />; return <FiFile className="w-4 h-4 text-gray-400" />; };

    const handleFileDrop = (e: any) => { };
    const handleFileSelect = (e: any) => { };
    const handleRemoveFile = (fileName: string) => { };

    const renderHomeScreen = () => (
        <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${homeScreenFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/20 via-blue-400/10 to-transparent rounded-full blur-[80px] animate-[sunPulse_5s_ease-in-out_infinite]" />
                <div className="absolute bottom-0 left-1/2 w-[800px] h-[800px] animate-[orbShrink_3s_ease-out_forwards]" style={{ transform: 'translateX(-50%) translateY(45%)' }}><div className="relative w-full h-full"><div className="absolute inset-0 bg-blue-700/20 rounded-full blur-[100px] opacity-30 animate-pulse"></div><div className="absolute inset-32 bg-blue-500/30 rounded-full blur-[60px] opacity-50 animate-pulse" style={{ animationDelay: '0.6s' }}></div></div></div>
            </div>
            {/* CORRECTED ROUTE */}
            <Button variant="ghost" onClick={() => router.push("/")} size="icon" title="Go to Landing Page" className="absolute top-8 left-8 z-30 h-10 w-10 text-gray-300 bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-full transition-all hover:text-white hover:bg-gray-800/50 shadow-[0_0_15px_1px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_2px_rgba(59,130,246,0.5)] duration-200"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></Button>
            <div className="relative z-10 h-full flex items-center justify-center px-4 overflow-y-auto">
                <div className="text-center mt-70 max-w-5xl w-full mx-auto pb-8">
                    <div className="text-center pt-12"><h1 className="text-5xl lg:text-6xl text-white font-bold tracking-tight animate-[fadeIn_0.8s_ease-out]">MYTH</h1><p className="text-base lg:text-lg max-w-lg mx-auto mt-3 text-white/80">Build any React Native mobile app from an idea, in seconds.</p></div>
                    <form onSubmit={(e) => { e.preventDefault(); handlePromptGenerate(); }} className="mt-6 w-full mx-auto space-y-4">
                        <div className="relative">
                            <Textarea value={homePromptInput} onChange={(e) => setHomePromptInput(e.target.value)} placeholder="e.g., A fitness tracking app with workout plans and progress charts..." rows={2} className="w-full p-4 pr-12 rounded-xl border border-gray-800/50 bg-black/60 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-base transition-all duration-200" />
                            <motion.button type="button" onClick={toggleListeningHome} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors hover:bg-gray-800/50 duration-200"
                                animate={isListeningHome ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : { scale: 1, opacity: 1 }}
                                transition={isListeningHome ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                            >
                                <FiMic className={`w-5 h-5 ${isListeningHome ? 'text-blue-400' : 'text-gray-400'}`} />
                            </motion.button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Panel */}
                            <div className="space-y-4 flex flex-col justify-between">
                                <div className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 text-left">
                                    <p className="text-sm text-white mb-3 font-medium text-center">Choose a design style</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {styleOptions.map((style) => <button key={style} type="button" onClick={() => setHomeStyleInput(style)} className={`p-2.5 rounded-lg border text-sm transition-all duration-200 ${homeStyleInput === style ? 'border-blue-500 bg-blue-500/20 text-white shadow-md' : 'border-gray-800/50 bg-black/40 hover:border-gray-700 text-gray-300'}`}>{style}</button>)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-4">
                                    <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="h-12 px-4 text-sm bg-black/40 backdrop-blur-md border border-gray-800/60 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200">
                                        {appConfig.ai.availableModels.map((model) => (<option key={model} value={model} className="bg-gray-900 text-white">{appConfig.ai.modelDisplayNames[model] || model}</option>))}
                                    </select>
                                    <Button type="submit" disabled={generationProgress.isGenerating || !homePromptInput || !homeStyleInput} className="h-12 flex-grow px-6 rounded-xl text-base font-bold text-white bg-white/10 backdrop-blur-md border border-blue-500/40 shadow-lg hover:bg-white/20 hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {generationProgress.isGenerating ? "Building..." : <>📱 <span>Build My Mobile App</span></>}
                                    </Button>
                                </div>
                            </div>

                            {/* Right Panel */}
                            <div className="flex flex-col space-y-2 h-full">
                                <div
                                    onDragEnter={() => setIsDragging(true)}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleFileDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative flex-grow w-full p-4 rounded-xl border-2 border-dashed bg-black/50 backdrop-blur-sm cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${isDragging ? 'border-blue-500 scale-105' : 'border-gray-800/50 hover:border-gray-700'}`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="application/pdf,image/jpeg,image/png,image/webp"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center justify-center text-center text-gray-400">
                                        <FiUploadCloud className="w-8 h-8 mb-2" />
                                        <p className="font-semibold">Drop files here or <span className="text-purple-400">click to browse</span></p>
                                        <p className="text-xs mt-1">PDFs for content, Images for UI reference</p>
                                    </div>
                                </div>
                                {homeFiles.length > 0 && (
                                    <div className="bg-black/50 backdrop-blur-sm border border-purple-900/40 rounded-xl p-3 space-y-2 max-h-28 overflow-y-auto">
                                        {homeFiles.map(file => (
                                            <div key={file.name} className="flex items-center justify-between p-2 rounded-md bg-gray-900/50 animate-in fade-in">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {file.type.startsWith('image/') ? <FiImage className="w-4 h-4 text-green-400 flex-shrink-0" /> : <FiFileText className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                                    <span className="text-sm text-gray-300 truncate" title={file.name}>{file.name}</span>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveFile(file.name)} className="p-1 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-400">
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    const renderMainContent = () => {
        // Preview tab - Show QR code for Expo Go
        if (activeTab === 'preview') {
            return <div className="relative w-full h-full bg-black flex items-center justify-center">
                {loadingStage && (
                    <div className="absolute inset-0 bg-black flex items-center justify-center z-30">
                        <div className="text-center">
                            <div className="mb-8">
                                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-200 mb-2">
                                {loadingStage === 'planning' ? 'Planning your application...' :
                                    loadingStage === 'generating' ? 'Setting up Expo...' :
                                        'Deploying source code...'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {loadingStage === 'planning' ? 'Creating React Native architecture' :
                                    loadingStage === 'generating' ? 'Initializing Expo project' :
                                        'Writing files to sandbox'}
                            </p>
                        </div>
                    </div>
                )}
                {(generationProgress.isGenerating || loading) && !loadingStage && <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-600 border-t-purple-400 rounded-full animate-spin mx-auto mb-3" /><p className="text-white text-sm font-medium">{generationProgress.status}</p></div></div>}

                {/* QR Code Display */}
                {qrCodeDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-8">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl mb-6 flex items-center justify-center overflow-hidden">
                            <img
                                src={qrCodeDataUrl}
                                alt="Expo QR Code"
                                className="w-64 h-64 object-contain"
                            />
                        </div>
                        <p className="text-2xl text-white font-bold mb-2">Scan with Expo Go</p>
                        <p className="text-sm text-gray-400 text-center max-w-md mb-4">
                            Open the Expo Go app on your phone and scan this QR code to preview your React Native app
                        </p>
                        {qrCodeUrl && (
                            <div className="mt-4 px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 flex flex-col items-center">
                                <code className="text-xs text-green-400">{qrCodeUrl}</code>
                                <span className="text-[10px] text-gray-600 mt-1 font-mono uppercase tracking-wider">Expo SDK 54 • React Native 0.81</span>
                            </div>
                        )}
                    </div>
                ) : expoStatus === 'starting' || expoStatus === 'running' ? (
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white text-xl font-semibold">Starting Expo dev server...</p>
                        <p className="text-gray-400 text-sm mt-2">QR code will appear shortly</p>
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg">Generate a React Native app to see the QR code</p>
                    </div>
                )}
            </div>;
        }

        // Terminal tab - Show Expo logs
        if (activeTab === 'terminal') {
            return <div className="h-full bg-black p-4 overflow-y-auto font-mono text-sm scrollbar-styled">
                <div className="mb-4 pb-2 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${expoStatus === 'running' ? 'bg-green-500' : expoStatus === 'starting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`} />
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Expo Terminal</span>
                        <span className="text-gray-600 text-xs ml-auto">{expoStatus}</span>
                    </div>
                </div>
                {terminalOutput.length === 0 ? (
                    <div className="text-gray-600 text-center mt-12">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>Terminal will show Expo logs after code generation...</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {terminalOutput.map((line, i) => (
                            <div key={i} className="text-green-400 leading-relaxed font-mono whitespace-pre-wrap break-all border-l border-gray-800 pl-3 py-0.5 hover:bg-white/5 transition-colors">{line}</div>
                        ))}
                        <div ref={terminalEndRef} />
                    </div>
                )}
                {expoStatus === 'starting' && (
                    <div className="flex items-center gap-2 mt-6 text-blue-400">
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span>Starting Expo dev server...</span>
                    </div>
                )}
            </div>;
        }

        // Code tab - File explorer and code viewer
        const fileTree: { [key: string]: GeneratedFile[] } = {};
        generationProgress.files.forEach(file => {
            const dir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'src';
            if (!fileTree[dir]) fileTree[dir] = [];
            fileTree[dir].push(file);
        });

        const activeFileContent = generationProgress.currentFile
            ? generationProgress.currentFile.content
            : generationProgress.files.find(f => f.path === selectedFile)?.content;


        return (
            <motion.div key="code-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex overflow-hidden">
                <div className="w-[250px] border-r border-gray-800/50 bg-[#0a0a0a] flex flex-col flex-shrink-0">
                    <div className="p-3 bg-black/50 text-gray-200 flex items-center gap-2 border-b border-gray-800/50"><BsFolderFill className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium">Explorer</span></div>
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-styled text-sm">
                        {Object.keys(fileTree).length > 0 ? Object.keys(fileTree).sort((a, b) => a.localeCompare(b)).map(dir => (
                            <div key={dir}>
                                <div onClick={() => toggleFolder(dir)} className="flex items-center gap-1.5 p-1 cursor-pointer rounded hover:bg-gray-800/50 text-gray-300 transition-colors duration-200">
                                    {expandedFolders.has(dir) ? <FiChevronDown /> : <FiChevronRight />}
                                    {expandedFolders.has(dir) ? <BsFolder2Open className="text-blue-400" /> : <BsFolderFill className="text-blue-400" />}
                                    <span className="font-medium">{dir.replace(/^src\/?/, '') || 'src'}</span>
                                </div>
                                {expandedFolders.has(dir) && (
                                    <div className="ml-4 border-l border-gray-700/50 pl-2.5">
                                        {fileTree[dir].sort((a, b) => a.path.localeCompare(b.path)).map(file => (
                                            <div key={file.path} onClick={() => handleFileClick(file.path)} className={`flex items-center gap-2 p-1 rounded cursor-pointer transition-colors duration-200 ${selectedFile === file.path ? 'bg-blue-600/30 text-white' : 'hover:bg-gray-800/50 text-gray-400'}`}>
                                                {getFileIcon(file.path)}
                                                <span className="truncate">{file.path.split('/').pop()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="p-4 text-center text-xs text-gray-500">No files generated.</div>
                        )}
                    </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden bg-black p-4" ref={codeDisplayRef}>
                    <motion.div key="file-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
                            {selectedFile && activeFileContent !== undefined ? (
                                <div className={`bg-[#1a1a1a] border rounded-lg overflow-hidden shadow-sm h-full flex flex-col ${generationProgress.currentFile?.path === selectedFile ? 'border-blue-500' : 'border-gray-800/50'}`}>
                                    <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2">
                                            {generationProgress.currentFile?.path === selectedFile ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : getFileIcon(selectedFile)}
                                            <span className="font-mono text-sm">{selectedFile}</span>
                                        </div>
                                        <button onClick={() => setSelectedFile(null)} className="hover:bg-black/20 p-1 rounded transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div className="bg-[#0d1117] flex-1 overflow-y-auto min-h-0 scrollbar-styled">
                                        <SyntaxHighlighter language={selectedFile.split('.').pop()?.toLowerCase() || 'jsx'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', fontSize: '0.875rem', background: 'transparent', height: '100%' }} showLineNumbers>
                                            {activeFileContent}
                                        </SyntaxHighlighter>
                                        {generationProgress.currentFile?.path === selectedFile && <span className="inline-block w-2 h-4 bg-purple-400 ml-4 mb-4 animate-pulse" />}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {generationProgress.isGenerating ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                                            <h3 className="text-lg font-semibold text-gray-200">Generating your code...</h3>
                                            <p className="text-sm text-gray-500 mt-1">{generationProgress.status || "The AI is thinking..."}</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            {generationProgress.files.length > 0 ? "Select a file to view its code" : "No code has been generated yet."}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        );
    };

    return (
        <main className="font-sans bg-black text-gray-200 h-screen flex flex-col">
            {/* Project Loading Overlay */}
            {projectLoadingMessage && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-xl font-semibold text-white mb-2 animate-pulse">{projectLoadingMessage}</p>
                        <p className="text-sm text-gray-400">Please wait while we restore your project</p>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {/* <motion.div
                    className="fixed z-[100] w-[300px] h-[300px]"
                    variants={botVariants}
                    animate={showHomeScreen ? 'home' : 'app'}
                    initial={showHomeScreen ? "home" : "app"}
                >
                    <MichiBot showARButton={false} />
                </motion.div> */}
            </AnimatePresence>
            {!showHomeScreen ? (
                <>
                    <header className="bg-[#0a0a0a] px-4 py-2.5 border-b border-gray-800/50 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-2"><Button variant="ghost" onClick={returnToHome} size="icon" title="Back to Projects" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors duration-200"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></Button></div>
                        <div className="flex items-center gap-2">
                            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="px-3 py-1.5 text-sm bg-black border border-gray-800/50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200">
                                {appConfig.ai.availableModels.map(model => <option key={model} value={model} className="bg-gray-900">{appConfig.ai.modelDisplayNames[model] || model}</option>)}
                            </select>
                            <Button variant="ghost" onClick={downloadZip} size="icon" title="Download ZIP" disabled={!sandboxData || generationProgress.files.length === 0} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg></Button>


                            <div className="relative" ref={historyPanelRef}>
                                <Button variant="ghost" onClick={() => setIsHistoryOpen(prev => !prev)} size="icon" title="Version History" disabled={applicationHistory.length === 0} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                </Button>
                                <AnimatePresence>
                                    {isHistoryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-full right-0 mt-2 w-80 bg-[#0a0a0a] border border-gray-800/50 rounded-xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="p-3 border-b border-gray-800/50"><h3 className="font-semibold text-white text-sm">Version History</h3></div>
                                            <div className="max-h-96 overflow-y-auto scrollbar-styled">
                                                {applicationHistory.length > 0 ? (
                                                    applicationHistory.map(version => (
                                                        <div key={version.id} className="p-3 border-b border-gray-800/50 last:border-b-0 transition-colors hover:bg-gray-800/30">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-xs font-bold uppercase tracking-wider ${version.type === 'creation' ? 'text-green-400' : 'text-blue-400'}`}>{version.type}</span>
                                                                <span className="text-xs text-gray-500">{version.timestamp.toLocaleTimeString()}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-200 mt-2 leading-snug break-words line-clamp-2" title={version.prompt}>{version.prompt}</p>
                                                            <div className="flex items-center gap-2 mt-3">
                                                                <Button onClick={() => handleLoadVersion(version.id)} className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors duration-200">Load</Button>
                                                                <Button onClick={() => handleDownloadVersion(version.id)} className="flex-1 h-7 text-xs bg-gray-800 hover:bg-gray-700 text-white font-medium flex items-center justify-center gap-1 transition-colors duration-200" title="Download this version as ZIP">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (<div className="p-4 text-center text-sm text-gray-500">No versions saved yet.</div>)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-lg text-sm border border-gray-800/50"><div className={`w-2 h-2 rounded-full ${status.active ? 'bg-green-500 shadow-[0_0_8px_0px_#22c55e]' : 'bg-gray-600'}`} /><span className="text-xs">{status.text}</span></div>
                        </div>
                    </header>
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Panel - Bolt-like Actions Panel */}
                        <div className="w-[320px] flex flex-col border-r border-gray-800 bg-[#0d0d0d]">
                            {/* Messages/Actions Area */}
                            <div className="flex-1 overflow-y-auto scrollbar-styled" ref={chatMessagesRef}>
                                {/* Display user prompts and action steps */}
                                {chatMessages.filter(m => m.type === 'user').map((msg, idx) => (
                                    <div key={idx} className="border-b border-gray-800/50">
                                        {/* User prompt */}
                                        <div className="p-4">
                                            <p className="text-sm text-gray-200 leading-relaxed">{msg.content}</p>
                                        </div>

                                        {/* AI response with actions - show for the last user message */}
                                        {idx === chatMessages.filter(m => m.type === 'user').length - 1 && (
                                            <div className="px-4 pb-4">
                                                {/* AI thinking indicator */}
                                                {generationProgress.isThinking && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center gap-2 text-gray-300">
                                                            <span className="font-medium text-sm">myth</span>
                                                            <span className="text-gray-500">...</span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 mt-2">
                                                            {generationProgress.thinkingText ?
                                                                generationProgress.thinkingText.slice(0, 150) + '...' :
                                                                'Analyzing your request...'}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Action steps */}
                                                {actionSteps.length > 0 && (
                                                    <ActionSteps
                                                        steps={actionSteps}
                                                        isExpanded={isActionsExpanded}
                                                        onToggle={() => setIsActionsExpanded(!isActionsExpanded)}
                                                    />
                                                )}

                                                {/* Code application progress */}
                                                {codeApplicationState.stage && <CodeApplicationProgress state={codeApplicationState} />}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Initial state - no messages yet */}
                                {chatMessages.filter(m => m.type === 'user').length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-white mb-2">Ready to build</h3>
                                        <p className="text-sm text-gray-500 max-w-xs">
                                            Describe what you want to create and I'll generate the code for you.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Input Area - Vercel-style */}
                            <div className="p-4 border-t border-gray-800/50 bg-[#0a0a0a]">
                                {/* Hidden file input for chat images */}
                                <input
                                    ref={chatFileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            const files = Array.from(e.target.files);
                                            files.forEach(async (file) => {
                                                const dataUrl = await fileToBase64(file);
                                                setChatImages(prev => [...prev, { timestamp: new Date(), file, dataUrl }]);
                                            });
                                        }
                                    }}
                                />
                                <div className="relative bg-[#1a1a1a] rounded-xl border border-gray-700/50 focus-within:border-blue-500/50 transition-all duration-200">
                                    <Textarea
                                        value={aiChatInput}
                                        onChange={(e) => setAiChatInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
                                        placeholder="How can MYTH help you today?"
                                        className="min-h-[80px] p-4 pr-28 bg-transparent border-none resize-none focus:ring-0 text-gray-200 placeholder-gray-500 text-sm"
                                    />
                                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                                        <motion.button
                                            type="button"
                                            onClick={() => chatFileInputRef.current?.click()}
                                            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors duration-200"
                                            title="Attach image"
                                        >
                                            <FiPaperclip className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            onClick={toggleListeningChat}
                                            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors duration-200"
                                            animate={isListeningChat ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                                            transition={isListeningChat ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
                                        >
                                            <FiMic className={`w-4 h-4 ${isListeningChat ? 'text-blue-400' : 'text-gray-500'}`} />
                                        </motion.button>
                                        <button
                                            onClick={handleChatSubmit}
                                            className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors duration-200"
                                            disabled={!aiChatInput.trim() || generationProgress.isGenerating}
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Display attached images */}
                                {chatImages.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {chatImages.map((img, idx) => (
                                            <div key={idx} className="relative group">
                                                <img src={img.dataUrl} alt="Attached" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                                                <button
                                                    onClick={() => setChatImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-2 -right-2 p-0.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <FiX className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Bottom actions */}
                                <div className="flex items-center justify-between mt-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-1.5 px-2 py-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded transition-colors duration-200">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                        <button className="flex items-center gap-1.5 px-2 py-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded transition-colors duration-200">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>Select</span>
                                        </button>
                                    </div>
                                    <button
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors duration-200 ${generationProgress.isGenerating
                                            ? 'bg-blue-600/20 text-blue-300'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span>Plan</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-4 py-2.5 bg-[#0a0a0a] border-b border-gray-800/50 flex justify-between items-center">
                                <div className="relative flex bg-black rounded-lg p-1 border border-gray-800/50">
                                    <button onClick={() => setActiveTab('code')} className={`relative z-10 p-2 rounded-md transition-colors duration-200 ${activeTab === 'code' ? 'text-white' : 'text-gray-400 hover:text-white'}`} title="Code"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></button>
                                    <button onClick={() => setActiveTab('terminal')} className={`relative z-10 p-2 rounded-md transition-colors duration-200 ${activeTab === 'terminal' ? 'text-white' : 'text-gray-400 hover:text-white'}`} title="Terminal"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
                                    <button onClick={() => setActiveTab('preview')} className={`relative z-10 p-2 rounded-md ${activeTab === 'preview' ? 'text-white' : 'text-gray-400 hover:text-white'}`} title="Preview"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                    <motion.div layoutId="active-tab-pill-applicationai" className="absolute inset-0 bg-blue-600/50 rounded-md" style={{ zIndex: 0, width: '33.33%', left: activeTab === 'code' ? '0%' : activeTab === 'terminal' ? '33.33%' : '66.66%' }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} />
                                </div>
                                <div className={`inline-flex items-center rounded-lg font-medium bg-black/80 text-gray-300 border border-gray-800/50 h-8 px-3 py-1 text-xs gap-2`}>{generationProgress.isGenerating ? <><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /><span>{generationProgress.status}</span></> : <><div className="w-2 h-2 bg-green-500 rounded-full" /><span>{generationProgress.status || "Idle"}</span></>}</div>
                            </div>
                            <div className="flex-1 relative overflow-hidden bg-black">{renderMainContent()}</div>
                        </div>
                    </div>
                </>
            ) : renderHomeScreen()}
        </main>
    );
}

import { Suspense as ReactSuspense } from 'react';

export default function ApplicationAIPage() {
    return (
        <ReactSuspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <ApplicationAIContent />
        </ReactSuspense>
    );
}
