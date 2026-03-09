'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MichiBot from "@/components/MichiBot";
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


interface ISpeechRecognitionEvent {
    results: { 0: { transcript: string } }[];
}

interface ISpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: ISpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: any) => void;
    onspeechend: () => void;
    start: () => void;
    stop: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: { new(): ISpeechRecognition };
        webkitSpeechRecognition: { new(): ISpeechRecognition };
    }
}

const FiMic = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);

const useSpeechToText = (onTranscript: (text: string) => void, onTimeout: () => void) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const noInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            if (noInputTimeoutRef.current) clearTimeout(noInputTimeoutRef.current);
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            onTranscript(transcript);
        };

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onend = () => {
            if (noInputTimeoutRef.current) clearTimeout(noInputTimeoutRef.current);
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (noInputTimeoutRef.current) clearTimeout(noInputTimeoutRef.current);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }, [onTranscript]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
            noInputTimeoutRef.current = setTimeout(() => {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                    onTimeout();
                }
            }, 7000);
        }
    };

    return { isListening, toggleListening };
};

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
interface WebsiteVersion {
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

// Corrected helper to extract text from a PDF file using a stable CDN worker.
// This is the most reliable method to avoid bundler issues.
const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
        const pdfjsLib = await import('pdfjs-dist');
        // Use unpkg as it's often more reliable for the specific .mjs worker files in recent pdfjs-dist versions
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


export default function PromptAIPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sandboxCreationAttempted = useRef(false);
    const projectLoadingRef = useRef(false); // Synchronous flag to prevent race conditions

