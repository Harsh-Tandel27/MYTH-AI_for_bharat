'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
    FiUploadCloud,
    FiPaperclip,
    FiHome,
    FiMaximize,
    FiRefreshCw,
    FiDownload,
    FiClock,
    FiImage,
    FiFileText
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';

// Mic icon component
const FiMic = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);

// Interfaces
interface FullStackSandboxData {
    sessionId: string;
    frontend: {
        sandboxId: string;
        url: string;
    };
    backend: {
        sandboxId: string;
        url: string;
        apiEndpoint: string;
    };
    database: {
        name: string;
        connectionString: string;
        createdAt: Date;
    };
    admin?: {
        sandboxId: string;
        url: string;
    };
}

interface GeneratedFile {
    path: string;
    content: string;
    type: string;
    completed: boolean;
    layer?: 'frontend' | 'backend' | 'admin' | 'both';
}

interface ChatMessage {
    content: string;
    type: 'user' | 'ai' | 'system' | 'error';
    timestamp: Date;
}

interface ProjectVersion {
    id: string;
    description: string;
    timestamp: Date;
    files: GeneratedFile[];
    sandboxData: FullStackSandboxData | null;
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

// Helper to extract text from a PDF file using a stable CDN worker.
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

function FullstackAIContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const adminIframeRef = useRef<HTMLIFrameElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Core state
    const [sandboxData, setSandboxData] = useState<FullStackSandboxData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showHomeScreen, setShowHomeScreen] = useState(true);
    const [homeScreenFading, setHomeScreenFading] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Home screen inputs
    const [homePromptInput, setHomePromptInput] = useState('');
    const [homeStyleInput, setHomeStyleInput] = useState<string | null>(null);
    const [homeFiles, setHomeFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [aiModel, setAiModel] = useState('gemini-2.5-flash');
    const [includeAdmin, setIncludeAdmin] = useState(false);

    // Builder state
    const [activeTab, setActiveTab] = useState<'frontend' | 'backend' | 'database' | 'preview' | 'admin-terminal' | 'admin-preview'>('preview');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { content: 'Starting Dual-Phase Sandbox Build...', type: 'system', timestamp: new Date() }
    ]);
    const [aiChatInput, setAiChatInput] = useState('');

    // Phases: 'idle' | 'backend-sandbox' | 'backend-gen' | 'backend-deploy' | 'backend-verify' | 'frontend-sandbox' | 'frontend-gen' | 'frontend-deploy' | 'ready'
    const [buildPhase, setBuildPhase] = useState<string>('idle');

    // Code generation state
    const [generationProgress, setGenerationProgress] = useState<{
        isGenerating: boolean;
        status: string;
        files: GeneratedFile[];
    }>({ isGenerating: false, status: '', files: [] });

    // Version history
    const [projectVersions, setProjectVersions] = useState<ProjectVersion[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // File explorer
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'server']));
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Terminals
    const [frontendTerminal, setFrontendTerminal] = useState<string>('');
    const [backendTerminal, setBackendTerminal] = useState<string>('');
    const [adminTerminal, setAdminTerminal] = useState<string>('');

    // Runtime auto-fix state
    const [isAutoFixing, setIsAutoFixing] = useState(false);
    const [lastFixedError, setLastFixedError] = useState('');

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Load project if projectId is present
    useEffect(() => {
        const pid = searchParams.get('projectId');
        if (pid) {
            setProjectId(pid);
            loadProject(pid);
        }
    }, [searchParams]);

    // Listen for runtime errors from the iframe
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'CONSOLE_ERROR') {
                const errorMsg = event.data.message;

                // Ignore empty or unhelpful errors
                if (!errorMsg || errorMsg.includes('favicon.ico') || errorMsg.includes('Failed to fetch dynamically imported module')) return;

                // Prevent infinite fix loops or concurrent fixes
                if (isAutoFixing || loading || buildPhase !== 'ready' || !sandboxData) return;
                if (lastFixedError === errorMsg) return; // Prevent repeating same fix

                console.error("[Runtime Error Detected]", errorMsg, event.data);
                setIsAutoFixing(true);
                setLastFixedError(errorMsg);

                // Use a functional update to add messages without strict dependency tracking
                setChatMessages(prev => [...prev,
                { content: `🚨 Browser Runtime Error Detected: ${errorMsg.substring(0, 100)}...`, type: 'error', timestamp: new Date() },
                { content: `🔄 Automatically attempting to patch the runtime error...`, type: 'system', timestamp: new Date() }
                ]);

                try {
                    const fixPrompt = `CRITICAL: You are an expert React debugger. The frontend application just crashed in the browser with this RUNTIME error. Resolve only critical errors that prevent the website from running.

ERROR MESSAGE:
\`\`\`
${errorMsg}
\`\`\`

CURRENT SOURCE CODE:
${generationProgress.files.filter(f => f.layer === 'frontend').map(f => '<file path="' + f.path + '">\\n' + f.content + '\\n</file>').join('\\n\\n').substring(0, 10000)}

YOUR TASK:
1. Analyze the React runtime error (e.g., "Cannot read properties of undefined", syntax errors, critical hook failures).
2. Fix all necessary frontend files to resolve only the one(s) stopping the website from running.
3. Add defensive checks \`if (!data) return ...\` or optional chaining \`data?.property\` where appropriate.
4. Output ONLY the modified files in full.`;

                    // Trigger direct code generation (similar logic to autoFixErrors)
                    const response = await fetch('/api/generate-mern-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: fixPrompt,
                            layer: 'frontend',
                            apiContext: sandboxData.backend.apiEndpoint,
                            model: aiModel,
                            isEdit: true,
                            style: homeStyleInput || 'Modern',
                            currentCodebase: generationProgress.files,
                            backendSchema: ''
                        }),
                    });

                    if (!response.body) throw new Error("No response from AI API");
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let accumulatedRawCode = '';
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    if (data.type === 'stream' && data.text) {
                                        accumulatedRawCode += data.text;
                                    }
                                } catch (e) { }
                            }
                        }
                    }

                    // Parse files 
                    const fileRegex = new RegExp('<file path="([^"]+)">([\\\\s\\\\S]*?)<\\\\/file>', 'g');
                    let match;
                    const parsed: GeneratedFile[] = [];
                    while ((match = fileRegex.exec(accumulatedRawCode)) !== null) {
                        parsed.push({
                            path: match[1],
                            content: match[2].trim(),
                            type: 'javascript',
                            completed: true,
                            layer: 'frontend'
                        });
                    }

                    if (parsed.length > 0) {
                        setChatMessages(prev => [...prev, { content: '🔧 Applying ' + parsed.length + ' runtime hotfixes to frontend...', type: 'system', timestamp: new Date() }]);

                        // Apply the files via our endpoint
                        await fetch('/api/apply-frontend-files', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sandboxId: sandboxData.frontend.sandboxId, files: parsed })
                        });

                        // Update local state so UI reflects the new code
                        setGenerationProgress(prev => ({
                            ...prev,
                            files: [...prev.files.filter(f => parsed.findIndex(p => p.path === f.path) === -1), ...parsed]
                        }));

                        setChatMessages(prev => [...prev, { content: '✅ Runtime hotfix applied successfully! Refreshing preview...', type: 'system', timestamp: new Date() }]);

                        // Restart frontend to pick up changes cleanly if needed, though vite HMR usually handles it
                        await fetch('/api/restart-frontend', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sandboxId: sandboxData.frontend.sandboxId })
                        });

                    } else {
                        setChatMessages(prev => [...prev, { content: '⚠️ AI could not determine a hotfix for this runtime error.', type: 'error', timestamp: new Date() }]);
                    }
                } catch (e: any) {
                    setChatMessages(prev => [...prev, { content: '❌ Runtime Auto-Fix failed: ' + e.message, type: 'error', timestamp: new Date() }]);
                } finally {
                    setIsAutoFixing(false);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [sandboxData, loading, buildPhase, generationProgress, isAutoFixing, lastFixedError, aiModel, homeStyleInput]);


    const loadProject = async (id: string) => {
        try {
            setLoading(true);
            addChatMessage('Loading project from database...', 'system');

            const res = await fetch(`/api/projects/${id}`);
            const data = await res.json();
            if (!data.success || !data.project) {
                addChatMessage('Project not found in database.', 'error');
                return;
            }

            const project = data.project;
            console.log('[LoadProject] Loaded:', {
                name: project.name,
                filesCount: Array.isArray(project.files) ? project.files.length : 0,
                sandboxId: project.sandboxId,
                type: project.type,
            });

            // Restore prompt
            setHomePromptInput(project.name);

            // Restore files with proper types
            if (project.files && Array.isArray(project.files) && project.files.length > 0) {
                const restoredFiles: GeneratedFile[] = project.files.map((f: any) => ({
                    path: f.path,
                    content: f.content,
                    type: f.type || 'file',
                    completed: true,
                    layer: f.layer || 'frontend', // Preserve layer info
                }));

                setGenerationProgress(prev => ({ ...prev, files: restoredFiles }));

                // Detect if this project has admin files — restore includeAdmin state
                const hasAdminFiles = restoredFiles.some(f => f.layer === 'admin');
                if (hasAdminFiles) {
                    setIncludeAdmin(true);
                    addChatMessage(`Detected Admin Dashboard(${restoredFiles.filter(f => f.layer === 'admin').length} admin files).`, 'system');
                }

                // Select first file
                if (restoredFiles.length > 0) setSelectedFile(restoredFiles[0].path);

                const frontendCount = restoredFiles.filter(f => f.layer === 'frontend').length;
                const backendCount = restoredFiles.filter(f => f.layer === 'backend').length;
                const adminCount = restoredFiles.filter(f => f.layer === 'admin').length;
                addChatMessage(`Restored ${restoredFiles.length} files(Frontend: ${frontendCount}, Backend: ${backendCount}${adminCount > 0 ? `, Admin: ${adminCount}` : ''}).`, 'system');
            }

            setShowHomeScreen(false);
            setBuildPhase('ready');
            addChatMessage(`Project "${project.name}" loaded successfully.`, 'system');
            addChatMessage('💡 Click "Deploy Now" in the header to spin up fresh sandboxes and run the app live.', 'system');

        } catch (error) {
            console.error('Failed to load project:', error);
            addChatMessage('Failed to load project from database.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveProject = async (name: string, files: GeneratedFile[], sData: FullStackSandboxData | null) => {
        try {
            const body = {
                name: name || 'MERN Project',
                type: 'mern',
                files: files,
                sandboxId: sData ? `${sData.frontend.sandboxId}|${sData.backend.sandboxId}|${sData.admin?.sandboxId || ''}` : null
            };

            const endpoint = projectId ? `/api/projects/${projectId}` : '/api/projects';
            const method = projectId ? 'PATCH' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success && data.project) {
                if (!projectId) {
                    setProjectId(data.project.id);
                    // Update URL without refresh
                    const newUrl = `${window.location.pathname}?projectId=${data.project.id}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                }
                console.log(`Project ${projectId ? 'updated' : 'saved'} in database:`, data.project.id);
            }
        } catch (error) {
            console.error('Failed to save project:', error);
        }
    };

    const addChatMessage = (content: string, type: ChatMessage['type']) => {
        setChatMessages(prev => [...prev, { content, type, timestamp: new Date() }]);
    };

    const runCommand = async (sandboxId: string, command: string, layer: 'frontend' | 'backend', cwd?: string) => {
        return new Promise((resolve, reject) => {
            const setTerminal = layer === 'frontend' ? setFrontendTerminal : setBackendTerminal;
            setTerminal(prev => prev + `\n > ${command} \n`);

            const eventSource = new EventSource('/api/execute-command-stream');

            // Note: SSE post via EventSource is tricky, we use traditional fetch for setup and then EventSource for stream? 
            // Better: use fetch + readable stream for commands too.
        });
    };

    // Helper for streaming commands
    const executeStreamCommand = async (sandboxId: string, command: string, layer: 'frontend' | 'backend' | 'admin', cwd?: string) => {
        const setTerminal = layer === 'frontend' ? setFrontendTerminal : layer === 'admin' ? setAdminTerminal : setBackendTerminal;
        setTerminal(prev => prev + `\n\x1b[34m > ${command} \x1b[0m\n`);

        try {
            const response = await fetch('/api/execute-command-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId, command, cwd })
            });

            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep partial line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6).trim());
                            if (data.type === 'stdout') setTerminal(prev => prev + data.content);
                            if (data.type === 'stderr') setTerminal(prev => prev + `\x1b[31m${data.content} \x1b[0m`);
                            if (data.type === 'complete') {
                                if (data.exitCode !== 0 && data.exitCode !== undefined) {
                                    addChatMessage(`Command "${command}" exited with code ${data.exitCode} `, 'error');
                                }
                                return data.exitCode;
                            }
                        } catch (e) {
                            // Partial JSON, ignore
                        }
                    }
                }
            }
        } catch (error: any) {
            setTerminal(prev => prev + `\n\x1b[31mError: ${error.message} \x1b[0m\n`);
            return 1;
        }
    };

    const verifyHealth = async (url: string, path: string = '/health', label?: string) => {
        const displayLabel = label || (path === '/health' ? 'Backend' : 'Frontend');
        addChatMessage(`Starting health checks for ${url}${path}...`, 'system');
        let lastReason = '';
        // Max 20 attempts, 2s apart = 40s total
        for (let i = 1; i <= 20; i++) {
            try {
                addChatMessage(`Health check attempt ${i}/20...`, 'system');
                // Use server-side proxy to avoid CORS issues
                const res = await fetch('/api/health-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, path })
                });
                const data = await res.json();
                if (data.success) {
                    addChatMessage(`✅ ${displayLabel} health check passed!`, 'system');
                    return true;
                }
                lastReason = data.reason || data.error || 'Unknown';
                if (i % 5 === 0) {
                    addChatMessage(`⚠️ Still waiting... Last response: ${lastReason}`, 'system');
                }
                console.log(`Health check ${i} response:`, data);
            } catch (e: any) {
                lastReason = e.message;
                console.log(`Health check ${i} error:`, e.message);
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        addChatMessage(`❌ ${displayLabel} health check failed after 20 attempts. Last error: ${lastReason}`, 'error');
        return false;
    };

    // Helper: scan generated files for external npm imports and find missing ones
    const detectMissingPackages = (files: GeneratedFile[]): string[] => {
        const preInstalled = new Set([
            'react', 'react-dom', 'react-router-dom', 'axios',
            'react-icons', 'lucide-react',
            'vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer',
            'eslint', 'eslint-plugin-react', 'eslint-plugin-react-hooks', 'eslint-plugin-react-refresh',
            '@types/react', '@types/react-dom'
        ]);
        const detected = new Set<string>();
        files.forEach(file => {
            if (!file.content) return;
            const re = /(?:import\s+.*?\s+from\s+['"]([^'"./][^'"]*?)['"]|import\s+['"]([^'"./][^'"]*?)['"]|require\s*\(\s*['"]([^'"./][^'"]*?)['"]\s*\))/g;
            let m;
            while ((m = re.exec(file.content)) !== null) {
                const raw = m[1] || m[2] || m[3];
                if (raw) {
                    const name = raw.startsWith('@') ? raw.split('/').slice(0, 2).join('/') : raw.split('/')[0];
                    detected.add(name);
                }
            }
        });
        return [...detected].filter(p => !preInstalled.has(p));
    };

    const addProjectCheckpoint = async (description: string, currentFiles: GeneratedFile[], currentData: FullStackSandboxData | null) => {
        let finalFiles = [...currentFiles];

        // Robust Save: fetch actual files from sandboxes if data is available
        if (currentData) {
            try {
                addChatMessage('Syncing files from sandboxes for robust checkpoint...', 'system');
                const [fRes, bRes, aRes] = await Promise.all([
                    currentData.frontend ? fetch(`/api/get-sandbox-files?sandboxId=${currentData.frontend.sandboxId}&type=frontend`) : Promise.resolve(null),
                    currentData.backend ? fetch(`/api/get-sandbox-files?sandboxId=${currentData.backend.sandboxId}&type=backend`) : Promise.resolve(null),
                    currentData.admin ? fetch(`/api/get-sandbox-files?sandboxId=${currentData.admin.sandboxId}&type=admin`) : Promise.resolve(null)
                ]);

                const [fData, bData, aData] = await Promise.all([
                    fRes ? fRes.json() : Promise.resolve(null),
                    bRes ? bRes.json() : Promise.resolve(null),
                    aRes ? aRes.json() : Promise.resolve(null)
                ]);

                const syncedFiles: GeneratedFile[] = [];
                const syncedLayers = new Set<string>();

                if (fData?.success) {
                    Object.entries(fData.files).forEach(([path, content]) => {
                        syncedFiles.push({ path, content: content as string, type: 'file', completed: true, layer: 'frontend' });
                    });
                    syncedLayers.add('frontend');
                }
                if (bData?.success) {
                    Object.entries(bData.files).forEach(([path, content]) => {
                        syncedFiles.push({ path, content: content as string, type: 'file', completed: true, layer: 'backend' });
                    });
                    syncedLayers.add('backend');
                }
                if (aData?.success) {
                    Object.entries(aData.files).forEach(([path, content]) => {
                        syncedFiles.push({ path, content: content as string, type: 'file', completed: true, layer: 'admin' });
                    });
                    syncedLayers.add('admin');
                }

                if (syncedLayers.size > 0) {
                    // Keep files from layers that WEREN'T synced from sandboxes
                    const unsyncedFiles = finalFiles.filter(f => !f.layer || !syncedLayers.has(f.layer));
                    finalFiles = [...unsyncedFiles, ...syncedFiles];
                    setGenerationProgress(prev => ({ ...prev, files: finalFiles }));
                }
            } catch (error) {
                console.error('Failed to sync files for checkpoint:', error);
            }
        }

        const newVersion: ProjectVersion = {
            id: Math.random().toString(36).substring(2, 9),
            description,
            timestamp: new Date(),
            files: finalFiles,
            sandboxData: currentData
        };
        setProjectVersions(prev => [newVersion, ...prev]);

        // Auto-save to database as well
        saveProject(homePromptInput || description, finalFiles, currentData);
        return newVersion;
    };

    const handleDownloadProject = async () => {
        if (!sandboxData?.frontend?.sandboxId || !sandboxData?.backend?.sandboxId) return;

        addChatMessage('Preparing complete MERN project bundle...', 'system');
        try {
            const res = await fetch('/api/create-fullstack-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frontendSandboxId: sandboxData.frontend.sandboxId,
                    backendSandboxId: sandboxData.backend.sandboxId
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            const zip = new JSZip();

            // Add frontend folder
            const frontendFolder = zip.folder("frontend");
            if (frontendFolder) {
                frontendFolder.file("frontend_all.zip", data.frontendZip, { base64: true });
            }

            // Add backend folder
            const backendFolder = zip.folder("backend");
            if (backendFolder) {
                backendFolder.file("backend_all.zip", data.backendZip, { base64: true });
            }

            // Note: Producing a nested zip is okay, but it's better to tell the user they are raw blobs.
            // Actually, let's just use the base64 to create blobs and put them in the zip.
            // JSZip can handle base64 directly as file content.

            const content = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `myth-project-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            addChatMessage('Project bundle downloaded successfully!', 'system');
        } catch (error: any) {
            addChatMessage(`Download failed: ${error.message}`, 'error');
        }
    };

    const handleRefreshPreview = () => {
        if (activeTab === 'admin-preview' && adminIframeRef.current) {
            adminIframeRef.current.src = adminIframeRef.current.src;
            addChatMessage('Refreshing admin preview...', 'system');
        } else if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
            addChatMessage('Refreshing preview...', 'system');
        }
    };

    const handleFullScreen = () => {
        if (activeTab === 'admin-preview' && sandboxData?.admin?.url) {
            window.open(sandboxData.admin.url, '_blank');
        } else if (sandboxData?.frontend?.url) {
            window.open(sandboxData.frontend.url, '_blank');
        }
    };

    const handleDeployExisting = async () => {
        if (generationProgress.files.length === 0) {
            addChatMessage('No files found to deploy. Please generate some first.', 'error');
            return;
        }

        setLoading(true);
        setBackendTerminal('');
        setFrontendTerminal('');
        setAdminTerminal('');
        setChatMessages(prev => [...prev, { content: '🚀 Re-deploying existing project to new sandboxes...', type: 'system', timestamp: new Date() }]);

        try {
            const files = generationProgress.files;

            // PHASE 1: BACKEND
            setBuildPhase('backend-sandbox');
            addChatMessage('Phase 1: Creating Backend Sandbox...', 'system');
            const bRes = await fetch('/api/create-fullstack-sandbox', {
                method: 'POST',
                body: JSON.stringify({ type: 'backend' })
            });
            const bData = await bRes.json();
            if (!bData.success) throw new Error(`Backend sandbox failed: ${bData.error}`);

            setSandboxData(bData);

            // Backend Deploy
            setBuildPhase('backend-deploy');
            addChatMessage('Deploying existing API source code...', 'system');
            const backendFiles = files.filter(f => f.layer === 'backend');
            await applyFiles(null as any, bData.backend.sandboxId, backendFiles);

            // Re-inject safe .env
            const envContent = `PORT=3001\nMONGO_URI=${bData.database.connectionString}\nMONGODB_URI=${bData.database.connectionString}\nNODE_ENV=development`;
            await applyFiles(null as any, bData.backend.sandboxId, [{ path: '.env', content: envContent, type: 'javascript', completed: true, layer: 'backend' }]);

            addChatMessage('Installing backend dependencies...', 'system');
            await fetch('/api/restart-backend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'install' })
            });

            addChatMessage('Starting backend server...', 'system');
            await fetch('/api/restart-backend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'restart' })
            });

            setBuildPhase('backend-verify');
            await verifyHealth(bData.backend.url);

            // PHASE 2: FRONTEND
            setBuildPhase('frontend-sandbox');
            addChatMessage('Phase 2: Creating Frontend Sandbox...', 'system');
            const fRes = await fetch('/api/create-frontend-sandbox', {
                method: 'POST',
                body: JSON.stringify({ sessionId: bData.sessionId })
            });
            const fData = await fRes.json();
            if (!fData.success) throw new Error(`Frontend sandbox failed: ${fData.error}`);

            setSandboxData(prev => ({
                ...prev,
                frontend: fData.frontend,
                backend: fData.backend || prev?.backend,
                database: fData.database || prev?.database,
                sessionId: fData.sessionId || prev?.sessionId
            } as FullStackSandboxData));

            setBuildPhase('frontend-gen');
            addChatMessage('Deploying existing UI components...', 'system');
            const frontendFiles = files.filter(f => f.layer === 'frontend');
            await applyFiles(fData.frontend.sandboxId, null as any, frontendFiles, 'frontend');

            addChatMessage('Installing UI dependencies...', 'system');
            await executeStreamCommand(fData.frontend.sandboxId, 'cd /home/user/app && npm install', 'frontend', '/home/user/app');

            addChatMessage('Restarting Vite server...', 'system');
            await fetch('/api/restart-frontend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: fData.frontend.sandboxId })
            });
            await new Promise(resolve => setTimeout(resolve, 5000));

            setBuildPhase('ready');
            addChatMessage('🎉 Frontend re-deployed successfully!', 'system');

            // PHASE 3: ADMIN (if admin files exist)
            const adminFiles = files.filter(f => f.layer === 'admin');
            if (adminFiles.length > 0) {
                setBuildPhase('admin-sandbox');
                addChatMessage('Phase 3: Creating Admin Sandbox...', 'system');
                const aRes = await fetch('/api/create-frontend-sandbox', {
                    method: 'POST',
                    body: JSON.stringify({ sessionId: bData.sessionId })
                });
                const aData = await aRes.json();
                if (!aData.success) throw new Error(`Admin sandbox failed: ${aData.error}`);

                setSandboxData(prev => ({
                    ...prev,
                    admin: aData.frontend
                } as FullStackSandboxData));

                setBuildPhase('admin-deploy');
                addChatMessage('Deploying existing Admin components...', 'system');
                await applyFiles(aData.frontend.sandboxId, null as any, adminFiles, 'admin');

                addChatMessage('Installing Admin dependencies...', 'system');
                await executeStreamCommand(aData.frontend.sandboxId, 'cd /home/user/app && npm install', 'admin', '/home/user/app');

                addChatMessage('Restarting Admin Vite server...', 'system');
                await fetch('/api/restart-frontend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: aData.frontend.sandboxId })
                });

                setBuildPhase('ready');
                addChatMessage('🎉 Admin Dashboard re-deployed successfully!', 'system');
            }

            // AUTO-FIX: Check for compilation errors after re-deploy
            addChatMessage('🔍 Running post-deploy error check...', 'system');
            await autoFixErrors('frontend', files);
            if (adminFiles.length > 0) {
                await autoFixErrors('admin', files);
            }

        } catch (error: any) {
            console.error('[Redeploy Flow] Error:', error);
            addChatMessage(`Build Error: ${error.message}`, 'error');
            setBuildPhase('error');
        } finally {
            setLoading(false);
        }
    };

    const handlePromptGenerate = async () => {
        setLoading(true);
        setHomeScreenFading(true);
        setTimeout(() => setShowHomeScreen(false), 500);
        setBackendTerminal('');
        setFrontendTerminal('');
        setAdminTerminal('');
        setChatMessages([{ content: '🚀 Starting Dual-Phase Sandbox Build...', type: 'system', timestamp: new Date() }]);

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

                if (images.length > 0 && pdfs.length > 0) {
                    fileInstructions = `\n**FILE CONTEXT:** The user provided images representing the desired UI style and PDFs containing content. Use the images for visual layout/style reference and the PDF content as the primary source of truth for text, data, and logic. [PDF Content]: ${extractedPdfText}`;
                } else if (images.length > 0) {
                    fileInstructions = `\n**FILE CONTEXT:** The user provided images representing the desired UI style. Use them as design reference.`;
                } else if (pdfs.length > 0) {
                    fileInstructions = `\n**FILE CONTEXT:** The user provided PDF files for content. Use this text as the primary source of truth: ${extractedPdfText}`;
                }
            } catch (error) {
                console.error("Error processing files:", error);
                addChatMessage('Failed to process uploaded files. Continuing with prompt only.', 'error');
            }
        }

        const enrichedPrompt = `${homePromptInput}\n**DESIGN STYLE:** ${homeStyleInput}${fileInstructions}${includeAdmin ? '\n**ADMIN DASHBOARD:** This app will also have an Admin Dashboard (CMS) to manage all data. The backend MUST include full CRUD endpoints (GET, POST, PUT, DELETE) for every model.' : ''}`;

        try {
            // PHASE 1: BACKEND
            setBuildPhase('backend-sandbox');
            addChatMessage('Phase 1: Creating Backend Sandbox...', 'system');
            const bRes = await fetch('/api/create-fullstack-sandbox', {
                method: 'POST',
                body: JSON.stringify({ type: 'backend' })
            });
            const bData = await bRes.json();
            if (!bData.success) throw new Error(`Backend sandbox failed: ${bData.error}`);

            setSandboxData(bData);
            setBackendTerminal(prev => prev + `✓ Backend sandbox created\nID: ${bData.backend.sandboxId}\n`);

            // Backend Gen
            setBuildPhase('backend-gen');
            setActiveTab('backend');
            let backendFiles = await generateCode(enrichedPrompt, 'backend', bData.database.connectionString);
            if (!backendFiles.length) throw new Error('API Generation failed');

            // Extract backend schema info from generated model files to share with frontend/admin
            const extractedSchema = backendFiles
                .filter(f => f.path.includes('model') || f.path.includes('Model') || f.path === 'server.js')
                .map(f => {
                    const fileName = f.path.split('/').pop() || f.path;
                    // Extract Mongoose schema definitions and route patterns
                    const schemaMatch = f.content.match(/new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*[,)]/i);
                    const routeMatches = f.content.match(/app\.use\s*\(['"]\/(api\/[^'"]+)['"].*\)/g) ||
                        f.content.match(/router\.(get|post|put|delete)\s*\(['"]([^'"]+)['"].*\)/g) || [];
                    return `File: ${fileName}\n${schemaMatch ? `Schema: { ${schemaMatch[1].trim()} }` : ''}\n${routeMatches.length ? `Routes: ${routeMatches.join(', ')}` : ''}`;
                })
                .filter(s => s.includes('Schema:') || s.includes('Routes:'))
                .join('\n\n');

            const backendSchemaContext = extractedSchema ||
                backendFiles.filter(f => f.path.includes('model') || f.path.includes('Model'))
                    .map(f => `// ${f.path}\n${f.content}`)
                    .join('\n\n');

            console.log('[Build] Extracted backend schema for frontend/admin:', backendSchemaContext.substring(0, 500));

            // Backend Deploy
            setBuildPhase('backend-deploy');
            addChatMessage('Deploying API source code...', 'system');
            await applyFiles(null as any, bData.backend.sandboxId, backendFiles);

            // Re-inject safe .env (Protect from AI overwriting with localhost)
            const envContent = `PORT=3001\nMONGO_URI=${bData.database.connectionString}\nMONGODB_URI=${bData.database.connectionString}\nNODE_ENV=development`;
            await applyFiles(null as any, bData.backend.sandboxId, [{ path: '.env', content: envContent, type: 'javascript', completed: true, layer: 'backend' }]);

            // Install dependencies using reliable Python subprocess
            addChatMessage('Installing backend dependencies...', 'system');
            const installRes = await fetch('/api/restart-backend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'install' })
            }).catch(() => null);

            // Restart backend server using reliable Python subprocess
            addChatMessage('Starting backend server (with full diagnostics)...', 'system');
            const restartBackendRes = await fetch('/api/restart-backend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'restart' })
            });
            const restartBackendData = await restartBackendRes.json();

            // Show the actual server logs in chat
            if (restartBackendData.logs) {
                const logLines = restartBackendData.logs.split('\n').filter((l: string) => l.trim());
                logLines.forEach((line: string) => {
                    if (line.includes('ERROR') || line.includes('CRASHED') || line.includes('FAILED') || line.includes('WARNING')) {
                        addChatMessage(`⚠️ ${line}`, 'error');
                    } else {
                        addChatMessage(`📋 ${line}`, 'system');
                    }
                });
            }

            // Verify
            addChatMessage('Verifying backend server health...', 'system');
            setBuildPhase('backend-verify');
            const isUp = await verifyHealth(bData.backend.url);

            if (!isUp) {
                // Run full diagnostics and Auto-Fix
                addChatMessage('Health check failed. Running full diagnostics for auto-fix...', 'system');
                const diagRes = await fetch('/api/restart-backend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'diagnose' })
                });
                const diagData = await diagRes.json();
                let currentDiagLogs = diagData.logs || 'Unknown error';

                if (diagData.logs) {
                    addChatMessage(`🔍 DIAGNOSTICS:\n${diagData.logs}`, 'error');
                    setBackendTerminal(prev => prev + '\n\n=== DIAGNOSTICS ===\n' + diagData.logs);
                }

                // AUTO-FIX BACKEND LOOP
                let backendFixed = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    addChatMessage(`🛠️ [Auto-Fix] Backend error detected. Attempting AI repair (attempt ${attempt}/3)...`, 'system');

                    const fixPrompt = `CRITICAL: You are an expert Node.js/Express debugger. The backend server failed to start or crashed.

ERROR LOGS FROM SERVER:
\`\`\`
${currentDiagLogs.substring(0, 2000)}
\`\`\`

CURRENT BROKEN SOURCE CODE:
${backendFiles.map(f => '<file path="' + f.path + '">\n' + f.content + '\n</file>').join('\n\n').substring(0, 8000)}

YOUR TASK:
1. Analyze the crashing error.
2. Fix ALL the syntax errors, logic bugs, missing imports, or package issues.
3. Return the COMPLETE fixed backend files. Do NOT leave out unchanged content within returned files.
4. Only return files that need fixes. 
5. Ensure successful compilation and execution.`;

                    const fixedBackendFiles = await generateCode(
                        fixPrompt,
                        'backend',
                        bData.database.connectionString,
                        true // isEdit
                    );

                    if (fixedBackendFiles.length === 0) {
                        addChatMessage(`🔧 [Auto-Fix] AI couldn't generate backend fixes.`, 'error');
                        break;
                    }

                    addChatMessage(`🔧 [Auto-Fix] Applying ${fixedBackendFiles.length} fixed backend files...`, 'system');
                    await applyFiles(null as any, bData.backend.sandboxId, fixedBackendFiles, 'backend');

                    // Update main file list safely
                    backendFiles = backendFiles.map(orig => {
                        const fixed = fixedBackendFiles.find(f => f.path === orig.path);
                        if (fixed) return { ...orig, ...fixed };
                        return orig;
                    });
                    fixedBackendFiles.forEach(f => {
                        if (!backendFiles.find(orig => orig.path === f.path)) {
                            backendFiles.push(f);
                        }
                    });

                    // Reactivate
                    addChatMessage('Restarting backend server after fixes...', 'system');
                    if (fixedBackendFiles.some(f => f.path === 'package.json')) {
                        await fetch('/api/restart-backend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'install' }) });
                    }
                    await fetch('/api/restart-backend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'restart' }) });

                    // Verify
                    const isUpNow = await verifyHealth(bData.backend.url);
                    if (isUpNow) {
                        backendFixed = true;
                        addChatMessage('✅ [Auto-Fix] Backend is now error-free and running!', 'system');
                        break;
                    } else {
                        // Get new logs
                        const newDiagRes = await fetch('/api/restart-backend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sandboxId: bData.backend.sandboxId, action: 'diagnose' }) });
                        const newDiagData = await newDiagRes.json();
                        currentDiagLogs = newDiagData.logs || 'Unknown error';
                    }
                }

                if (!backendFixed) {
                    throw new Error('Backend health check timed out. Auto-fix attempts failed. Check diagnostics above for the real error.');
                }
            }
            // Auto-seed the database with sample data so the frontend has something to display
            addChatMessage('Seeding database with sample data...', 'system');
            try {
                const seedRes = await fetch('/api/health-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: bData.backend.url, path: '/api/seed', method: 'POST' })
                });
                const seedData = await seedRes.json();
                if (seedData.success) {
                    addChatMessage('✅ Database seeded with sample data!', 'system');
                } else {
                    addChatMessage('ℹ️ No seed endpoint found (this is fine for simple apps)', 'system');
                }
            } catch {
                addChatMessage('ℹ️ Seed endpoint not available, continuing...', 'system');
            }

            // PHASE 2: FRONTEND
            setBuildPhase('frontend-sandbox');
            addChatMessage('Phase 2: Creating Frontend Sandbox...', 'system');
            const fRes = await fetch('/api/create-frontend-sandbox', {
                method: 'POST',
                body: JSON.stringify({ sessionId: bData.sessionId })
            });
            const fData = await fRes.json();
            if (!fData.success) throw new Error(`Frontend sandbox failed: ${fData.error}`);

            console.log('[Build] Phase 2: Frontend sandbox data:', JSON.stringify(fData.frontend));

            // Store URLs in local variables for guaranteed availability
            const fSandboxId = fData.frontend.sandboxId;
            const fSandboxUrl = fData.frontend.url;

            // SMART MERGE: Preserve backend data while adding frontend data
            setSandboxData(prev => {
                const newData = {
                    ...prev,
                    frontend: { sandboxId: fSandboxId, url: fSandboxUrl },
                    backend: fData.backend || prev?.backend,
                    database: fData.database || prev?.database,
                    sessionId: fData.sessionId || prev?.sessionId
                } as FullStackSandboxData;
                console.log('[Build] Phase 2: sandboxData updated, frontend URL:', newData.frontend?.url);
                return newData;
            });

            if (fData.frontend?.sandboxId) {
                setFrontendTerminal(prev => prev + `✓ Frontend sandbox created\nID: ${fData.frontend.sandboxId}\n`);
            }

            // Frontend Gen
            setBuildPhase('frontend-gen');
            setActiveTab('frontend');
            const backendUrl = fData.backend?.apiEndpoint || bData.backend?.apiEndpoint;
            if (!backendUrl) throw new Error('Backend URL lost during transition. Check system logs.');

            const frontendFiles = await generateCode(enrichedPrompt, 'frontend', backendUrl, false, backendSchemaContext);
            if (!frontendFiles.length) throw new Error('UI Generation failed');

            // Frontend Deploy
            setBuildPhase('frontend-deploy');
            addChatMessage('Deploying UI components...', 'system');
            await applyFiles(fData.frontend.sandboxId, null as any, frontendFiles, 'frontend');

            // ALWAYS install dependencies (sandbox has base packages, but AI may add new ones in package.json)
            addChatMessage('Installing UI dependencies (npm install)...', 'system');
            await executeStreamCommand(fData.frontend.sandboxId, 'cd /home/user/app && npm install', 'frontend', '/home/user/app');

            // THEN scan for any missing packages not in package.json
            addChatMessage('Scanning generated code for required packages...', 'system');
            const missingPackages = detectMissingPackages(frontendFiles);

            if (missingPackages.length > 0) {
                addChatMessage(`📦 Installing ${missingPackages.length} additional packages: ${missingPackages.join(', ')}`, 'system');
                const installCmd = `cd /home/user/app && npm install ${missingPackages.join(' ')}`;
                await executeStreamCommand(fData.frontend.sandboxId, installCmd, 'frontend', '/home/user/app');
            } else {
                addChatMessage('All required packages are pre-installed ✓', 'system');
            }

            // Restart Vite server to ensure --host 0.0.0.0 is applied
            addChatMessage('Restarting Vite development server...', 'system');
            const restartRes = await fetch('/api/restart-frontend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: fData.frontend.sandboxId })
            });
            const restartData = await restartRes.json();
            if (!restartData.success) {
                addChatMessage(`Warning: Vite restart triggered but API returned error: ${restartData.error}`, 'error');
            }
            addChatMessage('Vite server restart triggered successfully. Waiting 5s for warm-up...', 'system');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify Frontend
            addChatMessage('Verifying frontend development server...', 'system');
            const frontendUrl = fData.frontend?.url;
            if (!frontendUrl) throw new Error('Frontend URL not found');
            const isFrontUp = await verifyHealth(frontendUrl, '/');
            if (!isFrontUp) throw new Error('Frontend dev server failed to start. Preview unavailable.');

            // PHASE 3: ADMIN DASHBOARD (only if user opted in)
            // PHASE 3: ADMIN DASHBOARD (only if user opted in)
            let adminFiles: GeneratedFile[] = [];
            let adminSandboxData: { sandboxId: string, url: string } | undefined;
            if (includeAdmin) {
                addChatMessage('Phase 3: Building Admin Dashboard...', 'system');
                setBuildPhase('admin-sandbox');
                setActiveTab('admin-terminal');

                // Create admin sandbox (reuse frontend sandbox route)
                const aRes = await fetch('/api/create-frontend-sandbox', {
                    method: 'POST',
                    body: JSON.stringify({ sessionId: bData.sessionId + '-admin' })
                });
                const aData = await aRes.json();
                if (!aData.success) throw new Error(`Admin sandbox failed: ${aData.error}`);

                const adminSandboxId = aData.frontend.sandboxId;
                const adminSandboxUrl = aData.frontend.url;
                adminSandboxData = { sandboxId: adminSandboxId, url: adminSandboxUrl };
                console.log('[Build] Phase 3: Admin sandbox data:', JSON.stringify(adminSandboxData));

                setSandboxData(prev => {
                    const newData = {
                        ...prev,
                        admin: { sandboxId: adminSandboxId, url: adminSandboxUrl }
                    } as FullStackSandboxData;
                    console.log('[Build] Phase 3: sandboxData updated, frontend URL preserved:', newData.frontend?.url, 'admin URL:', newData.admin?.url);
                    return newData;
                });
                setAdminTerminal(prev => prev + `✓ Admin sandbox created\nID: ${aData.frontend.sandboxId}\n`);

                // Generate admin code
                setBuildPhase('admin-gen');
                const backendUrlForAdmin = fData.backend?.apiEndpoint || bData.backend?.apiEndpoint;
                adminFiles = await generateCode(enrichedPrompt, 'admin', backendUrlForAdmin!, false, backendSchemaContext);
                if (!adminFiles.length) throw new Error('Admin Dashboard generation failed');

                // Deploy admin files
                setBuildPhase('admin-deploy');
                addChatMessage('Deploying admin dashboard components...', 'system');
                await applyFiles(aData.frontend.sandboxId, null as any, adminFiles, 'admin');

                // ALWAYS run npm install for admin (fresh sandbox needs all dependencies)
                addChatMessage('Installing admin dashboard dependencies...', 'system');
                await executeStreamCommand(aData.frontend.sandboxId, 'cd /home/user/app && npm install', 'admin', '/home/user/app');

                // THEN scan for any missing packages not in package.json
                addChatMessage('Scanning admin code for additional packages...', 'system');
                const adminMissingPkgs = detectMissingPackages(adminFiles);
                if (adminMissingPkgs.length > 0) {
                    addChatMessage(`📦 Installing additional admin packages: ${adminMissingPkgs.join(', ')}`, 'system');
                    await executeStreamCommand(aData.frontend.sandboxId, `cd /home/user/app && npm install ${adminMissingPkgs.join(' ')}`, 'admin', '/home/user/app');
                }

                // Restart Vite for admin
                addChatMessage('Starting admin dashboard dev server...', 'system');
                const adminRestartRes = await fetch('/api/restart-frontend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: aData.frontend.sandboxId })
                });
                const adminRestartData = await adminRestartRes.json();
                if (!adminRestartData.success) {
                    addChatMessage(`Warning: Admin Vite restart error: ${adminRestartData.error}`, 'error');
                }
                addChatMessage('Admin Vite server starting. Waiting 8s for warm-up...', 'system');
                await new Promise(resolve => setTimeout(resolve, 8000));

                // Verify admin
                const adminUrl = aData.frontend?.url;
                if (adminUrl) {
                    const isAdminUp = await verifyHealth(adminUrl, '/', 'Admin');
                    if (!isAdminUp) {
                        addChatMessage('⚠️ Admin dashboard may need a moment to warm up. Try refreshing.', 'error');
                    }
                }
                addChatMessage('✅ Admin Dashboard deployed!', 'system');
            }

            // Ensure sandboxData has ALL correct URLs before marking ready
            setSandboxData(prev => {
                const finalData = {
                    ...prev,
                    frontend: { sandboxId: fData.frontend.sandboxId, url: fData.frontend.url },
                    backend: prev?.backend || bData.backend,
                    database: prev?.database || bData.database,
                    sessionId: prev?.sessionId || bData.sessionId,
                } as FullStackSandboxData;
                if (includeAdmin && adminSandboxData) {
                    finalData.admin = adminSandboxData;
                }
                console.log('[Build] FINAL sandboxData:', JSON.stringify({
                    frontendUrl: finalData.frontend?.url,
                    backendUrl: finalData.backend?.url,
                    adminUrl: finalData.admin?.url
                }));
                return finalData;
            });

            setBuildPhase('ready');
            setActiveTab('preview');
            addChatMessage('🎉 Full stack application is now LIVE!' + (includeAdmin ? ' (with Admin Dashboard)' : ''), 'system');

            // Construct sandboxData from local build variables for live sync
            const checkpointSandboxData: FullStackSandboxData = {
                frontend: { sandboxId: fData.frontend.sandboxId, url: fData.frontend.url },
                backend: bData.backend,
                database: bData.database,
                sessionId: bData.sessionId,
                ...(includeAdmin && adminSandboxData ? { admin: adminSandboxData } : {})
            };

            // AUTO-FIX: Check for compilation errors and auto-resolve them
            const allBuildFiles = [...backendFiles, ...frontendFiles, ...adminFiles];
            await autoFixErrors('frontend', allBuildFiles, checkpointSandboxData);
            if (includeAdmin && checkpointSandboxData.admin) {
                await autoFixErrors('admin', allBuildFiles, checkpointSandboxData);
            }

            // First checkpoint (stream state — post-fix)
            await addProjectCheckpoint(`Initial Build: ${homePromptInput.substring(0, 30)}...`, allBuildFiles, checkpointSandboxData);

        } catch (error: any) {
            console.error('[Build Flow] Error:', error);
            addChatMessage(`FATAL ERROR: ${error.message}`, 'error');
            setBuildPhase('error');
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // AUTO ERROR RESOLUTION ENGINE
    // Detects Vite/React compilation errors and uses AI
    // to automatically fix them — up to 3 retry attempts.
    // =====================================================
    // =====================================================
    const autoFixErrors = async (layer: 'frontend' | 'admin', currentFiles: GeneratedFile[], currentSandboxData: FullStackSandboxData, maxRetries: number = 3) => {
        const layerLabel = layer === 'admin' ? 'Admin Dashboard' : 'Frontend';
        const sbId = layer === 'admin' ? currentSandboxData?.admin?.sandboxId : currentSandboxData?.frontend?.sandboxId;

        if (!sbId || !currentSandboxData) {
            console.log(`[AutoFix] No sandbox for ${layer}, skipping.`);
            return;
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            addChatMessage(`🔍 [Auto-Fix] Checking ${layerLabel} for compilation errors (attempt ${attempt}/${maxRetries})...`, 'system');

            try {
                // Step 1: Run Vite build check to detect errors
                const checkRes = await fetch('/api/check-vite-errors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: sbId })
                });
                const checkData = await checkRes.json();

                if (!checkData.hasErrors) {
                    addChatMessage(`✅ [Auto-Fix] ${layerLabel} compiled successfully — no errors detected!`, 'system');
                    return; // No errors, exit the loop
                }

                const errorDetails = checkData.errors?.join('\n\n') || checkData.raw || 'Unknown compilation error';
                addChatMessage(`⚠️ [Auto-Fix] Found ${layerLabel} errors. Attempting automatic repair...`, 'system');

                // Step 2: Identify which files contain errors
                const layerFiles = generationProgress.files.filter(f => f.layer === layer);
                const errorFileNames = extractErrorFileNames(errorDetails);

                // Gather the source code of broken files for AI context
                const brokenFilesContext = layerFiles
                    .filter(f => {
                        // Include files that are mentioned in errors, or all if we can't determine
                        if (errorFileNames.length === 0) return true;
                        return errorFileNames.some(ef => f.path.includes(ef));
                    })
                    .map(f => `<file path="${f.path}">\n${f.content}\n</file>`)
                    .join('\n\n');

                // Step 3: Send to AI for correction
                const fixPrompt = `CRITICAL: You are an expert debugger. The following ${layerLabel} code has COMPILATION ERRORS that prevent it from running. Resolve only the critical errors stopping the website from running.

ERROR OUTPUT FROM VITE BUILD:
\`\`\`
${errorDetails.substring(0, 2000)}
\`\`\`

CURRENT BROKEN SOURCE CODE:
${brokenFilesContext.substring(0, 8000)}

YOUR TASK:
1. Analyze the errors carefully, focusing on those that block the application from loading.
2. Fix syntax errors, missing critical imports, and incorrect JSX.
3. Ignore minor linting warnings that don't stop the dev server.
4. Return the COMPLETE fixed files — do NOT leave out any content.
5. Make sure the code compiles without blocking errors.

ORIGINAL APP DESCRIPTION: ${homePromptInput}`;

                const fixedFiles = await generateCode(
                    fixPrompt,
                    layer,
                    currentSandboxData.backend.apiEndpoint,
                    true // isEdit = true
                );

                if (fixedFiles.length === 0) {
                    addChatMessage(`🔧 [Auto-Fix] AI couldn't generate fixes for attempt ${attempt}. ${attempt < maxRetries ? 'Retrying...' : 'Giving up.'}`, 'error');
                    continue;
                }

                addChatMessage(`🔧 [Auto-Fix] Applying ${fixedFiles.length} fixed files to ${layerLabel}...`, 'system');

                // Step 4: Apply fixed files
                if (layer === 'admin' && currentSandboxData.admin) {
                    await applyFiles(currentSandboxData.admin.sandboxId, currentSandboxData.backend.sandboxId, fixedFiles, 'admin');
                } else {
                    await applyFiles(currentSandboxData.frontend.sandboxId, currentSandboxData.backend.sandboxId, fixedFiles, 'frontend');
                }

                // Step 5: Restart Vite to pick up the fixed files
                addChatMessage(`🔄 [Auto-Fix] Restarting ${layerLabel} dev server after fixes...`, 'system');
                await fetch('/api/restart-frontend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: sbId })
                });
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (error: any) {
                console.error(`[AutoFix] Error on attempt ${attempt}:`, error);
                addChatMessage(`❌ [Auto-Fix] Attempt ${attempt} failed: ${error.message}`, 'error');
            }
        }

        // Final verification after all retries
        try {
            const finalCheck = await fetch('/api/check-vite-errors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandboxId: sbId })
            });
            const finalData = await finalCheck.json();
            if (finalData.hasErrors) {
                addChatMessage(`⚠️ [Auto-Fix] ${layerLabel} still has errors after ${maxRetries} attempts. You can fix them manually via the chat.`, 'error');
            } else {
                addChatMessage(`✅ [Auto-Fix] ${layerLabel} is now error-free!`, 'system');
            }
        } catch { /* ignore final check errors */ }
    };

    const handleAutoFixAll = async () => {
        if (!sandboxData || generationProgress.files.length === 0) return;
        setLoading(true);
        addChatMessage('🚀 User initiated Auto-Fix. Scanning all layers for errors...', 'system');
        try {
            const allBuildFiles = [...generationProgress.files];

            // Re-run frontend and admin error checks
            if (sandboxData.frontend) {
                await autoFixErrors('frontend', allBuildFiles, sandboxData, 2);
            }
            if (includeAdmin && sandboxData.admin) {
                await autoFixErrors('admin', allBuildFiles, sandboxData, 2);
            }

            // Check backend health
            if (sandboxData.backend?.url) {
                const isUp = await verifyHealth(sandboxData.backend.url);
                if (!isUp) {
                    addChatMessage('⚠️ Backend health check failed. Please re-deploy or diagnose.', 'error');
                } else {
                    addChatMessage('✅ Backend is healthy!', 'system');
                }
            }
            addChatMessage('🎉 Auto-Fix scan complete!', 'system');
        } catch (e: any) {
            addChatMessage(`Auto-Fix process error: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Helper: Extract filenames from Vite error output
    const extractErrorFileNames = (errorOutput: string): string[] => {
        const fileNames = new Set<string>();
        // Match patterns like: /home/user/app/src/pages/TasksPage.jsx:222:102
        const pathRegex = /\/home\/user\/app\/([^\s:]+)/g;
        let match;
        while ((match = pathRegex.exec(errorOutput)) !== null) {
            const filePath = match[1];
            // Ignore node_modules
            if (!filePath.includes('node_modules')) {
                fileNames.add(filePath);
            }
        }
        // Also match: [plugin:...] file.jsx
        const pluginRegex = /\[plugin:[^\]]+\]\s+([^\s:]+\.(jsx|tsx|js|ts|css))/g;
        while ((match = pluginRegex.exec(errorOutput)) !== null) {
            const fileName = match[1];
            if (!fileName.includes('node_modules')) {
                fileNames.add(fileName);
            }
        }
        return Array.from(fileNames);
    };

    const generateCode = async (prompt: string, layer: 'frontend' | 'backend' | 'admin' | 'both', apiContext: string, isEdit: boolean = false, backendSchema: string = '') => {
        setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: isEdit ? 'Analyzing edits...' : `Generating ${layer}...` }));
        let localFiles: GeneratedFile[] = [];

        try {
            const response = await fetch('/api/generate-mern-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    layer,
                    apiContext,
                    model: aiModel,
                    isEdit,
                    style: homeStyleInput,
                    currentCodebase: isEdit ? generationProgress.files : [],
                    backendSchema
                }),
            });

            if (!response.body) return [];
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedRawCode = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep partial line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'stream' && data.text) {
                                accumulatedRawCode += data.text;

                                // Parse files from the accumulated AI text
                                const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
                                let match;
                                const parsed: GeneratedFile[] = [];
                                while ((match = fileRegex.exec(accumulatedRawCode)) !== null) {
                                    parsed.push({
                                        path: match[1],
                                        content: match[2].trim(),
                                        type: 'javascript',
                                        completed: true,
                                        layer
                                    });
                                }

                                if (parsed.length > localFiles.length) {
                                    localFiles = parsed;
                                    setGenerationProgress(prev => ({
                                        ...prev,
                                        files: [...prev.files.filter(f => f.layer !== layer), ...parsed]
                                    }));
                                    if (!selectedFile && parsed.length > 0) setSelectedFile(parsed[0].path);
                                }
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            // Ignore partial JSON or other parsing issues
                        }
                    }
                }
            }
        } catch (e: any) {
            addChatMessage(`Generation failed for ${layer}: ${e.message}`, 'error');
        }

        setGenerationProgress(prev => ({ ...prev, isGenerating: false }));
        return localFiles;
    };

    const applyFiles = async (fId: string, bId: string, files: GeneratedFile[], layerPref?: 'frontend' | 'backend' | 'admin') => {
        const isFrontend = layerPref === 'frontend' || (files.length > 0 && files[0].layer === 'frontend');
        const isAdmin = layerPref === 'admin' || (files.length > 0 && files[0].layer === 'admin');
        const endpoint = (isFrontend || isAdmin) ? '/api/apply-frontend-files' : '/api/apply-files';
        const sandboxId = isAdmin ? sandboxData?.admin?.sandboxId : isFrontend ? fId : null;
        const body = (isFrontend || isAdmin)
            ? { sandboxId: sandboxId || fId, files }
            : { frontendSandboxId: fId, backendSandboxId: bId, files };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        if (!res.ok) {
            const target = isAdmin ? 'admin' : isFrontend ? 'frontend' : 'backend';
            throw new Error(`Failed to write files to ${target} sandbox: ${data.error || res.statusText}`);
        }
    };

    const handleChatSubmit = async () => {
        if (!aiChatInput.trim() || loading || !sandboxData) return;
        const userInput = aiChatInput;
        addChatMessage(userInput, 'user');
        setAiChatInput('');
        setLoading(true);

        try {
            addChatMessage('Analyzing request and existing codebase...', 'system');

            // Smart layer detection based on user input keywords
            const lowerInput = userInput.toLowerCase();
            const frontendKeywords = ['theme', 'color', 'style', 'layout', 'button', 'font', 'css', 'ui', 'dark mode', 'light mode', 'design', 'header', 'footer', 'navbar', 'sidebar', 'card', 'image', 'icon', 'animation', 'hover', 'responsive', 'page', 'component', 'modal', 'form'];
            const backendKeywords = ['api', 'endpoint', 'database', 'model', 'schema', 'route', 'auth', 'login', 'signup', 'crud', 'delete', 'update', 'create', 'server', 'middleware', 'seed', 'mongo', 'field'];
            const adminKeywords = ['admin', 'dashboard', 'stats', 'analytics', 'manage', 'cms', 'table', 'panel', 'control panel'];

            const isFrontend = frontendKeywords.some(k => lowerInput.includes(k));
            const isBackend = backendKeywords.some(k => lowerInput.includes(k));
            const isAdmin = sandboxData.admin && adminKeywords.some(k => lowerInput.includes(k));

            let editLayer: 'frontend' | 'backend' | 'admin' | 'both';
            if (isAdmin && !isFrontend && !isBackend) {
                editLayer = 'admin';
                addChatMessage('Detected admin dashboard change. Modifying admin panel...', 'system');
            } else if (isFrontend && !isBackend && !isAdmin) {
                editLayer = 'frontend';
                addChatMessage('Detected frontend change. Modifying UI only...', 'system');
            } else if (isBackend && !isFrontend && !isAdmin) {
                editLayer = 'backend';
                addChatMessage('Detected backend change. Modifying API only...', 'system');
            } else {
                editLayer = 'both';
                addChatMessage('Detected full-stack change. Modifying both layers...', 'system');
            }

            // Build edit prompt with original context
            const editPrompt = `ORIGINAL APP DESCRIPTION: ${homePromptInput}${includeAdmin ? '\n\nThis app also has an ADMIN DASHBOARD (separate React app) for managing all data.' : ''}\n\nBASED ON THE EXISTING CODEBASE, APPLY THIS CHANGE: ${userInput}`;
            const modifiedFiles = await generateCode(editPrompt, editLayer, sandboxData.backend.apiEndpoint, true);

            if (modifiedFiles.length === 0) {
                addChatMessage('No changes were identified as necessary.', 'system');
                return;
            }

            addChatMessage(`Applying ${modifiedFiles.length} modified files...`, 'system');

            // Apply files to the correct sandbox(es)
            const frontendModFiles = modifiedFiles.filter(f => f.layer === 'frontend');
            const backendModFiles = modifiedFiles.filter(f => f.layer === 'backend');
            const adminModFiles = modifiedFiles.filter(f => f.layer === 'admin');

            if (frontendModFiles.length > 0) {
                await applyFiles(sandboxData.frontend.sandboxId, sandboxData.backend.sandboxId, frontendModFiles, 'frontend');
            }
            if (backendModFiles.length > 0) {
                await applyFiles(sandboxData.frontend.sandboxId, sandboxData.backend.sandboxId, backendModFiles, 'backend');
            }
            if (adminModFiles.length > 0 && sandboxData.admin) {
                await applyFiles(sandboxData.admin.sandboxId, sandboxData.backend.sandboxId, adminModFiles, 'admin');
            }

            // Handle restarts and dependency updates
            const hasBackendChanges = backendModFiles.length > 0;
            const hasFrontendChanges = frontendModFiles.length > 0;
            const hasAdminChanges = adminModFiles.length > 0;

            if (hasBackendChanges) {
                // Check if backend package.json was modified
                if (backendModFiles.some(f => f.path === 'package.json')) {
                    addChatMessage('Backend dependencies changed. Running npm install...', 'system');
                    await executeStreamCommand(sandboxData.backend.sandboxId, 'npm install', 'backend');
                }
                addChatMessage('Backend changes detected. Restarting server...', 'system');
                await executeStreamCommand(sandboxData.backend.sandboxId, 'touch server.js', 'backend');
            }

            if (hasFrontendChanges) {
                // Scan modified frontend files for any new packages
                const editMissingPkgs = detectMissingPackages(frontendModFiles);
                if (editMissingPkgs.length > 0) {
                    addChatMessage(`📦 New packages detected: ${editMissingPkgs.join(', ')}`, 'system');
                    await executeStreamCommand(sandboxData.frontend.sandboxId, `cd /home/user/app && npm install ${editMissingPkgs.join(' ')}`, 'frontend', '/home/user/app');
                }
                // Also run npm install if package.json was modified
                if (frontendModFiles.some(f => f.path === 'package.json')) {
                    addChatMessage('Frontend dependencies changed. Running npm install...', 'system');
                    await executeStreamCommand(sandboxData.frontend.sandboxId, 'npm install', 'frontend', '/home/user/app');
                }

                // Restart Vite to pick up any config or structural changes
                addChatMessage('Frontend changes detected. Restarting Vite server...', 'system');
                const restartRes = await fetch('/api/restart-frontend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: sandboxData.frontend.sandboxId })
                });
                const restartData = await restartRes.json();
                if (!restartData.success) {
                    addChatMessage(`Warning: Vite restart issue: ${restartData.error}`, 'error');
                }
                // Wait for Vite to warm up
                await new Promise(resolve => setTimeout(resolve, 3000));
                addChatMessage('Frontend server restarted. Preview updating...', 'system');
            }

            // Update local file state
            setGenerationProgress(prev => {
                const updatedFiles = [...prev.files];
                modifiedFiles.forEach(modFile => {
                    const idx = updatedFiles.findIndex(f => f.path === modFile.path && f.layer === modFile.layer);
                    if (idx !== -1) {
                        updatedFiles[idx] = modFile;
                    } else {
                        updatedFiles.push(modFile);
                    }
                });
                return { ...prev, files: updatedFiles };
            });

            // Refresh preview iframe after changes
            if (hasFrontendChanges && iframeRef.current) {
                setTimeout(() => {
                    if (iframeRef.current) {
                        iframeRef.current.src = iframeRef.current.src;
                    }
                }, 2000);
            }

            // Handle admin changes
            if (hasAdminChanges && sandboxData.admin) {
                const adminMissingPkgs = detectMissingPackages(adminModFiles);
                if (adminMissingPkgs.length > 0) {
                    addChatMessage(`📦 Admin packages: ${adminMissingPkgs.join(', ')}`, 'system');
                    await executeStreamCommand(sandboxData.admin.sandboxId, `cd /home/user/app && npm install ${adminMissingPkgs.join(' ')}`, 'admin', '/home/user/app');
                }
                addChatMessage('Admin dashboard changes detected. Restarting...', 'system');
                await fetch('/api/restart-frontend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: sandboxData.admin.sandboxId })
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
                addChatMessage('Admin dashboard restarted.', 'system');
            }


            // Capture robust checkpoint after generation + deployment
            await addProjectCheckpoint(`Edit: ${userInput.substring(0, 30)}...`, modifiedFiles, sandboxData);

            // AUTO-FIX after edits: check for compilation errors
            if (hasFrontendChanges) {
                await autoFixErrors('frontend', modifiedFiles, 1);
            }
            if (hasAdminChanges && sandboxData.admin) {
                await autoFixErrors('admin', modifiedFiles, 1);
            }

            addChatMessage('✅ Changes applied successfully!', 'system');
        } catch (error: any) {
            addChatMessage(`Execution failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(folderPath) ? next.delete(folderPath) : next.add(folderPath);
            return next;
        });
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jsx', 'js'].includes(ext!)) return <SiJavascript className="w-4 h-4 text-yellow-400" />;
        if (ext === 'css') return <SiCss3 className="w-4 h-4 text-blue-400" />;
        if (ext === 'json') return <SiJson className="w-4 h-4 text-green-400" />;
        return <FiFile className="w-4 h-4 text-gray-400" />;
    };

    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            setHomeFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    }, []);

    const renderHomeScreen = () => (
        <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${homeScreenFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/20 via-blue-400/10 to-transparent rounded-full blur-[80px] animate-[sunPulse_5s_ease-in-out_infinite]" />
                <div className="absolute bottom-0 left-1/2 w-[800px] h-[800px] animate-[orbShrink_3s_ease-out_forwards]" style={{ transform: 'translateX(-50%) translateY(45%)' }}><div className="relative w-full h-full"><div className="absolute inset-0 bg-blue-700/20 rounded-full blur-[100px] opacity-30 animate-pulse"></div><div className="absolute inset-32 bg-blue-500/30 rounded-full blur-[60px] opacity-50 animate-pulse" style={{ animationDelay: '0.6s' }}></div></div></div>
            </div>
            <Button variant="ghost" onClick={() => router.push("/")} size="icon" title="Go to Landing Page" className="absolute top-8 left-8 z-30 h-10 w-10 text-gray-300 bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-full transition-all hover:text-white hover:bg-gray-800/50 shadow-[0_0_15px_1px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_2px_rgba(59,130,246,0.5)] duration-200"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></Button>
            <div className="relative z-10 h-full flex items-center justify-center px-4 overflow-y-auto">
                <div className="text-center mt-70 max-w-5xl w-full mx-auto pb-8">
                    <div className="text-center pt-12"><h1 className="text-5xl lg:text-6xl text-white font-bold tracking-tight animate-[fadeIn_0.8s_ease-out]">MYTH <span className="text-blue-500">2.0</span></h1><p className="text-base lg:text-lg max-w-lg mx-auto mt-3 text-white/80">Real-time MERN stack engine. Zero mocks. Pure execution.</p></div>
                    <form onSubmit={(e) => { e.preventDefault(); handlePromptGenerate(); }} className="mt-6 w-full mx-auto space-y-4">
                        <div className="relative">
                            <Textarea value={homePromptInput} onChange={(e) => setHomePromptInput(e.target.value)} placeholder="e.g., A full-stack E-commerce site with product management..." rows={2} className="w-full p-4 pr-12 rounded-xl border border-gray-800/50 bg-black/60 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-base transition-all duration-200" />
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
                                <button
                                    type="button"
                                    onClick={() => setIncludeAdmin(!includeAdmin)}
                                    className={`w-full p-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${includeAdmin ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10' : 'border-gray-800/50 bg-black/40 hover:border-gray-700 text-gray-400'}`}
                                >
                                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] transition-all ${includeAdmin ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-600'}`}>
                                        {includeAdmin && '✓'}
                                    </span>
                                    🛠️ Include Admin Dashboard (CMS)
                                </button>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="h-12 px-4 text-sm bg-black/40 backdrop-blur-md border border-gray-800/60 text-white rounded-xl flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                        <select
                                            value={aiModel}
                                            onChange={(e) => setAiModel(e.target.value)}
                                            className="bg-transparent border-none outline-none text-white cursor-pointer appearance-none [&_option]:text-black"
                                        >
                                            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                                            <option value="google/gemini-3-flash-preview">Gemini 3 Flash</option>
                                            <option value="google/gemini-3-pro-preview">Gemini 3 Pro</option>
                                            {/* <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                                            <option value="gpt-4o">GPT-4o</option>
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            <option value="llama-3.3-70b">Llama 3.3 70B</option> */}
                                        </select>
                                    </div>
                                    <Button type="submit" disabled={loading || !homePromptInput || !homeStyleInput} className="h-12 flex-grow px-6 rounded-xl text-base font-bold text-white bg-white/10 backdrop-blur-md border border-blue-500/40 shadow-lg hover:bg-white/20 hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {loading ? "Initializing..." : <>✨ <span>Build Full-Stack</span></>}
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
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setHomeFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center justify-center text-center text-gray-400">
                                        <FiUploadCloud className="w-8 h-8 mb-2" />
                                        <p className="font-semibold">Drop files here or <span className="text-purple-400">click to browse</span></p>
                                        <p className="text-xs mt-1">PDFs for content, Images for UI reference</p>
                                    </div>
                                </div>
                                {homeFiles.length > 0 && (
                                    <div className="bg-black/50 backdrop-blur-sm border border-purple-900/40 rounded-xl p-3 space-y-2 max-h-28 overflow-y-auto scrollbar-styled">
                                        {homeFiles.map(file => (
                                            <div key={file.name} className="flex items-center justify-between p-2 rounded-md bg-gray-900/50 animate-in fade-in">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {file.type.startsWith('image/') ? <FiImage className="w-4 h-4 text-green-400 flex-shrink-0" /> : <FiFileText className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                                    <span className="text-sm text-gray-300 truncate" title={file.name}>{file.name}</span>
                                                </div>
                                                <button type="button" onClick={() => setHomeFiles(prev => prev.filter(f => f.name !== file.name))} className="p-1 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-400">
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

    const renderBuilder = () => (
        <div className="h-screen bg-black text-white flex flex-col font-sans">
            <header className="h-14 border-b border-gray-800 bg-[#050505] flex items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push('/')} title="Back to Home" className="text-gray-500 hover:text-white transition-colors">
                        <FiHome size={20} />
                    </button>
                    <div className="flex flex-col border-l border-gray-800 pl-6">
                        <span className="text-xs font-bold text-blue-500 tracking-widest uppercase">Phase {buildPhase.includes('backend') ? '1: Backend' : buildPhase.includes('frontend') ? '2: Frontend' : buildPhase.includes('admin') ? '3: Admin' : buildPhase === 'ready' ? '✓ Live' : '...'}</span>
                        <span className="text-sm text-gray-400 font-medium">{buildPhase.replace('-', ' ').toUpperCase()}...</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {buildPhase === 'ready' && !sandboxData && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                                handleDeployExisting();
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white gap-2 font-black uppercase tracking-widest px-6"
                        >
                            <FiRefreshCw size={14} className="animate-spin-slow" /> Deploy Now
                        </Button>
                    )}
                    {buildPhase === 'ready' && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHistory(true)}
                                className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
                            >
                                <FiClock size={16} /> <span className="text-xs font-bold uppercase tracking-widest">History</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownloadProject}
                                className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
                            >
                                <FiDownload size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Download</span>
                            </Button>
                        </>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full">
                        <div className={`w-2 h-2 rounded-full ${sandboxData?.backend ? 'bg-green-500' : 'bg-gray-700 animate-pulse'}`} />
                        <span className="text-[10px] uppercase font-bold text-gray-400">Backend</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full">
                        <div className={`w-2 h-2 rounded-full ${sandboxData?.frontend ? 'bg-blue-500' : 'bg-gray-700'}`} />
                        <span className="text-[10px] uppercase font-bold text-gray-400">Frontend</span>
                    </div>
                    {includeAdmin && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full">
                            <div className={`w-2 h-2 rounded-full ${sandboxData?.admin ? 'bg-purple-500' : 'bg-gray-700'}`} />
                            <span className="text-[10px] uppercase font-bold text-gray-400">Admin</span>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Phased Progress */}
                <div className="w-80 border-r border-gray-800 bg-[#080808] flex flex-col">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/20">
                        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Live Deployment Log</h2>
                        <div className="space-y-3">
                            {[
                                { id: 'backend-sandbox', label: 'Backend Environment' },
                                { id: 'backend-gen', label: 'API Architecture' },
                                { id: 'backend-verify', label: 'Health Verification' },
                                { id: 'frontend-sandbox', label: 'Frontend environment' },
                                { id: 'frontend-gen', label: 'UI implementation' },
                                ...(includeAdmin ? [
                                    { id: 'admin-sandbox', label: 'Admin Environment' },
                                    { id: 'admin-gen', label: 'Admin CMS Dashboard' },
                                ] : []),
                                { id: 'ready', label: 'Production Ready' }
                            ].map((step, idx) => {
                                const isDone = chatMessages.some(m => m.content.includes(step.label) || buildPhase === 'ready');
                                const isActive = buildPhase.includes(step.id.split('-')[0]);
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${isDone ? 'bg-blue-500 border-blue-500 text-white' : isActive ? 'border-blue-500 text-blue-500 animate-pulse' : 'border-gray-800 text-gray-700'}`}>
                                            {isDone ? '✓' : idx + 1}
                                        </div>
                                        <span className={`text-xs font-medium ${isDone ? 'text-gray-300' : isActive ? 'text-blue-400' : 'text-gray-600'}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 scrollbar-styled" ref={chatMessagesRef}>
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`mb-4 flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.type === 'system' ? 'text-gray-500 italic' :
                                    msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-300'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-black border-t border-gray-800">
                        <div className="relative">
                            <Textarea
                                value={aiChatInput}
                                onChange={(e) => setAiChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                                placeholder="Refine your stack..."
                                className="bg-gray-900 border-gray-800 text-xs min-h-[40px] rounded-lg pr-12 focus-visible:ring-1 focus-visible:ring-blue-500"
                            />
                            <Button onClick={handleChatSubmit} size="icon" className="absolute right-1 bottom-1 h-8 w-8 bg-blue-600 hover:bg-blue-500 rounded-md">
                                <FiPaperclip className="rotate-45" size={14} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Center: File System & Code */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-56 border-r border-gray-800 bg-[#050505] flex flex-col">
                        <div className="h-10 border-b border-gray-800 flex items-center px-4 gap-2">
                            <SiReact className="text-blue-400" size={14} />
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Workspace</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 scrollbar-styled">
                            {(['frontend', 'backend', ...(includeAdmin ? ['admin'] : [])] as string[]).map(layer => (
                                <div key={layer} className="mb-4">
                                    <div onClick={() => toggleFolder(layer)} className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-white/5 rounded transition-colors">
                                        {expandedFolders.has(layer) ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                                        <BsFolderFill size={14} className={layer === 'frontend' ? 'text-blue-500' : layer === 'admin' ? 'text-purple-500' : 'text-green-500'} />
                                        <span className="text-xs font-bold text-gray-400 capitalize">{layer}</span>
                                    </div>
                                    {expandedFolders.has(layer) && (
                                        <div className="ml-4 mt-1 border-l border-gray-800 pl-1">
                                            {generationProgress.files.filter(f => f.layer === layer).map(file => (
                                                <div
                                                    key={file.path}
                                                    onClick={() => setSelectedFile(file.path)}
                                                    className={`flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-all ${selectedFile === file.path ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-gray-500 hover:text-gray-300'}`}
                                                >
                                                    {getFileIcon(file.path)}
                                                    <span className="text-[11px] font-medium truncate">{file.path.split('/').pop()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-black flex flex-col overflow-hidden">
                        <div className="h-10 border-b border-gray-800 bg-[#080808] flex items-center px-4 justify-between">
                            <span className="text-[10px] font-mono text-gray-500">{selectedFile || 'select_file.bin'}</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-gray-800" />
                                <div className="w-2 h-2 rounded-full bg-gray-800" />
                                <div className="w-2 h-2 rounded-full bg-gray-800" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto scrollbar-styled">
                            {selectedFile ? (
                                <SyntaxHighlighter
                                    language="javascript"
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, padding: '20px', background: 'transparent', fontSize: '12px', lineHeight: '1.6' }}
                                >
                                    {generationProgress.files.find(f => f.path === selectedFile)?.content || ''}
                                </SyntaxHighlighter>
                            ) : (
                                <div className="h-full flex items-center justify-center flex-col text-gray-700 opacity-50">
                                    <div className="w-12 h-12 border-2 border-gray-800 rounded-xl mb-4 flex items-center justify-center">
                                        <FiFile size={24} />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest">Source Code View</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Runtime & Preview */}
                <div className="w-[620px] border-l border-gray-800 bg-[#050505] flex flex-col">
                    <div className="h-10 border-b border-gray-800 flex items-center px-2 gap-1">
                        {/* Core tabs */}
                        {(['preview', 'frontend', 'backend', 'database'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`h-7 px-3 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                {tab}
                            </button>
                        ))}
                        {/* Admin tabs - only show when admin sandbox exists */}
                        {sandboxData?.admin && (
                            <>
                                <div className="w-px h-5 bg-gray-800 mx-1" />
                                {(['admin-preview', 'admin-terminal'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`h-7 px-3 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {tab === 'admin-preview' ? 'Admin' : 'A-Term'}
                                    </button>
                                ))}
                            </>
                        )}
                        {/* Spacer */}
                        <div className="flex-1 flex items-center justify-center">
                            {buildPhase === 'ready' && generationProgress.files.length > 0 && (
                                <>
                                    {!sandboxData ? (
                                        <button
                                            onClick={handleDeployExisting}
                                            disabled={loading}
                                            className="h-6 px-4 bg-green-600 hover:bg-green-500 text-white border border-green-700 rounded-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-green-900/20"
                                        >
                                            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={11} />
                                            Deploy Now
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleAutoFixAll}
                                            disabled={loading}
                                            title="Check console errors and auto-resolve them"
                                            className="h-6 px-3 bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-800/40 rounded flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                                        >
                                            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={11} />
                                            Auto-Fix Console Errors
                                        </button>
                                    )}
                                    {sandboxData && (
                                        <button
                                            onClick={handleFullScreen}
                                            title="Open App in New Tab"
                                            className="h-6 px-3 bg-blue-900/30 text-blue-400 border border-blue-900/50 hover:bg-blue-800/40 rounded flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-all ml-1"
                                        >
                                            <FiMaximize size={11} />
                                            Open External
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                        {/* Preview controls - always visible when on any preview tab */}
                        {activeTab === 'preview' && buildPhase === 'ready' && (
                            <div className="flex items-center gap-1 border-l border-gray-800 pl-2">
                                <button onClick={handleRefreshPreview} title="Refresh Frontend" className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-white transition-colors">
                                    <FiRefreshCw size={13} />
                                </button>
                            </div>
                        )}
                        {activeTab === 'admin-preview' && buildPhase === 'ready' && (
                            <div className="flex items-center gap-1 border-l border-gray-800 pl-2">
                                <button onClick={handleRefreshPreview} title="Refresh Admin" className="p-1.5 hover:bg-purple-500/10 rounded-md text-purple-400 hover:text-purple-300 transition-colors">
                                    <FiRefreshCw size={13} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {activeTab === 'preview' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-white">
                                    {buildPhase === 'ready' ? (
                                        <iframe ref={iframeRef} src={sandboxData?.frontend?.url} className="w-full h-full border-none" />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-black">
                                            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Awaiting Live Build</h3>
                                            <p className="text-xs text-gray-600 mt-2 max-w-[240px]">The preview will initialize once the frontend Vite server confirms deployment.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {(activeTab === 'frontend' || activeTab === 'backend' || activeTab === 'admin-terminal') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-black font-mono p-4 overflow-y-auto text-[11px] leading-relaxed scrollbar-styled text-green-500">
                                    <pre className="whitespace-pre-wrap">{activeTab === 'frontend' ? frontendTerminal : activeTab === 'admin-terminal' ? adminTerminal : backendTerminal}</pre>
                                    <div className="animate-pulse">_</div>
                                </motion.div>
                            )}

                            {activeTab === 'admin-preview' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-white">
                                    {buildPhase === 'ready' && sandboxData?.admin?.url ? (
                                        <iframe ref={adminIframeRef} src={sandboxData.admin.url} className="w-full h-full border-none" />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50">
                                            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6" />
                                            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Building Admin Dashboard</h3>
                                            <p className="text-xs text-gray-400 mt-2 max-w-[240px]">The admin CMS panel will appear once deployment is complete.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'database' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-[#050505] flex flex-col">
                                    <div className="p-6 border-b border-gray-800 bg-gray-900/10">
                                        <div className="flex items-center gap-2 mb-6 text-green-500">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">MongoDB Instance Active</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-4 bg-black border border-gray-800 rounded-xl space-y-1">
                                                <span className="text-[10px] uppercase font-black text-gray-600 block">Connection URI</span>
                                                <code className="text-xs text-blue-400 font-mono break-all selection:bg-blue-500/30">
                                                    {sandboxData?.database?.connectionString || 'Checking for connection string...'}
                                                </code>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1 p-4 bg-black border border-gray-800 rounded-xl space-y-1">
                                                    <span className="text-[10px] uppercase font-black text-gray-600 block">Database Name</span>
                                                    <span className="text-xs text-gray-300 font-bold">{sandboxData?.database?.name || 'myth_proj'}</span>
                                                </div>
                                                <div className="flex-1 p-4 bg-black border border-gray-800 rounded-xl space-y-1">
                                                    <span className="text-[10px] uppercase font-black text-gray-600 block">Driver</span>
                                                    <span className="text-xs text-gray-300 font-bold">Mongoose (NodeJS)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="px-6 py-3 border-b border-gray-800 bg-black flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Live Activity Log</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                <span className="text-[9px] text-gray-500 uppercase font-bold">Streaming API Hooks</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-black font-mono p-6 overflow-y-auto text-[11px] leading-relaxed scrollbar-styled text-blue-300/80">
                                            <pre className="whitespace-pre-wrap">
                                                {backendTerminal.split('\n').filter(line =>
                                                    line.includes('[') ||
                                                    line.includes('Body:') ||
                                                    line.includes('MongoDB connected') ||
                                                    line.toLowerCase().includes('database') ||
                                                    line.toLowerCase().includes('mongo')
                                                ).join('\n')}
                                            </pre>
                                            <div className="animate-pulse text-blue-500">_</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Version History Drawer */}
            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistory(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-gray-800 z-[70] flex flex-col shadow-2xl"
                        >
                            <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-black">
                                <span className="text-xs font-black uppercase tracking-widest text-blue-500">Project History</span>
                                <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <FiX size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-styled">
                                {projectVersions.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                                        <FiClock size={32} className="mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No checkpoints found</p>
                                    </div>
                                ) : (
                                    projectVersions.map((version) => (
                                        <div
                                            key={version.id}
                                            className="group p-4 bg-gray-900/40 border border-gray-800 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer"
                                            onClick={() => {
                                                setGenerationProgress(prev => ({ ...prev, files: version.files }));
                                                if (version.sandboxData) setSandboxData(version.sandboxData);
                                                setShowHistory(false);
                                                addChatMessage(`Restored checkpoint: ${version.description}`, 'system');
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">ID: {version.id}</span>
                                                <span className="text-[9px] text-gray-500 font-mono">{version.timestamp.toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-xs font-medium text-gray-300 leading-relaxed mb-3 group-hover:text-blue-400 transition-colors">
                                                {version.description}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-[9px] text-gray-500 font-bold uppercase">
                                                    {version.files.length} Files
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-800 bg-black">
                                <p className="text-[10px] text-gray-600 font-medium text-center uppercase tracking-widest leading-relaxed">
                                    Checkpoints are stored locally in your current session.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <main className="min-h-screen bg-black overflow-hidden relative">
            {showHomeScreen ? renderHomeScreen() : renderBuilder()}
        </main>
    );
}

import { Suspense as ReactSuspense } from 'react';

export default function FullstackAIPage() {
    return (
        <ReactSuspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <FullstackAIContent />
        </ReactSuspense>
    );
}

