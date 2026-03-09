'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
    FiFile,
    FiChevronRight,
    FiChevronDown,
    FiX,
    FiUploadCloud,
    FiPaperclip,
    FiHome,
    FiMaximize,
    FiRefreshCw,
    FiDownload,
    FiClock,
    FiImage,
    FiFileText,
    FiTerminal,
    FiActivity,
    FiCode,
    FiExternalLink,
    BsFolderFill,
    BsFolder2Open
} from '@/lib/icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { parseDataSample, formatDataForAI } from '@/lib/data-parser';

// Types
interface DashboardPlan {
    cleaningSteps: string[];
    metrics: Array<{ label: string; logic: string }>;
    charts: Array<{ type: string; title: string; x: string; y: string }>;
    filters: string[];
    layout: string;
    reasoning: string;
}

interface ChatMessage {
    content: string;
    type: 'user' | 'ai' | 'system' | 'error';
    timestamp: Date;
}

interface GeneratedFile {
    path: string;
    content: string;
}

const styleOptions = ["Minimal", "Executive", "Analytical", "Dark", "Corporate", "Vibrant"];

const FiMic = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);

export default function DataToDashboardPage() {
    const router = useRouter();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Core state
    const [loading, setLoading] = useState(false);
    const [showHomeScreen, setShowHomeScreen] = useState(true);
    const [homeScreenFading, setHomeScreenFading] = useState(false);
    
    // Setup state
    const [promptInput, setPromptInput] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [aiModel, setAiModel] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const modelParam = params.get('model');
            if (modelParam && appConfig.ai.availableModels.includes(modelParam)) {
                return modelParam;
            }
        }
        return appConfig.ai.defaultModel;
    });
    
    // Builder state
    const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'terminal'>('code');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [aiChatInput, setAiChatInput] = useState('');
    const [buildPhase, setBuildPhase] = useState<string>('idle');
    const [sandboxId, setSandboxId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [terminalOutput, setTerminalOutput] = useState<string>('');
    const [dashboardPlan, setDashboardPlan] = useState<DashboardPlan | null>(null);
    const [workspaceFiles, setWorkspaceFiles] = useState<GeneratedFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>('app.py');
    const [showWorkspace, setShowWorkspace] = useState(true);

    // Phases definition for UI tracking
    const buildSteps = [
        { id: 'parsing', label: 'Analyzing Dataset' },
        { id: 'planning', label: 'AI Strategy Planning' },
        { id: 'sandbox', label: 'Environment Prep' },
        { id: 'installing', label: 'Dependencies' },
        { id: 'generating', label: 'Code Synthesis' },
        { id: 'running', label: 'Live Deployment' }
    ];

    const isListeningHome = false;
    const toggleListeningHome = () => {};

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const addChatMessage = (content: string, type: ChatMessage['type']) => {
        setChatMessages(prev => [...prev, { content, type, timestamp: new Date() }]);
    };

    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setUploadedFile(file);
            // Don't add to workspaceFiles yet, it's a binary/raw file
        }
    }, []);

    const handleGenerate = async () => {
        if (!uploadedFile || !promptInput || !selectedStyle) return;

        setLoading(true);
        setHomeScreenFading(true);
        setTimeout(() => setShowHomeScreen(false), 500);
        
        try {
            // STEP 1: PARSING
            setBuildPhase('parsing');
            addChatMessage('📊 Analyzing dataset headers and sampling data...', 'system');
            const dataContext = await parseDataSample(uploadedFile);
            
            // STEP 2: PLANNING
            setBuildPhase('planning');
            addChatMessage('🧠 Strategizing dashboard architecture...', 'system');
            const planRes = await fetch('/api/datadashboard/plan', {
                method: 'POST',
                body: JSON.stringify({
                    headers: dataContext.headers,
                    sampleData: dataContext.sampleData,
                    goal: promptInput,
                    style: selectedStyle,
                    model: aiModel
                })
            });
            const planData = await planRes.json();
            if (!planData.success) throw new Error(planData.error);
            setDashboardPlan(planData.plan);
            addChatMessage('✅ Logic plan finalized: ' + planData.plan.reasoning, 'system');

            // STEP 3: SANDBOX (PRE-EMPTIVE)
            setBuildPhase('sandbox');
            addChatMessage('🏗️ Provisioning E2B Python Sandbox...', 'system');
            const sandRes = await fetch('/api/datadashboard/create-sandbox', { method: 'POST' });
            const sandData = await sandRes.json();
            if (!sandData.success) throw new Error(sandData.error);
            setSandboxId(sandData.sandboxId);
            setPreviewUrl(sandData.url);

            // STEP 4: APPLY DATA FILE & INITIAL TOOLS
            setBuildPhase('installing');
            addChatMessage('📦 Preparing environment and uploading data...', 'system');
            await fetch('/api/datadashboard/write-files', {
                method: 'POST',
                body: JSON.stringify({
                    sandboxId: sandData.sandboxId,
                    files: [
                        { path: uploadedFile.name, content: await uploadedFile.text() }
                    ]
                })
            });

            // STEP 5: INSTALL DEPENDENCIES
            setActiveTab('terminal');
            addChatMessage('⚙️ Installing Python dependencies (streamlit, pandas, plotly)...', 'system');
            const installRes = await fetch('/api/datadashboard/execute', {
                method: 'POST',
                body: JSON.stringify({
                    sandboxId: sandData.sandboxId,
                    command: 'pip install streamlit pandas plotly openpyxl',
                    cwd: '/home/user'
                })
            });

            if (!installRes.body) throw new Error('Installation failed');
            const installReader = installRes.body.getReader();
            const installDecoder = new TextDecoder();

            while (true) {
                const { done, value } = await installReader.read();
                if (done) break;
                const chunk = installDecoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'stdout' || data.type === 'stderr') {
                                setTerminalOutput(prev => prev + data.content);
                            }
                        } catch (e) {
                            console.warn('Skipping malformed SSE line:', line);
                        }
                    }
                }
            }
            addChatMessage('✅ Dependencies installed.', 'system');

            // STEP 6: CODE SYNTHESIS
            setBuildPhase('generating');
            setActiveTab('code');
            addChatMessage('💻 Synthesizing dashboard logic and visualizations...', 'system');
            const genRes = await fetch('/api/datadashboard/generate', {
                method: 'POST',
                body: JSON.stringify({
                    plan: planData.plan,
                    goal: promptInput,
                    style: selectedStyle,
                    fileName: uploadedFile.name,
                    model: aiModel
                })
            });

            if (!genRes.body) throw new Error('Generation failed');
            const reader = genRes.body.getReader();
            const decoder = new TextDecoder();
            let fullCode = '';

            let finalGeneratedFiles: GeneratedFile[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                fullCode += chunk;
                
                // Robust regex for streaming files: Greedy-but-stops-at-closing-tag
                const fileRegex = /<file path="([^"]+)">((?:(?!<\/file>)[\s\S])*)/g;
                let match;
                const files: GeneratedFile[] = [];
                while ((match = fileRegex.exec(fullCode)) !== null) {
                    files.push({ path: match[1], content: match[2].trim() });
                }
                
                if (files.length > 0) {
                    finalGeneratedFiles = files; // Update local tracker
                    setWorkspaceFiles(files);
                    const currentFileObj = files.find(f => f.path === selectedFile) || files[0];
                    setGeneratedCode(currentFileObj.content);
                }
            }

            // STEP 7: WRITE GENERATED CODE
            setBuildPhase('running');
            addChatMessage('🚀 Deploying source code to sandbox...', 'system');
            
            if (finalGeneratedFiles.length === 0) {
                throw new Error("No code was generated. Please try again.");
            }

            await fetch('/api/datadashboard/write-files', {
                method: 'POST',
                body: JSON.stringify({
                    sandboxId: sandData.sandboxId,
                    files: finalGeneratedFiles.map(f => ({ path: f.path, content: f.content }))
                })
            });

            // STEP 8: START STREAMLIT SERVER
            setActiveTab('terminal');
            addChatMessage('⚡ Starting Streamlit server...', 'system');
            const deployRes = await fetch('/api/datadashboard/execute', {
                method: 'POST',
                body: JSON.stringify({
                    sandboxId: sandData.sandboxId,
                    command: 'streamlit run app.py --server.port 8501 --server.address 0.0.0.0 --server.headless true',
                    cwd: '/home/user',
                    isBackground: true
                })
            });

            if (!deployRes.body) throw new Error('Deployment failed');
            const deployReader = deployRes.body.getReader();
            const deployDecoder = new TextDecoder();

            while (true) {
                const { done, value } = await deployReader.read();
                if (done) break;
                const chunk = deployDecoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'stdout' || data.type === 'stderr') {
                            setTerminalOutput(prev => prev + data.content);
                            if (data.content.includes('Network URL: http://0.0.0.0:8501') || data.content.includes('You can now view your Streamlit app')) {
                                // Add a safety delay for port binding
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                setBuildPhase('ready');
                                setActiveTab('preview');
                                addChatMessage('✨ Dashboard is LIVE!', 'system');
                            }
                        }
                        if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    }
                }
            }

        } catch (error: any) {
            console.error('Build Error:', error);
            addChatMessage(`❌ Fatal Error: ${error.message}`, 'error');
            setBuildPhase('error');
        } finally {
            setLoading(false);
        }
    };

    const renderHomeScreen = () => (
        <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${homeScreenFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/20 via-blue-400/10 to-transparent rounded-full blur-[80px] animate-[sunPulse_5s_ease-in-out_infinite]" />
                <div className="absolute bottom-0 left-1/2 w-[800px] h-[800px] animate-[orbShrink_3s_ease-out_forwards]" style={{ transform: 'translateX(-50%) translateY(45%)' }}>
                    <div className="relative w-full h-full">
                        <div className="absolute inset-0 bg-blue-700/20 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                        <div className="absolute inset-32 bg-blue-500/30 rounded-full blur-[60px] opacity-50 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>
                </div>
            </div>

            <Button 
                variant="ghost" 
                onClick={() => router.push("/")} 
                size="icon" 
                title="Go to Landing Page" 
                className="absolute top-8 left-8 z-30 h-10 w-10 text-gray-300 bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-full transition-all hover:text-white hover:bg-gray-800/50 shadow-[0_0_15px_1px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_2px_rgba(59,130,246,0.5)] duration-200"
            >
                <FiHome className="h-5 w-5" />
            </Button>

            <div className="relative z-10 h-full flex items-center justify-center px-4 overflow-y-auto">
                <div className="text-center max-w-5xl w-full mx-auto pb-8">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pt-12">
                        <h1 className="text-5xl lg:text-6xl text-white font-bold tracking-tight animate-[fadeIn_0.8s_ease-out]">
                            DATA <span className="text-blue-500">INSIGHT</span>
                        </h1>
                        <p className="text-base lg:text-lg max-w-lg mx-auto mt-3 text-white/80">Transform raw datasets into high-end executive dashboards.</p>
                    </motion.div>

                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="mt-8 w-full mx-auto space-y-4 text-left">
                        {/* 1. Full Width Prompt Input */}
                        <div className="relative group">
                             <Textarea 
                                value={promptInput} 
                                onChange={(e) => setPromptInput(e.target.value)}
                                placeholder="Describe your dashboard vision... e.g., Analyze sales performance and forecast next month"
                                className="w-full p-4 pr-12 rounded-xl border border-gray-800/50 bg-black/60 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-base transition-all duration-200 h-32 resize-none"
                            />
                            <motion.button 
                                type="button" 
                                onClick={toggleListeningHome} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors hover:bg-gray-800/50 duration-200"
                                animate={isListeningHome ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : { scale: 1, opacity: 1 }}
                                transition={isListeningHome ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                            >
                                <FiMic className={`w-5 h-5 ${isListeningHome ? 'text-blue-400' : 'text-gray-400'}`} />
                            </motion.button>
                            <div className="absolute right-4 bottom-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest pointer-events-none">
                                {promptInput.length} chars
                            </div>
                        </div>

                        {/* 2. Split Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                            
                            {/* Left Panel: Styles & Actions */}
                            <div className="space-y-4 flex flex-col justify-between">
                                <div className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
                                    <p className="text-sm text-white mb-3 font-medium text-center opacity-80 uppercase tracking-widest">Choose a visual style</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {styleOptions.map(style => (
                                            <button 
                                                key={style} 
                                                type="button"
                                                onClick={() => setSelectedStyle(style)}
                                                className={`p-2.5 rounded-lg border text-sm font-bold transition-all duration-200 ${selectedStyle === style ? 'border-blue-500 bg-blue-500/20 text-white shadow-md' : 'border-gray-800/50 bg-black/40 hover:border-gray-700 text-gray-300'}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-4">
                                     <select 
                                        value={aiModel} 
                                        onChange={(e) => setAiModel(e.target.value)}
                                        className="h-12 px-4 text-sm bg-black/40 backdrop-blur-md border border-gray-800/60 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 outline-none"
                                    >
                                        {appConfig.ai.availableModels.map(m => <option key={m} value={m} className="bg-gray-900">{appConfig.ai.modelDisplayNames[m] || m}</option>)}
                                    </select>
                                    
                                    <Button 
                                        type="submit" 
                                        disabled={!uploadedFile || !promptInput || !selectedStyle || loading}
                                        className="h-12 flex-grow px-6 rounded-xl text-base font-bold text-white bg-white/10 backdrop-blur-md border border-blue-500/40 shadow-lg hover:bg-white/20 hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? "INITIALIZING..." : <>📊 <span>Generate Dashboard</span></>}
                                    </Button>
                                </div>
                            </div>

                            {/* Right Panel: File Dropzone */}
                            <div className="flex flex-col space-y-2 h-full">
                                <div 
                                    onDragEnter={() => setIsDragging(true)}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleFileDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative flex-grow w-full p-6 rounded-xl border-2 border-dashed bg-black/50 backdrop-blur-sm cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] ${isDragging ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' : 'border-gray-800/50 bg-black/40 hover:bg-white/5'}`}
                                >
                                    <input ref={fileInputRef} type="file" hidden onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])} accept=".csv,.xlsx,.xls" />
                                    <div className={`p-4 rounded-full bg-gray-900/50 mb-4 ${isDragging ? 'animate-bounce' : ''}`}>
                                        <FiUploadCloud className={`w-8 h-8 ${uploadedFile ? 'text-green-500' : 'text-purple-400'}`} />
                                    </div>
                                    
                                    {uploadedFile ? (
                                        <div className="text-center space-y-1">
                                            <p className="text-white font-bold text-lg truncate max-w-[200px]">{uploadedFile.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                                            <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mt-2 animate-pulse">Parsed</p>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-1">
                                            <p className="text-gray-300 font-bold">Drop CSV / Excel here</p>
                                            <p className="text-gray-500 text-xs">or click to browse</p>
                                            <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-tighter">Maximum resolution results</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    const handleExport = async () => {
        if (workspaceFiles.length === 0) return;
        const zip = new JSZip();
        workspaceFiles.forEach(file => {
            zip.file(file.path, file.content);
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "dashboard_project.zip");
    };

    const renderBuilder = () => (
        <div className="h-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
            {/* Header matched with PromptAI */}
            <header className="h-14 border-b border-gray-900 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push("/")} className="text-gray-500 hover:text-white transition-colors">
                        <FiHome size={20} />
                    </button>
                    <div className="h-4 w-px bg-gray-900" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">AI Builder</span>
                        <span className="text-xs font-bold text-gray-400 mt-1">{buildPhase === 'idle' ? 'Ready' : buildPhase.toUpperCase()}...</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Dynamic Sandbox Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${
                        sandboxId ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-gray-900/50 border-gray-800 text-gray-500'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                             sandboxId ? 'bg-green-500' : 
                             buildPhase === 'sandbox' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-700'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {sandboxId ? 'Sandbox Active' : buildPhase === 'sandbox' ? 'Provisioning...' : 'Sandbox Offline'}
                        </span>
                    </div>

                    {/* Open in New Tab */}
                     {previewUrl && (
                        <a 
                            href={previewUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            <FiExternalLink size={14} /> Open
                        </a>
                    )}

                    <Button variant="ghost" size="sm" onClick={handleExport} disabled={workspaceFiles.length === 0} className="text-gray-400 hover:text-white gap-2">
                        <FiDownload size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* 1. Pipeline Sidebar (Swapped) */}
                <div className="w-72 border-r border-gray-900 flex flex-col bg-black">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Build Pipeline</h2>
                            <button onClick={() => setShowWorkspace(!showWorkspace)} className="text-gray-600 hover:text-white">
                                <FiMaximize size={12} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {buildSteps.map((step, idx) => {
                                const isDone = buildSteps.findIndex(s => s.id === buildPhase) > idx || buildPhase === 'ready';
                                const isActive = buildPhase === step.id;
                                return (
                                    <div key={step.id} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black transition-all ${isDone ? 'bg-green-500 text-black' : isActive ? 'bg-purple-600 text-white animate-pulse' : 'bg-gray-900 text-gray-700'}`}>
                                            {isDone ? '✓' : idx + 1}
                                        </div>
                                        <span className={`text-[10px] font-bold tracking-wide transition-colors ${isDone ? 'text-gray-300' : isActive ? 'text-purple-400' : 'text-gray-700'}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-styled border-t border-gray-900" ref={chatMessagesRef}>
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[95%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                                    msg.type === 'system' ? 'text-gray-500 border-l-2 border-gray-800 bg-gray-900/10' :
                                    msg.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                    msg.type === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-300 border border-gray-800'
                                }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[8px] text-gray-700 mt-1 uppercase font-bold tracking-tighter opacity-50">{msg.timestamp.toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-[#080808] border-t border-gray-900">
                        <div className="relative group">
                            <Textarea 
                                value={aiChatInput}
                                onChange={(e) => setAiChatInput(e.target.value)}
                                placeholder="Refine analysis..."
                                className="bg-black border-gray-800 text-[11px] min-h-[40px] rounded-xl pr-10 focus:ring-blue-500"
                            />
                            <button className="absolute right-2 bottom-2 p-1.5 text-gray-600 hover:text-blue-500">
                                <FiPaperclip size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Workspace Sidebar (Swapped) */}
                {showWorkspace && (
                    <div className="w-56 border-r border-gray-900 bg-[#080808] flex flex-col">
                        <div className="p-4 border-b border-gray-900 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Workspace</span>
                            <FiChevronDown size={14} className="text-gray-600" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-styled">
                            {/* Static Data File */}
                            {uploadedFile && (
                                <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400">
                                    <FiFile size={14} />
                                    <span className="truncate">{uploadedFile.name}</span>
                                </div>
                            )}
                            {/* Generated Files */}
                            {workspaceFiles.map(file => (
                                <button
                                    key={file.path}
                                    onClick={() => {
                                        setSelectedFile(file.path);
                                        setGeneratedCode(file.content);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-colors ${selectedFile === file.path ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:bg-white/5'}`}
                                >
                                    <FiCode size={14} />
                                    <span className="truncate">{file.path}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Content Area: Unified Tabs (Code, Preview, Terminal) */}
                <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
                    <div className="h-10 flex border-b border-gray-900 px-2 bg-[#080808]">
                        {(['code', 'preview', 'terminal'] as const).map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {activeTab === 'code' && (
                                <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full bg-black flex flex-col">
                                    <div className="h-8 px-4 flex items-center justify-between border-b border-gray-900 bg-[#080808]">
                                        <div className="flex items-center gap-2">
                                            <FiCode size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{selectedFile}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto scrollbar-styled p-4">
                                        {generatedCode ? (
                                            <SyntaxHighlighter 
                                                language="python" 
                                                style={vscDarkPlus}
                                                customStyle={{ margin: 0, background: 'transparent', fontSize: '11px' }}
                                                showLineNumbers={true}
                                                lineNumberStyle={{ minWidth: '2em', paddingRight: '1em', color: '#6b7280' }}
                                            >
                                                {generatedCode}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <div className="h-full flex items-center justify-center flex-col opacity-20">
                                                <FiActivity size={32} className="mb-3" />
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em]">Code Genesis</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                            {activeTab === 'preview' && (
                                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full bg-[#050505] scrollbar-styled overflow-y-auto">
                                    {previewUrl && buildPhase === 'ready' ? (
                                        <iframe src={previewUrl} className="w-full h-full border-none" />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-2 border-blue-500/20 rounded-full" />
                                                <div className="absolute inset-0 w-16 h-16 border-t-2 border-blue-500 rounded-full animate-spin" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Initializing Dashboard</h3>
                                                <p className="text-[10px] text-gray-500 max-w-[240px] leading-relaxed mx-auto italic">
                                                    Deploying Python engine to E2B sandbox. This may take 30-60 seconds for first boot.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                            {activeTab === 'terminal' && (
                                <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full bg-[#050505] font-mono p-6 text-[11px] leading-relaxed overflow-y-auto selection:bg-purple-500/30 scrollbar-styled">
                                    <div className="flex items-center gap-2 mb-4 text-blue-500/50">
                                        <FiTerminal size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Sandbox Runtime</span>
                                    </div>
                                    <div className="text-gray-400 whitespace-pre-wrap">
                                        {terminalOutput || '> System idle\n> Awaiting instructions...'}
                                    </div>
                                    <div className="w-1 h-3 bg-blue-500/50 animate-pulse inline-block ml-1" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-black overflow-hidden relative">
            {showHomeScreen ? renderHomeScreen() : renderBuilder()}
        </main>
    );
}