    const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ text: 'Not connected', active: false });
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { content: 'Welcome! Describe the application you want to build. I\'ll generate the full React codebase for you, which you can then edit with chat.', type: 'system', timestamp: new Date() }
    ]);
    const [aiChatInput, setAiChatInput] = useState('');
    const [aiModel, setAiModel] = useState(() => (searchParams.get('model') && appConfig.ai.availableModels.includes(searchParams.get('model')!)) ? searchParams.get('model')! : appConfig.ai.defaultModel);
    const [showHomeScreen, setShowHomeScreen] = useState(true);
    const [homeScreenFading, setHomeScreenFading] = useState(false);
    const [homePromptInput, setHomePromptInput] = useState('');
    const [homeStyleInput, setHomeStyleInput] = useState<string | null>(null);
    const [homeFiles, setHomeFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'generation'>('preview');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components']));
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [loadingStage, setLoadingStage] = useState<'planning' | 'generating' | null>(null);
    const [conversationContext, setConversationContext] = useState<{ appliedCode: Array<{ files: string[]; timestamp: Date }>; lastGeneratedCode?: string; }>({ appliedCode: [], lastGeneratedCode: undefined });
    const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({ stage: null });
    const [generationProgress, setGenerationProgress] = useState<{
        isGenerating: boolean; status: string; isStreaming: boolean; isThinking: boolean; thinkingText?: string;
        currentFile: GeneratedFile | null; files: GeneratedFile[]; isEdit?: boolean;
    }>({ isGenerating: false, status: '', isStreaming: false, isThinking: false, files: [], currentFile: null });
    const [websiteHistory, setWebsiteHistory] = useState<WebsiteVersion[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
    const [isActionsExpanded, setIsActionsExpanded] = useState(true);
    const [chatImages, setChatImages] = useState<{ timestamp: Date; file: File; dataUrl: string }[]>([]);

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

    const handleMicTimeout = () => addChatMessage("Couldn't hear you. Microphone off.", 'system');

    const { isListening: isListeningHome, toggleListening: toggleListeningHome } = useSpeechToText(setHomePromptInput, () => { });
    const { isListening: isListeningChat, toggleListening: toggleListeningChat } = useSpeechToText(setAiChatInput, handleMicTimeout);

    const botVariants = {
        entry: { top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 0.9, opacity: 1 },
        home: { top: 'calc(50% - 220px)', left: '50%', x: '-50%', y: '-50%', scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20, duration: 1.2 } },
        app: { top: 'auto', left: '20px', bottom: '20px', x: '0%', y: '0%', scale: 0.5, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20, duration: 1.2, delay: 0.2 } },
    } as const;

    // Load project from URL param if present (from Dashboard link)
    useEffect(() => {
        const projectParam = searchParams.get('project');
        if (projectParam && !projectLoadingRef.current) {
            projectLoadingRef.current = true;
            sandboxCreationAttempted.current = true; // prevent auto-sandbox creation
            // Set skip-recovery flag to prevent session recovery from overriding
            localStorage.setItem('promptai-skip-recovery', 'true');
            localStorage.removeItem('promptai-session');
            console.log('[PromptAI] Auto-loading project from URL param:', projectParam);
            // Delay slightly to let Clerk auth middleware initialize
            setTimeout(() => {
                loadProject(projectParam);
            }, 800);
        }
    }, [searchParams]);

    useEffect(() => {
        const sandboxIdParam = searchParams.get('sandbox');
        const projectParam = searchParams.get('project');
        // Don't auto-create sandbox if:
        // 1. Already have a sandbox param in URL
        // 2. Already attempted to create one
        // 3. Currently loading a project from history (check BOTH ref and state)
        // 4. Loading a project from URL param
        if (!sandboxIdParam && !projectParam && !sandboxCreationAttempted.current && !projectLoadingRef.current && !projectLoadingMessage) {
            sandboxCreationAttempted.current = true;
            console.log('[AutoSandbox] Creating initial sandbox (no param, no loading in progress)');
            createSandbox(true);
        }
    }, [projectLoadingMessage]);

    useEffect(() => {
        if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }, [chatMessages, codeApplicationState]);

    useEffect(() => {
        if (codeDisplayRef.current && generationProgress.isStreaming) {
            codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
        }
    }, [generationProgress.files, generationProgress.isStreaming, generationProgress.currentFile]);

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
        // Skip session recovery if we're about to load a specific project
        const skipRecovery = localStorage.getItem('promptai-skip-recovery');
        if (skipRecovery) {
            console.log('[SessionRecovery] Skipping - will load specific project');
            localStorage.removeItem('promptai-skip-recovery');
            return;
        }

        const savedSession = localStorage.getItem('promptai-session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                console.log('[PromptAI] Restoring session:', session);

                if (session.projectId) {
                    setCurrentProjectId(session.projectId);
                    setCurrentProjectName(session.projectName || 'Untitled Project');
                }

                // Restore files first
                if (session.files && session.files.length > 0) {
                    console.log('[SessionRecovery] Found files in session:', session.files.length);
                    const restoredFiles = session.files.map((f: GeneratedFile) => ({
                        ...f,
                        completed: true,
                    }));
                    console.log('[SessionRecovery] Restored files:', restoredFiles);

                    setGenerationProgress(prev => ({
                        ...prev,
                        files: restoredFiles,
                        status: 'Session restored',
                        isGenerating: false,
                        isStreaming: false,
                        isThinking: false,
                    }));

                    setExpandedFolders(new Set(['src', 'src/components']));
                    setActiveTab('generation');
                    setShowHomeScreen(false);
                    setHomeScreenFading(false);

                    if (restoredFiles.length > 0) {
                        setSelectedFile(restoredFiles[0].path);
                    }

                    // Check if saved sandbox is still alive
                    if (session.sandboxData?.sandboxId) {
                        fetch(`/api/sandbox-status?sandboxId=${session.sandboxData.sandboxId}`)
                            .then(res => res.json())
                            .then(async (data) => {
                                if (data.exists) {
                                    // Sandbox still exists, use it
                                    setSandboxData(session.sandboxData);
                                    setStatus({ text: 'Connected', active: true });
                                } else {
                                    // Sandbox expired, create new one and re-apply code
                                    console.log('[PromptAI] Sandbox expired, creating new one...');
                                    addChatMessage('Previous session expired. Recreating sandbox and restoring code...', 'system');

                                    // CRITICAL: Pass true to preserve files!
                                    const newSandbox = await createSandbox(true);
                                    if (newSandbox) {
                                        // Re-apply all code to new sandbox
                                        const codeString = restoredFiles.map(f =>
                                            `<file path="${f.path}">\n${f.content}\n</file>`
                                        ).join('\n');

                                        await applyGeneratedCode(codeString, false);
                                        addChatMessage('Code restored successfully!', 'system');
                                    }
                                }
                            })
                            .catch(err => {
                                console.error('[PromptAI] Failed to check sandbox status:', err);
                                // If check fails, try to create new sandbox
                                // CRITICAL: Pass true to preserve files!
                                createSandbox(true).then(async (newSandbox) => {
                                    if (newSandbox && restoredFiles.length > 0) {
                                        const codeString = restoredFiles.map(f =>
                                            `<file path="${f.path}">\n${f.content}\n</file>`
                                        ).join('\n');
                                        await applyGeneratedCode(codeString, false);
                                    }
                                });
                            });
                    } else {
                        // No sandbox in session, create one
                        createSandbox();
                    }
                }

                if (session.chatMessages && session.chatMessages.length > 0) {
                    setChatMessages(session.chatMessages);
                }
            } catch (error) {
                console.error('[PromptAI] Failed to restore session:', error);
                localStorage.removeItem('promptai-session');
            }
        }
    }, []);

    // Fetch user projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/projects');
                if (response.ok) {
                    const data = await response.json();
                    setUserProjects(data.projects || []);
                }
            } catch (error) {
                console.error('[PromptAI] Failed to fetch projects:', error);
            }
        };
        fetchProjects();
    }, []);

    // Auto-save session to localStorage
    useEffect(() => {
        if (currentProjectId || sandboxData || generationProgress.files.length > 0) {
            const session = {
                projectId: currentProjectId,
                projectName: currentProjectName,
                sandboxData,
                files: generationProgress.files,
                chatMessages,
                updatedAt: new Date().toISOString(),
            };
            console.log('[AutoSave] Saving session to localStorage:', {
                projectId: session.projectId,
                filesCount: session.files.length,
                sandboxId: session.sandboxData?.sandboxId
            });
            localStorage.setItem('promptai-session', JSON.stringify(session));
        } else {
            console.log('[AutoSave] Skipping save - no data to save');
        }
    }, [currentProjectId, currentProjectName, sandboxData, generationProgress.files, chatMessages]);

    const updateStatus = (text: string, active: boolean) => setStatus({ text, active });

    // Helper to save chat message to database
    const saveChatMessageToDb = async (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
        if (!currentProjectId) return; // Only save when project exists

        // Map 'ai' type to 'assistant' for database
        const dbType = type === 'ai' ? 'assistant' : type;

        // Only save user and assistant messages (skip system/error to reduce clutter)
        if (dbType !== 'user' && dbType !== 'assistant') return;

        try {
            await fetch(`/api/chat/${currentProjectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, type: dbType, metadata }),
            });
            console.log('[ChatPersistence] Saved message to database:', { type: dbType, content: content.slice(0, 50) });
        } catch (error) {
            console.error('[ChatPersistence] Failed to save message:', error);
        }
    };

    const addChatMessage = (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
        setChatMessages(prev => [...prev, { content, type, timestamp: new Date(), metadata }]);
        // Save to database asynchronously (don't await to avoid blocking UI)
        saveChatMessageToDb(content, type, metadata);
    };

    // Helper to add/update action steps for Bolt-like UI
    const addActionStep = useCallback((step: Omit<ActionStep, 'id'> & { id?: string }) => {
        const newStep: ActionStep = { id: step.id || `step-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...step };
        setActionSteps(prev => {
            const existingIndex = prev.findIndex(s => s.id === newStep.id);
            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = newStep;
                return updated;
            }
            return [...prev, newStep];
        });
        return newStep.id;
    }, []);

    const updateActionStep = useCallback((id: string, updates: Partial<ActionStep>) => {
        setActionSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }, []);

    const clearActionSteps = useCallback(() => {
        setActionSteps([]);
    }, []);

    const returnToHome = () => {
        console.log('[Navigation] Returning to home screen');

        // CRITICAL: Clear URL query parameters (sandbox, project, etc.)
        // This ensures a completely fresh state
        if (typeof window !== 'undefined') {
            const cleanUrl = window.location.pathname; // Just /promptai without query params
            window.history.pushState({}, '', cleanUrl);
            console.log('[Navigation] URL cleared to:', cleanUrl);
        }

        // Show home screen with Recent Projects
        setShowHomeScreen(true);
        setHomeScreenFading(false);

        // CRITICAL: Clear current workspace state to ensure fresh start
        // This prevents the next generation from editing the previous project
        console.log('[Navigation] Clearing project state for fresh generation');
        setGenerationProgress({ isGenerating: false, status: 'Idle', isStreaming: false, isThinking: false, files: [], currentFile: null });
        setSelectedFile(null);
        setCurrentProjectId(null);
        setCurrentProjectName('Untitled Project');

        // Clear chat messages to start fresh
        setChatMessages([
            { content: 'Welcome! Describe the application you want to build. I\'ll generate the full React codebase for you, which you can then edit with chat.', type: 'system', timestamp: new Date() }
        ]);

        // Clear localStorage session to prevent restoration
        localStorage.removeItem('promptai-session');
        console.log('[Navigation] localStorage cleared');

        // CRITICAL: Clean sandbox files to prevent mixing with next project
        if (sandboxData) {
            console.log('[Navigation] Cleaning sandbox files for fresh start');
            // Clean up sandbox files asynchronously (don't wait)
            fetch('/api/apply-ai-code-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: '<cleanup/>',  // Special marker for cleanup
                    isEdit: false,
                    sandboxId: sandboxData.sandboxId
                })
            }).then(() => {
                console.log('[Navigation] Sandbox files cleaned');
            }).catch(err => {
                console.warn('[Navigation] Failed to clean sandbox:', err);
            });
        }

        console.log('[Navigation] Home screen shown, ready for new project');
    };

    // Helper to force complete iframe reload (clears all caches)
    const forceIframeReload = (url: string) => {
        if (!iframeRef.current) return;

        console.log('[IframeReload] Forcing complete reload to clear Vite cache');

        // Method 1: Clear iframe completely first
        iframeRef.current.src = 'about:blank';

        // Method 2: After a brief delay, load the actual URL with cache-busting
        setTimeout(() => {
            if (iframeRef.current) {
                // Use both timestamp AND random to ensure no caching
                const cacheBuster = `t=${Date.now()}&r=${Math.random().toString(36).substring(7)}`;
                iframeRef.current.src = `${url}?${cacheBuster}`;
                console.log('[IframeReload] Iframe reloaded with fresh URL');
            }
        }, 100);
    };

    const createSandbox = async (isInitial = false) => {
        if (!isInitial) setLoading(true);
        updateStatus('Creating sandbox...', false);
        try {
            const response = await fetch('/api/create-ai-sandbox', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                setSandboxData(data);
                updateStatus('Sandbox active', true);
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.set('sandbox', data.sandboxId);
                newParams.set('model', aiModel);
                router.push(`/promptai?${newParams.toString()}`, { scroll: false });
                if (iframeRef.current) iframeRef.current.src = data.url;

                if (!isInitial) {
                    setChatMessages([{ content: 'New sandbox created. Describe the application you want to build.', type: 'system', timestamp: new Date() }]);
                    setWebsiteHistory([]);
                    setGenerationProgress({ isGenerating: false, status: 'Idle', isStreaming: false, isThinking: false, files: [], currentFile: null });
                    setConversationContext({ appliedCode: [], lastGeneratedCode: undefined });
                    setSelectedFile(null);
                    setActiveTab('preview');
                }
                return data;
            } else { throw new Error(data.error || 'Unknown error'); }
        } catch (error: any) {
            addChatMessage(`Failed to create sandbox: ${error.message}`, 'error');
            updateStatus('Error', false);
            return null;
        } finally {
            if (!isInitial) setLoading(false);
        }
    };

    const loadProject = async (projectId: string) => {
        try {
            // Set flag to skip session recovery (in case of refresh during load)
            localStorage.setItem('promptai-skip-recovery', 'true');
            // Clear localStorage to prevent session recovery from overriding this load
            localStorage.removeItem('promptai-session');

            setProjectLoadingMessage('Loading project...');
            console.log('[LoadProject] Starting load for project:', projectId);

            // Fetch project with files directly from projects table
            const res = await fetch(`/api/projects/${projectId}`);
            console.log('[LoadProject] API response status:', res.status);
            if (!res.ok) throw new Error('Failed to fetch project');

            const responseData = await res.json();
            console.log('[LoadProject] Response data:', {
                hasProject: !!responseData.project,
                hasFiles: !!responseData.project?.files,
                filesCount: responseData.project?.files?.length || 0,
                projectName: responseData.project?.name
            });

            const { project: projectData } = responseData;

            if (!projectData || !projectData.files || projectData.files.length === 0) {
                console.error('[LoadProject] No files found! projectData:', projectData);
                addChatMessage('No files found for this project.', 'error');
                setProjectLoadingMessage(null);
                return;
            }

            // Set project metadata FIRST before loading chat (saveChatMessageToDb needs it)
            setCurrentProjectId(projectId);
            setCurrentProjectName(projectData.name || 'Untitled Project');

            setProjectLoadingMessage('Restoring files...');

            // Restore files - map to proper format
            const restoredFiles = projectData.files.map((f: any) => ({
                path: f.path,
                content: f.content,
                type: f.type || 'file',
                completed: true,
            }));

            console.log('[LoadProject] Hiding home screen and setting files:', restoredFiles.length);

            // Do ALL state updates synchronously in one go - no delays!
            setShowHomeScreen(false);
            setHomeScreenFading(false);
            setActiveTab('generation');
            setExpandedFolders(new Set(['src', 'src/components']));
            if (restoredFiles.length > 0) {
                setSelectedFile(restoredFiles[0].path);
            }

            setGenerationProgress(prev => {
                const newState = {
                    ...prev,
                    files: restoredFiles,
                    status: 'Project loaded',
                    isGenerating: false,
                    isStreaming: false,
                };
                console.log('[LoadProject] Files now in state:', newState.files.length);
                return newState;
            });

            // Load chat history from database
            setProjectLoadingMessage('Loading chat history...');
            try {
                const chatRes = await fetch(`/api/chat/${projectId}`);
                if (chatRes.ok) {
                    const { messages } = await chatRes.json();
                    console.log('[LoadProject] Loaded chat history:', messages.length, 'messages');

                    // Map database messages to UI format
                    const loadedMessages: ChatMessage[] = messages.map((msg: any) => ({
                        content: msg.content,
                        type: msg.type === 'assistant' ? 'ai' : msg.type, // Map 'assistant' back to 'ai'
                        timestamp: new Date(msg.createdAt),
                        metadata: msg.metadata,
                    }));

                    // Initialize with system messages + loaded chat
                    setChatMessages([
                        { content: 'Project loaded from database', type: 'system', timestamp: new Date() },
                        { content: `Loaded: ${projectData?.name}`, type: 'system', timestamp: new Date() },
                        { content: `Files restored: ${restoredFiles.length} files`, type: 'system', timestamp: new Date() },
                        ...loadedMessages,
                        { content: 'You can now edit this project by chatting below, or go back to load a different project.', type: 'system', timestamp: new Date() },
                    ]);
                } else {
                    // No chat history or error - just show system messages
                    setChatMessages([
                        { content: 'Project loaded from database', type: 'system', timestamp: new Date() },
                        { content: `Loaded: ${projectData?.name}`, type: 'system', timestamp: new Date() },
                        { content: `Files restored: ${restoredFiles.length} files`, type: 'system', timestamp: new Date() },
                        { content: 'You can now edit this project by chatting below, or go back to load a different project.', type: 'system', timestamp: new Date() },
                    ]);
                }
            } catch (chatError) {
                console.error('[LoadProject] Failed to load chat history:', chatError);
                // Continue without chat history
                setChatMessages([
                    { content: 'Project loaded from database', type: 'system', timestamp: new Date() },
                    { content: `Loaded: ${projectData?.name}`, type: 'system', timestamp: new Date() },
                    { content: `Files restored: ${restoredFiles.length} files`, type: 'system', timestamp: new Date() },
                    { content: 'You can now edit this project by chatting below, or go back to load a different project.', type: 'system', timestamp: new Date() },
                ]);
            }

            // CRITICAL: Always create a FRESH sandbox when loading from history
            // Create sandbox DIRECTLY (not via createSandbox() which has state timing issues)
            setProjectLoadingMessage('Creating fresh sandbox...');
            console.log('[LoadProject] Creating fresh sandbox directly (not via createSandbox)');

            const sandboxRes = await fetch('/api/create-ai-sandbox', { method: 'POST' });
            const sandboxResult = await sandboxRes.json();

            if (!sandboxResult.success) {
                throw new Error(sandboxResult.error || 'Failed to create sandbox');
            }

            const freshSandboxId = sandboxResult.sandboxId;
            const freshSandboxUrl = sandboxResult.url;
            console.log('[LoadProject] Sandbox created:', freshSandboxId);

            // Set sandbox data in state (for future use by other functions)
            setSandboxData(sandboxResult);
            updateStatus('Sandbox active', true);

            // CRITICAL: Update URL with new sandbox ID
            if (typeof window !== 'undefined' && freshSandboxId) {
                const url = new URL(window.location.href);
                url.searchParams.set('sandbox', freshSandboxId);
                url.searchParams.set('model', aiModel);
                window.history.replaceState({}, '', url.toString());
                console.log('[LoadProject] URL updated with sandbox:', freshSandboxId);
            }

            // Set iframe to new sandbox URL
            if (iframeRef.current) iframeRef.current.src = freshSandboxUrl;

            // Wait for Vite to start inside sandbox
            await new Promise(resolve => setTimeout(resolve, 2000));

            setProjectLoadingMessage('Cleaning sandbox...');

            // CRITICAL: Delete ALL existing files to prevent mixing with previous project
            console.log('[LoadProject] Cleaning up old files from sandbox');
            try {
                await fetch('/api/apply-ai-code-stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        response: '<cleanup/>',
                        isEdit: false,
                        sandboxId: freshSandboxId
                    })
                });
                console.log('[LoadProject] Sandbox cleaned successfully');
            } catch (cleanupError) {
                console.error('[LoadProject] Failed to cleanup sandbox:', cleanupError);
            }

            setProjectLoadingMessage('Applying code to sandbox...');
            console.log('[LoadProject] Building codeString from', restoredFiles.length, 'files');

            // Check if main.jsx exists, if not add it
            const hasMainJsx = restoredFiles.some((f: any) =>
                f.path === 'src/main.jsx' || f.path === 'main.jsx'
            );

            if (!hasMainJsx) {
                console.warn('[LoadProject] main.jsx missing! Auto-generating entry point');
                restoredFiles.push({
                    path: 'src/main.jsx',
                    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
                });
            }

            // Check if index.css exists, if not add it (required by main.jsx's import './index.css')
            const hasIndexCss = restoredFiles.some((f: any) =>
                f.path === 'src/index.css' || f.path === 'index.css'
            );

            if (!hasIndexCss) {
                console.warn('[LoadProject] index.css missing! Auto-generating Tailwind CSS');
                restoredFiles.push({
                    path: 'src/index.css',
                    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`
                });
            }

            const codeString = restoredFiles.map((f: any) => {
                console.log('[LoadProject] Including file:', f.path, `(${f.content.length} bytes)`);
                return `<file path="${f.path}">
${f.content}
</file>`;
            }).join('\n');

            console.log('[LoadProject] Total codeString length:', codeString.length);
            console.log('[LoadProject] CodeString preview:', codeString.substring(0, 300));

            // Apply files directly using the sandbox ID we have (NOT relying on sandboxData state)
            const applyRes = await fetch('/api/apply-ai-code-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: codeString,
                    isEdit: false,
                    sandboxId: freshSandboxId,
                }),
            });

            if (!applyRes.ok) {
                throw new Error('Failed to apply code to sandbox');
            }

            // Read the stream to completion
            const reader = applyRes.body?.getReader();
            if (reader) {
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const text = decoder.decode(value);
                    console.log('[LoadProject] Apply stream:', text.slice(0, 100));
                }
            }

            // CRITICAL: Wait for Tailwind CSS to rebuild before reloading iframe
            console.log('[LoadProject] Waiting for Tailwind CSS to fully compile...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            // CRITICAL: Force complete iframe reload using the local sandbox URL (not stale state)
            if (iframeRef.current && freshSandboxUrl) {
                console.log('[LoadProject] First iframe reload to trigger Vite HMR...');
                iframeRef.current.src = `${freshSandboxUrl}?t=${Date.now()}&loaded=true`;

                // Second reload after Vite has had time to process
                await new Promise(resolve => setTimeout(resolve, 1500));
                console.log('[LoadProject] Second iframe reload for clean state...');
                iframeRef.current.src = `${freshSandboxUrl}?t=${Date.now()}&loaded=true`;
            }

            // Switch to preview after code is applied and iframe reloaded
            setTimeout(() => setActiveTab('preview'), 1000);
        } catch (error) {
            console.error('[PromptAI] Failed to load project:', error);
            addChatMessage('Failed to load project. Please try again.', 'error');
        } finally {
            projectLoadingRef.current = false;
            setProjectLoadingMessage(null);
        }
    };

    const applyGeneratedCode = async (code: string, isEdit: boolean = false) => {
        setCodeApplicationState({ stage: 'analyzing' });
        let errorOccurred = false; let finalData: any = null;
        try {
            const response = await fetch('/api/apply-ai-code-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: code, isEdit, sandboxId: sandboxData?.sandboxId }) });
            if (!response.ok || !response.body) throw new Error('API error during code application.');
            const reader = response.body.getReader(); const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read(); if (done) break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            switch (data.type) {
                                case 'step': if (data.message.includes('Installing')) setCodeApplicationState({ stage: 'installing', packages: data.packages }); else if (data.message.includes('Applying')) setCodeApplicationState({ stage: 'applying' }); break;
                                case 'package-progress': setCodeApplicationState(prev => ({ ...prev, installedPackages: data.installedPackages })); break;
                                case 'complete': finalData = data; break;
                                case 'info': case 'warning': if (data.message) addChatMessage(data.message, 'system'); break;
                                case 'error': errorOccurred = true; throw new Error(data.message || data.error || 'Unknown error');
                            }
                        } catch (e) { }
                    }
                }
            }
            if (errorOccurred) return;
            if (finalData && finalData.success) {
                setCodeApplicationState({ stage: 'complete' });
                setTimeout(() => setCodeApplicationState({ stage: null }), 3000);
                const { results } = finalData;
                const appliedFiles = [...(results.filesCreated || []), ...(results.filesUpdated || [])];
                if (appliedFiles.length > 0) {
                    const message = isEdit ? `Applied changes to ${appliedFiles.length} file(s)!` : `Built and applied ${appliedFiles.length} files successfully!`
                    addChatMessage(message, 'system', { appliedFiles });
                    setConversationContext(prev => ({ ...prev, appliedCode: [...prev.appliedCode, { files: appliedFiles, timestamp: new Date() }] }));
                    const refreshDelay = results.packagesInstalled?.length > 0 ? appConfig.codeApplication.packageInstallRefreshDelay : appConfig.codeApplication.defaultRefreshDelay;
                    setTimeout(() => {
                        if (iframeRef.current && sandboxData?.url) {
                            forceIframeReload(sandboxData.url);
                        }
                    }, refreshDelay);
                }
            } else {
                setCodeApplicationState({ stage: 'complete' });
                setTimeout(() => setCodeApplicationState({ stage: null }), 3000);
                addChatMessage(isEdit ? `Changes applied!` : `Code applied successfully!`, 'system');
                setTimeout(() => {
                    if (iframeRef.current && sandboxData?.url) {
                        forceIframeReload(sandboxData.url);
                    }
                }, appConfig.codeApplication.defaultRefreshDelay);
            }
        } catch (error: any) {
            setCodeApplicationState({ stage: null });
            addChatMessage(`Failed to apply code: ${error.message}`, 'error');
        }
    };

    const handlePromptGenerate = async () => {
        if (isListeningHome) toggleListeningHome();
        if (!homePromptInput.trim() || !homeStyleInput) return addChatMessage("Please provide a prompt and select a style.", 'error');

        setHomeScreenFading(true);
        setTimeout(() => setShowHomeScreen(false), 500);
        setLoadingStage('planning');

        // CRITICAL: Clear project ID to force creation of NEW project
        // (not an edit of existing project)
        console.log('[Generation] Starting NEW generation - clearing project ID');
        setCurrentProjectId(null);
        setCurrentProjectName('Untitled Project');

        let fileUploadMessage = homeFiles.length > 0 ? ` with ${homeFiles.length} file(s)` : '';
        addChatMessage(`Generating a ${homeStyleInput} app for: "${homePromptInput}"${fileUploadMessage}`, 'user');

        let currentSandbox = sandboxData; if (!currentSandbox) { currentSandbox = await createSandbox(); if (!currentSandbox) { setLoadingStage(null); return; } }

        let fileDataForApi: { name: string; type: string; content: string }[] = [];
        let fileInstructions = '';

        if (homeFiles.length > 0) {
            addChatMessage(`Processing ${homeFiles.length} file(s)... This may take a moment.`, 'system');
            try {
                const pdfs = homeFiles.filter(f => f.type === 'application/pdf');
                const images = homeFiles.filter(f => f.type.startsWith('image/'));

                let extractedPdfText = '';

                if (pdfs.length > 0) {
                    addChatMessage(`Extracting text from ${pdfs.length} PDF(s)...`, 'system');
                    for (const pdfFile of pdfs) {
                        try {
                            const text = await extractTextFromPdf(pdfFile);
                            extractedPdfText += `\n\n--- START OF PDF CONTENT: ${pdfFile.name} ---\n\n${text}\n\n--- END OF PDF CONTENT: ${pdfFile.name} ---\n\n`;
                        } catch (pdfError) {
                            console.error(`Error processing PDF ${pdfFile.name}:`, pdfError);
                            addChatMessage(`Could not extract text from ${pdfFile.name}. It will be ignored.`, 'error');
                        }
                    }
                }

                if (images.length > 0) {
                    const imagePromises = images.map(file => fileToBase64(file).then(content => ({ name: file.name, type: file.type, content })));
                    fileDataForApi = await Promise.all(imagePromises);
                }

                const hasImages = images.length > 0;
                const hasPdfs = pdfs.length > 0;

                if (hasImages && hasPdfs) {
                    fileInstructions = `
**CRITICAL INSTRUCTIONS FROM USER FILES:**
The user has provided images for visual reference and a PDF for content. You MUST use both sources correctly.

1.  **VISUAL DESIGN BLUEPRINT (FROM IMAGE):** The uploaded image(s) (${images.map(i => i.name).join(', ')}) are your PRIMARY and STRICTEST reference for the ENTIRE visual design. Your highest priority is to replicate this visual design as closely as possible.
    *   **Layout & Structure:** Analyze the layout in the image. Replicate the placement of headers, footers, sections, cards, and text blocks.
    *   **Color Palette:** Extract the exact color scheme from the image. Use these colors for backgrounds, text, buttons, and accents. Do not deviate.
    *   **Component Style:** Mimic the style of components. If the image shows rounded buttons, use rounded buttons. If it has sharp-cornered cards, use those. Pay attention to shadows, borders, and spacing.
    *   **Typography:** Infer the font style (e.g., serif, sans-serif, bold, light) from the image and apply a similar typographic hierarchy.
    *   **Asset Usage:** You MUST use the provided image(s) directly within the website's UI (e.g., as a hero image, in a gallery, etc.).

2.  **TEXTUAL CONTENT (FROM PDF):** The text extracted from the PDF (${pdfs.map(p => p.name).join(', ')}) is your ONLY source for all WRITTEN content.
    *   Take the layout you have built from the image reference and populate it with the text from the PDF.
    *   Use the PDF content for headings, paragraphs, lists, button labels, etc.
    *   DO NOT invent any text if relevant information exists in the provided content below.
    *   **PDF Content:** ${extractedPdfText}`;
                } else if (hasImages) {
                    fileInstructions = `
**CRITICAL VISUAL INSTRUCTIONS FROM IMAGE:**
The uploaded image(s) (${images.map(i => i.name).join(', ')}) are your PRIMARY and STRICTEST reference for the ENTIRE visual design. Your highest priority is to replicate this visual design as closely as possible.
    *   **Layout & Structure:** Analyze the layout in the image. Replicate the placement of headers, footers, sections, cards, and text blocks.
    *   **Color Palette:** Extract the exact color scheme from the image. Use these colors for backgrounds, text, buttons, and accents.
    *   **Component Style:** Mimic the style of components like buttons, cards, and inputs.
    *   **Asset Usage:** You MUST use the provided image(s) directly within the website's UI.
    *   Since no text document was provided, you should generate appropriate placeholder text that fits the visual theme.`;
                } else if (hasPdfs) {
                    fileInstructions = `
**CRITICAL CONTENT INSTRUCTIONS FROM PDF:**
The text extracted from the PDF (${pdfs.map(p => p.name).join(', ')}) is your ONLY source for all WRITTEN content. You MUST base the website's information on this text.
    *   Use the PDF content for all headings, paragraphs, lists, and data points.
    *   Structure the website logically around the content provided.
    *   DO NOT invent any text if relevant information exists in the content below.
    *   You will apply the user's chosen design style ("${homeStyleInput}") to this content.
    *   **PDF Content:** ${extractedPdfText}`;
                }

            } catch (error) {
                console.error("Error processing files:", error);
                addChatMessage('Failed to process uploaded files. Continuing with prompt only.', 'error');
                setHomeScreenFading(false);
                setShowHomeScreen(true);
                setLoadingStage(null);
                return;
            }
        }

        const copyrightNotice = `<p>&copy; ${new Date().getFullYear()} Username.CreatedBy@MYTH. All rights reserved.</p>`;

        const generationPrompt = `You are an expert web developer specializing in React and Tailwind CSS. Your task is to build a complete, single-page React application based on the user's request, following all instructions with extreme precision.
      
      **USER'S CORE REQUEST:** "${homePromptInput}"
      **USER'S CHOSEN DESIGN STYLE:** "${homeStyleInput}" (Note: If an image is provided for UI, it OVERRIDES this style choice. Use the image as the primary visual guide.)

      ${fileInstructions}

      **MANDATORY TECHNICAL REQUIREMENTS:**
      1.  **Project Structure:** Create a COMPLETE and RUNnable React application using Vite. The main entry point MUST be \`src/App.jsx\`.
      2.  **Componentization:** \`App.jsx\` MUST import and render all other functional components. Break down the UI into logical, reusable components and place them in \`src/components/\`.
      3.  **Styling:** Use Tailwind CSS for ALL styling. Do not use custom CSS files.
      4.  **No Routing:** This is a single-page application. DO NOT use React Router.
      5.  **Completeness:** You MUST create a file for every component you import. For example, if you write \`import Footer from './components/Footer';\`, you MUST also provide the code for \`src/components/Footer.jsx\`. No exceptions.
      6.  **Footer Creation and Rendering (CRITICAL):**
          a. You MUST create a dedicated file named \`src/components/Footer.jsx\`.
          b. In that file, create a React component that renders a footer element.
          c. This footer component MUST contain the following exact HTML: \`${copyrightNotice}\`.
          d. You MUST then import this \`Footer.jsx\` component into \`src/App.jsx\` and render it at the bottom of the main layout.
          This is a two-part rule: create the file, then use it. Both steps are mandatory.
      
      Your final output must be a stream of self-contained <file> tags with the complete code for each file. Begin generating the code immediately.`;

        await sendAIRequest(generationPrompt, homePromptInput, 'creation', false, null, fileDataForApi);
        setLoadingStage(null);
    };

    const sendAIRequest = async (aiPrompt: string, userPrompt: string, type: 'creation' | 'edit', isEdit: boolean, codebase: GeneratedFile[] | null = null, files?: { name: string; type: string; content: string }[]) => {
        setActiveTab('generation');
        setGenerationProgress({ isGenerating: true, status: 'Initializing AI...', isStreaming: false, isThinking: true, thinkingText: '', files: codebase || [], currentFile: null, isEdit });

        let generationSucceeded = false;
        let localFilesInProgress: GeneratedFile[] = codebase ? JSON.parse(JSON.stringify(codebase)) : [];

        try {
            const response = await fetch('/api/generate-ai-code-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPrompt, model: aiModel, context: { sandboxId: sandboxData?.sandboxId, isEdit, currentCodebase: codebase?.map(f => ({ path: f.path, content: f.content })), files } }) });
            if (!response.ok || !response.body) throw new Error(`API error! status: ${response.status}`);

            const reader = response.body.getReader(); const decoder = new TextDecoder();
            let fullGeneratedCode = ''; let currentFilePath: string | null = null; let currentFileContent: string = '';

            while (true) {
                const { done, value } = await reader.read(); if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            switch (data.type) {
                                case 'thinking': setGenerationProgress(prev => ({ ...prev, isThinking: true, thinkingText: (prev.thinkingText || '') + data.text })); break;
                                case 'thinking_complete': setGenerationProgress(prev => ({ ...prev, isThinking: false })); break;
                                case 'stream':
                                    if (data.raw) {
                                        const textChunk = data.text; fullGeneratedCode += textChunk;
                                        const fileStartRegex = /<file path="([^"]+)">/g; const fileEndTag = '</file>'; let lastIndex = 0; let match;
                                        while ((match = fileStartRegex.exec(textChunk)) !== null) {
                                            let preContent = textChunk.substring(lastIndex, match.index);
                                            // CRITICAL: Clean any XML tags from content to prevent corruption
                                            preContent = preContent.replace(/<\/file>/g, '').replace(/<file[^>]*>/g, '').trim();
                                            if (currentFilePath && preContent) {
                                                currentFileContent += preContent;
                                                const currentLocalFile = localFilesInProgress.find(f => f.path === currentFilePath);
                                                if (currentLocalFile) currentLocalFile.content = currentFileContent;
                                                setGenerationProgress(prev => ({ ...prev, currentFile: { ...prev.currentFile!, content: currentFileContent } }));
                                            }
                                            if (currentFilePath) {
                                                const currentLocalFile = localFilesInProgress.find(f => f.path === currentFilePath);
                                                if (currentLocalFile) { currentLocalFile.content = currentFileContent.trim(); currentLocalFile.completed = true; }
                                                setGenerationProgress(prev => { const finalFiles = prev.files.map(f => f.path === currentFilePath ? { ...f, content: currentFileContent.trim(), completed: true } : f); return { ...prev, files: finalFiles, currentFile: null }; });
                                            }
                                            currentFilePath = match[1]; currentFileContent = ''; setSelectedFile(currentFilePath);
                                            const fileType = currentFilePath!.split('.').pop()?.toLowerCase() || 'text';
                                            const newFile: GeneratedFile = { path: currentFilePath!, content: '', type: fileType === 'jsx' ? 'javascript' : fileType, completed: false, edited: isEdit };
                                            const existingFileIndex = localFilesInProgress.findIndex(f => f.path === currentFilePath);
                                            if (existingFileIndex !== -1) { localFilesInProgress[existingFileIndex] = newFile; } else { localFilesInProgress.push(newFile); }
                                            setGenerationProgress(prev => {
                                                const existingFileIndexState = prev.files.findIndex(f => f.path === currentFilePath);
                                                const updatedFiles = existingFileIndexState !== -1 ? [...prev.files] : [...prev.files, newFile];
                                                if (existingFileIndexState !== -1) updatedFiles[existingFileIndexState] = newFile;
                                                return { ...prev, files: updatedFiles, currentFile: newFile, isStreaming: true, isThinking: false, status: `Generating ${currentFilePath}` };
                                            });
                                            lastIndex = fileStartRegex.lastIndex;
                                        }
                                        const remainingText = textChunk.substring(lastIndex);
                                        if (currentFilePath) {
                                            const endTagIndex = remainingText.indexOf(fileEndTag);
                                            if (endTagIndex !== -1) {
                                                currentFileContent += remainingText.substring(0, endTagIndex);
                                                const currentLocalFile = localFilesInProgress.find(f => f.path === currentFilePath);
                                                if (currentLocalFile) { currentLocalFile.content = currentFileContent.trim(); currentLocalFile.completed = true; }
                                                setGenerationProgress(prev => { const finalFiles = prev.files.map(f => f.path === currentFilePath ? { ...f, content: currentFileContent.trim(), completed: true } : f); return { ...prev, files: finalFiles, currentFile: null, status: `${currentFilePath} complete!` }; });
                                                currentFilePath = null;
                                            } else {
                                                currentFileContent += remainingText;
                                                const currentLocalFile = localFilesInProgress.find(f => f.path === currentFilePath);
                                                if (currentLocalFile) currentLocalFile.content = currentFileContent;
                                                setGenerationProgress(prev => ({ ...prev, currentFile: { ...prev.currentFile!, content: currentFileContent } }));
                                            }
                                        }
                                    }
                                    break;
                                case 'complete': setConversationContext(prev => ({ ...prev, lastGeneratedCode: data.generatedCode })); break;
                                case 'error': throw new Error(data.error);
                            }
                        } catch (e) { }
                    }
                }
            }

            if (fullGeneratedCode) {
                addChatMessage('Generation complete. Applying code...', 'system');
                await applyGeneratedCode(fullGeneratedCode, isEdit);
                generationSucceeded = true;
            } else {
                addChatMessage('AI did not produce any code. Please try again.', 'error');
            }
        } catch (error: any) {
            addChatMessage(`Error generating or applying code: ${error.message}`, 'error');
        } finally {
            if (generationSucceeded) {
                // No need to wait - localFilesInProgress is already complete
                const completedFiles = localFilesInProgress.filter(f => f.completed && f.content);

                const newVersion: WebsiteVersion = {
                    id: Date.now(),
                    timestamp: new Date(),
                    files: completedFiles.map(f => ({ ...f, completed: true })),
                    prompt: userPrompt,
                    type: type,
                };
                setWebsiteHistory(prevHistory => [newVersion, ...prevHistory]);

                // Auto-create project if none exists, or use existing
                try {
                    let projectIdToUpdate = currentProjectId;

                    // CRITICAL FIX: Fetch ACTUAL files from the sandbox filesystem
                    // localFilesInProgress only contains files parsed from the AI stream,
                    // which is fragile and misses files when XML tags split across chunks.
                    // The sandbox has the authoritative file set including auto-generated stubs.
                    let filesToSave: { path: string; content: string; type: string }[] = [];

                    try {
                        console.log('[FileSave] Fetching actual files from sandbox...');
                        const sandboxFilesRes = await fetch('/api/get-sandbox-files');
                        if (sandboxFilesRes.ok) {
                            const sandboxFilesData = await sandboxFilesRes.json();
                            if (sandboxFilesData.success && sandboxFilesData.files) {
                                // Convert sandbox files (key-value object) to array format
                                const sandboxFiles = Object.entries(sandboxFilesData.files)
                                    .filter(([path]) => {
                                        // Skip config files and non-source files
                                        const fileName = path.split('/').pop() || '';
                                        const skipFiles = ['tailwind.config.js', 'vite.config.js', 'package-lock.json', 'tsconfig.json', 'postcss.config.js'];
                                        return !skipFiles.includes(fileName);
                                    })
                                    .map(([path, content]) => ({
                                        path,
                                        content: content as string,
                                        type: path.split('.').pop() || 'text',
                                    }));

                                console.log('[FileSave] Got', sandboxFiles.length, 'files from sandbox:', sandboxFiles.map(f => f.path));
                                filesToSave = sandboxFiles;
                            }
                        }
                    } catch (sandboxFetchErr) {
                        console.warn('[FileSave] Failed to fetch sandbox files, falling back to stream-parsed files:', sandboxFetchErr);
                    }

                    // Fallback: if sandbox fetch failed, use localFilesInProgress
                    if (filesToSave.length === 0) {
                        console.warn('[FileSave] Using localFilesInProgress as fallback');
                        const actualFiles = localFilesInProgress.filter(f => f.completed && f.content);
                        filesToSave = actualFiles.map(f => ({
                            path: f.path,
                            content: f.content.replace(/<\/file>/g, '').replace(/<file[^>]*>/g, '').trim(),
                            type: f.type,
                        }));
                    }

                    // CRITICAL LOGGING: Track what's being saved
                    console.log('[FileSave] Stream-parsed files count:', localFilesInProgress.length);
                    console.log('[FileSave] Files to save (from sandbox):', filesToSave.length);
                    console.log('[FileSave] Files to save:', filesToSave.map(f => f.path));

                    if (!currentProjectId) {
                        // Create NEW project with files
                        const projectName = userPrompt.slice(0, 50);

                        // CRITICAL DEBUG: Log what we're about to send
                        console.log('[FileSave] Creating new project with name:', projectName);
                        console.log('[FileSave] filesToSave length:', filesToSave.length);
                        console.log('[FileSave] filesToSave paths:', filesToSave.map(f => f.path));
                        console.log('[FileSave] First file preview:', filesToSave[0]?.content?.slice(0, 100));

                        const response = await fetch('/api/projects', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: projectName,
                                type: 'prompt',
                                sandboxId: sandboxData?.sandboxId,
                                files: filesToSave,
                            }),
                        });

                        if (response.ok) {
                            const { project } = await response.json();
                            projectIdToUpdate = project.id;
                            setCurrentProjectId(project.id);
                            setCurrentProjectName(project.name);
                            console.log('[PromptAI] Project created with files:', project.id);
                            console.log('[PromptAI] Saved file count:', filesToSave.length);
                        }
                    } else {
                        // Update existing project with new files
                        await fetch(`/api/projects/${currentProjectId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sandboxId: sandboxData?.sandboxId,
                                files: filesToSave,
                            }),
                        });
                        console.log('[PromptAI] Project updated with files:', currentProjectId);
                        console.log('[PromptAI] Updated file count:', filesToSave.length);
                    }

                    // Refresh projects list
                    if (projectIdToUpdate) {
                        const projectsResponse = await fetch('/api/projects');
                        if (projectsResponse.ok) {
                            const data = await projectsResponse.json();
                            setUserProjects(data.projects || []);
                        }
                    }
                } catch (error) {
                    console.error('[PromptAI] Failed to save project/checkpoint:', error);
                    // Don't show error to user - saving is background operation
                }
            }
            setGenerationProgress(prev => ({
                ...prev,
                files: localFilesInProgress,
                isGenerating: false, isStreaming: false, isThinking: false, thinkingText: undefined, status: 'Generation complete!', currentFile: null
            }));
            setTimeout(() => setActiveTab('preview'), 2000);
        }
    };

    const handleChatSubmit = async () => {
        if (isListeningChat) toggleListeningChat();
        const message = aiChatInput.trim(); if (!message || !sandboxData) return;
        addChatMessage(message, 'user'); setAiChatInput('');

        // Upload chat images to the sandbox and get accessible URLs
        let uploadedImageUrls: { name: string; url: string; path: string }[] = [];
        let fileDataForApi: { name: string; type: string; content: string }[] = [];
        if (chatImages.length > 0) {
            addChatMessage(`Uploading ${chatImages.length} image(s) to sandbox...`, 'system');
            const imagesToUpload = chatImages.map(img => ({
                name: img.file.name,
                type: img.file.type,
                content: img.dataUrl,
            }));
            fileDataForApi = imagesToUpload;
            setChatImages([]); // Clear attached images

            try {
                const uploadRes = await fetch('/api/upload-to-sandbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        images: imagesToUpload,
                        sandboxId: sandboxData.sandboxId,
                    }),
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    if (uploadData.success && uploadData.uploads) {
                        uploadedImageUrls = uploadData.uploads;
                        addChatMessage(`${uploadedImageUrls.length} image(s) uploaded successfully!`, 'system');
                    }
                }
            } catch (uploadError) {
                console.error('[ChatSubmit] Image upload failed:', uploadError);
                addChatMessage('Image upload failed. Continuing without images.', 'error');
            }
        }

        const copyrightNotice = `<p>&copy; ${new Date().getFullYear()} Username.CreatedBy@MYTH. All rights reserved.</p>`;

        // Build image instruction with sandbox-accessible URLs
        let imageInstruction = '';
        if (uploadedImageUrls.length > 0) {
            const urlList = uploadedImageUrls.map(u => `- "${u.name}" → src="${u.path}"`).join('\n');
            imageInstruction = `\n\n**UPLOADED IMAGES (CRITICAL - USE THESE EXACT PATHS):**
The user has uploaded ${uploadedImageUrls.length} image(s) to the project. These are now available at the following paths. You MUST use these EXACT paths as the \`src\` attribute in \`<img>\` tags:
${urlList}

Example usage: \`<img src="${uploadedImageUrls[0].path}" alt="Uploaded image" className="w-full h-auto object-cover" />\`

Place the images where appropriate based on the user's request. Do NOT use placeholder images or external URLs — use ONLY the paths listed above.`;
        }

        const editPrompt = `You are an expert AI developer modifying an existing React application based on a user's request.
      **User Request:** "${message}"
      **Your Task:** Act as a surgical code editor.
      **CRITICAL INSTRUCTIONS:**
      1.  **Analyze Context:** The current, complete codebase is provided to you. Analyze it carefully.
      2.  **Preserve Existing Code:** When modifying an existing file, you **MUST NOT** rewrite it from scratch. Output the **COMPLETE** content for that file, but only change the necessary lines/blocks. The rest of the file must be preserved perfectly.
      3.  **Footer Mandate (CRITICAL):** Your modifications MUST ensure a footer component file exists at \`src/components/Footer.jsx\` and that it is rendered in \`App.jsx\`. 
          - If the file \`src/components/Footer.jsx\` does not exist, YOU MUST CREATE IT.
          - The footer component must contain this exact HTML: \`${copyrightNotice}\`.
          - Ensure the created/existing Footer component is imported and rendered in \`App.jsx\`.
          This is a mandatory check for every request. Failure to comply will result in an error.
      4.  **Output Format:** Your response MUST ONLY contain the code, formatted within self-contained \`<file path="...">\` tags for each new or modified file.${imageInstruction}`;
        await sendAIRequest(editPrompt, message, 'edit', true, generationProgress.files, fileDataForApi.length > 0 ? fileDataForApi : undefined);
    };

    const downloadZip = async () => {
        if (!sandboxData) return addChatMessage('No active sandbox to download.', 'error');
        setLoading(true);
        addChatMessage('Creating ZIP file...', 'system');
        try {
            const response = await fetch('/api/create-zip', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                addChatMessage('ZIP created! Download starting...', 'system');
                const link = document.createElement('a');
                link.href = data.dataUrl;
                link.download = data.fileName || 'myth-prompt-project.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else { throw new Error(data.error); }
        } catch (error: any) {
            addChatMessage(`Failed to create ZIP: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const reapplyLastGeneration = async () => {
        if (!conversationContext.lastGeneratedCode) return addChatMessage('No previous generation to re-apply.', 'system');
        if (!sandboxData) return addChatMessage('Please create a sandbox first.', 'system');
        addChatMessage('Re-applying last generation...', 'system');
        await applyGeneratedCode(conversationContext.lastGeneratedCode, conversationContext.appliedCode.length > 0);
    };

    const handleLoadVersion = async (versionId: number) => {
        const versionToLoad = websiteHistory.find(v => v.id === versionId);
        if (!versionToLoad) return addChatMessage('Could not find the selected version.', 'error');

        setIsHistoryOpen(false);
        addChatMessage(`Loading version from ${versionToLoad.timestamp.toLocaleString()}. The code and preview will update.`, 'system');

        setGenerationProgress(prev => ({ ...prev, files: versionToLoad.files, isEdit: true }));

        const firstFile = versionToLoad.files.find(f => f.path.includes('App.jsx')) || versionToLoad.files[0];
        setSelectedFile(firstFile?.path || null);

        const codeString = versionToLoad.files.map(f => `<file path="${f.path}">${f.content}</file>`).join('\n');
        await applyGeneratedCode(codeString, true);
    };

    const handleDownloadVersion = async (versionId: number) => {
        const versionToLoad = websiteHistory.find(v => v.id === versionId);
        if (!versionToLoad) return addChatMessage('Could not find the selected version.', 'error');

        setIsHistoryOpen(false);
        addChatMessage(`Preparing version from ${versionToLoad.timestamp.toLocaleString()} for download...`, 'system');

        const codeString = versionToLoad.files.map(f => `<file path="${f.path}">${f.content}</file>`).join('\n');
        await applyGeneratedCode(codeString, true);
        await downloadZip();
    };

    const toggleFolder = (folderPath: string) => setExpandedFolders(prev => { const newSet = new Set(prev); newSet.has(folderPath) ? newSet.delete(folderPath) : newSet.add(folderPath); return newSet; });
    const handleFileClick = (filePath: string) => setSelectedFile(filePath);
    const getFileIcon = (fileName: string) => { const ext = fileName.split('.').pop()?.toLowerCase(); if (['jsx', 'js'].includes(ext!)) return <SiJavascript className="w-4 h-4 text-yellow-400" />; if (['tsx', 'ts'].includes(ext!)) return <SiReact className="w-4 h-4 text-blue-400" />; if (ext === 'css') return <SiCss3 className="w-4 h-4 text-blue-400" />; if (ext === 'json') return <SiJson className="w-4 h-4 text-green-400" />; return <FiFile className="w-4 h-4 text-gray-400" />; };

    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files).filter(
                file => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)
            );
            setHomeFiles(prev => [...prev, ...newFiles.filter(nf => !prev.some(pf => pf.name === nf.name))]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setHomeFiles(prev => [...prev, ...newFiles.filter(nf => !prev.some(pf => pf.name === nf.name))]);
        }
    };

    const handleRemoveFile = (fileName: string) => {
        setHomeFiles(prev => prev.filter(file => file.name !== fileName));
    };

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
                    <div className="text-center pt-12"><h1 className="text-5xl lg:text-6xl text-white font-bold tracking-tight animate-[fadeIn_0.8s_ease-out]">MYTH</h1><p className="text-base lg:text-lg max-w-lg mx-auto mt-3 text-white/80">Build any website from an idea, in seconds.</p></div>
                    <form onSubmit={(e) => { e.preventDefault(); handlePromptGenerate(); }} className="mt-6 w-full mx-auto space-y-4">
                        <div className="relative">
                            <Textarea value={homePromptInput} onChange={(e) => setHomePromptInput(e.target.value)} placeholder="e.g., A portfolio for a photographer named John Doe..." rows={2} className="w-full p-4 pr-12 rounded-xl border border-gray-800/50 bg-black/60 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-base transition-all duration-200" />
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
                                        {generationProgress.isGenerating ? "Building..." : <>✨ <span>Build My Website</span></>}
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

                    {/* Recent Projects Section */}
                    <div className="mt-12 w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                            {userProjects.length > 6 && (
                                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                    View All →
                                </button>
                            )}
                        </div>

                        {userProjects.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-800/50 rounded-xl">
                                <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <p className="text-gray-500 text-sm">No projects yet. Create your first one above!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userProjects.slice(0, 6).map((project: any) => (
                                    <div
                                        key={project.id}
                                        onClick={() => {
                                            console.log('[HomeScreen] Clicked on project:', project.id, project.name);
                                            // CRITICAL: Set ref SYNCHRONOUSLY first to prevent auto-sandbox race condition
                                            projectLoadingRef.current = true;
                                            setProjectLoadingMessage('Starting project load...');
                                            loadProject(project.id);
                                        }}
                                        className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-800/50 rounded-xl p-4 cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-video bg-black/50 rounded-lg mb-3 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-600 group-hover:text-blue-500/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                            </svg>
                                        </div>

                                        {/* Project info */}
                                        <h4 className="font-medium text-white mb-1 truncate group-hover:text-blue-400 transition-colors">
                                            {project.name}
                                        </h4>

                                        <p className="text-xs text-gray-500">
                                            {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>

                                        {/* Hover indicator */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMainContent = () => {
        if (activeTab === 'preview') {
            return <div className="relative w-full h-full bg-black">
                {loadingStage && <div className="absolute inset-0 bg-black flex items-center justify-center z-30"><div className="text-center"><div className="mb-8"><div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div></div><h3 className="text-xl font-semibold text-gray-200 mb-2">Planning your application...</h3><p className="text-gray-400 text-sm">Creating component architecture</p></div></div>}
                {(generationProgress.isGenerating || loading) && !loadingStage && <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-600 border-t-purple-400 rounded-full animate-spin mx-auto mb-3" /><p className="text-white text-sm font-medium">{generationProgress.status}</p></div></div>}
                {sandboxData?.url ? <iframe ref={iframeRef} src={sandboxData.url} className="w-full h-full border-none" title="MYTH Sandbox" allow="clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" /> : <div className="flex items-center justify-center h-full text-gray-500">Waiting for sandbox...</div>}
            </div>;
        }


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
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide text-sm">
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
                                    <div className="bg-[#0d1117] flex-1 overflow-y-auto min-h-0">
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
                            <Button variant="ghost" onClick={() => createSandbox()} size="icon" title="New Sandbox" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors duration-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></Button>
                            <Button variant="ghost" onClick={reapplyLastGeneration} size="icon" title="Re-apply" disabled={!conversationContext.lastGeneratedCode} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></Button>
                            <Button variant="ghost" onClick={downloadZip} size="icon" title="Download ZIP" disabled={!sandboxData || generationProgress.files.length === 0} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg></Button>

                            {sandboxData && !generationProgress.isGenerating && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors duration-200"
                                    asChild
                                >
                                    <a
                                        href={sandboxData.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open in new tab"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </Button>
                            )}

                            <div className="relative" ref={historyPanelRef}>
                                <Button variant="ghost" onClick={() => setIsHistoryOpen(prev => !prev)} size="icon" title="Version History" disabled={websiteHistory.length === 0} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200">
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
                                            <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                                                {websiteHistory.length > 0 ? (
                                                    websiteHistory.map(version => (
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
                                    <button onClick={() => setActiveTab('generation')} className={`relative z-10 p-2 rounded-md transition-colors duration-200 ${activeTab === 'generation' ? 'text-white' : 'text-gray-400 hover:text-white'}`} title="Code"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></button>
                                    <button onClick={() => setActiveTab('preview')} className={`relative z-10 p-2 rounded-md ${activeTab === 'preview' ? 'text-white' : 'text-gray-400 hover:text-white'}`} title="Preview"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                    <motion.div layoutId="active-tab-pill-prompt" className="absolute inset-0 bg-blue-600/50 rounded-md" style={{ zIndex: 0, width: '50%', left: activeTab === 'generation' ? '0%' : '50%' }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} />
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
