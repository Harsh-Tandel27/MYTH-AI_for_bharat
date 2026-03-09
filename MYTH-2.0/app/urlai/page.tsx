'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MichiBot from "@/components/MichiBot";
// Import icons from centralized module to avoid Turbopack chunk issues
import {
  FiFile,
  FiChevronRight,
  FiChevronDown,
  BsFolderFill,
  BsFolder2Open,
  SiJavascript,
  SiReact,
  SiCss3,
  SiJson
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import CodeApplicationProgress, { type CodeApplicationState } from '@/components/CodeApplicationProgress';

interface SandboxData {
  sandboxId: string;
  url: string;
  [key: string]: any;
}

interface ChatMessage {
  content: string;
  type: 'user' | 'ai' | 'system' | 'file-update' | 'command' | 'error';
  timestamp: Date;
  metadata?: {
    scrapedUrl?: string;
    scrapedContent?: any;
    generatedCode?: string;
    appliedFiles?: string[];
    commandType?: 'input' | 'output' | 'error' | 'success';
  };
}

// Corrected Type Definition for Generated Files
interface GeneratedFile {
  path: string;
  content: string;
  type: string;
  completed: boolean;
  edited?: boolean; // Added optional 'edited' property to resolve TS errors
}

// --- START: ADDED FOR HISTORY FEATURE ---
interface WebsiteVersion {
  id: number;
  timestamp: Date;
  files: GeneratedFile[];
  prompt: string;
  type: 'clone' | 'edit';
}
// --- END: ADDED FOR HISTORY FEATURE ---


export default function AISandboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: 'Not connected', active: false });
  const [responseArea, setResponseArea] = useState<string[]>([]);
  const [structureContent, setStructureContent] = useState('No sandbox created yet');
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      content: 'Welcome! I can help you generate code with full context of your sandbox files and structure. Just start chatting - I\'ll automatically create a sandbox for you if needed!\n\nTip: If you see package errors like "react-router-dom not found", just type "npm install" or "check packages" to automatically install missing packages.',
      type: 'system',
      timestamp: new Date()
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiEnabled] = useState(true);
  const [aiModel, setAiModel] = useState(() => {
    const modelParam = searchParams.get('model');
    return appConfig.ai.availableModels.includes(modelParam || '') ? modelParam! : appConfig.ai.defaultModel;
  });
  const [urlOverlayVisible, setUrlOverlayVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlStatus, setUrlStatus] = useState<string[]>([]);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['app', 'src', 'src/components']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [homeScreenFading, setHomeScreenFading] = useState(false);
  const [homeUrlInput, setHomeUrlInput] = useState('');
  const [homeContextInput, setHomeContextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'generation' | 'preview'>('preview');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [showLoadingBackground, setShowLoadingBackground] = useState(false);
  const [urlScreenshot, setUrlScreenshot] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isPreparingDesign, setIsPreparingDesign] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [loadingStage, setLoadingStage] = useState<'gathering' | 'planning' | 'generating' | null>(null);
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [fileStructure, setFileStructure] = useState<string>('');

  // --- START: ADDED FOR HISTORY FEATURE ---
  const [websiteHistory, setWebsiteHistory] = useState<WebsiteVersion[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  // --- END: ADDED FOR HISTORY FEATURE ---

  // --- START: PROJECT PERSISTENCE & VERSION CONTROL ---
  const [projectId, setProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled Clone');
  const [projectVersions, setProjectVersions] = useState<Array<{ id: string; version: number; message: string; prompt: string; createdAt: Date }>>([]);
  const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedVersion, setLastSavedVersion] = useState<number>(0);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [isProjectsListOpen, setIsProjectsListOpen] = useState(false);
  const [projectLoadingMessage, setProjectLoadingMessage] = useState<string | null>(null);
  // --- END: PROJECT PERSISTENCE & VERSION CONTROL ---

  const [conversationContext, setConversationContext] = useState<{
    scrapedWebsites: Array<{ url: string; content: any; timestamp: Date }>;
    generatedComponents: Array<{ name: string; path: string; content: string }>;
    appliedCode: Array<{ files: string[]; timestamp: Date }>;
    currentProject: string;
    lastGeneratedCode?: string;
  }>({
    scrapedWebsites: [],
    generatedComponents: [],
    appliedCode: [],
    currentProject: '',
    lastGeneratedCode: undefined
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);

  const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({
    stage: null
  });

  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    status: string;
    components: Array<{ name: string; path: string; completed: boolean }>;
    currentComponent: number;
    streamedCode: string;
    isStreaming: boolean;
    isThinking: boolean;
    thinkingText?: string;
    thinkingDuration?: number;
    currentFile?: { path: string; content: string; type: string };
    files: GeneratedFile[]; // Using corrected type
    lastProcessedPosition: number;
    isEdit?: boolean;
  }>({
    isGenerating: false,
    status: '',
    components: [],
    currentComponent: 0,
    streamedCode: '',
    isStreaming: false,
    isThinking: false,
    files: [],
    lastProcessedPosition: 0
  });

  const botVariants = {
    entry: {
      top: '50%',
      left: '50%',
      x: '-50%',
      y: '-50%',
      scale: 0.9,
      opacity: 1,
    },
    home: {
      top: 'calc(50% - 150px)',
      left: '50%',
      x: '-50%',
      y: '-50%',
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        duration: 1.2
      }
    },
    homeWithSelector: {
      top: 'calc(50% - 320px)',
      left: '50%',
      x: '-50%',
      y: '-50%',
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        duration: 0.8
      }
    },
    app: {
      top: 'auto',
      left: '20px',
      bottom: '20px',
      x: '0%',
      y: '0%',
      scale: 0.5,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        duration: 1.2,
        delay: 0.2
      }
    },
  } as const;



  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      // Clear old conversation
      try {
        await fetch('/api/conversation-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear-old' })
        });
        console.log('[home] Cleared old conversation data on mount');
      } catch (error) {
        console.error('[ai-sandbox] Failed to clear old conversation:', error);
        if (isMounted) {
          addChatMessage('Failed to clear old conversation data.', 'error');
        }
      }

      if (!isMounted) return;

      // Check if sandbox ID is in URL
      const sandboxIdParam = searchParams.get('sandbox');

      setLoading(true);
      try {
        if (sandboxIdParam) {
          console.log('[home] Attempting to restore sandbox:', sandboxIdParam);
          await createSandbox(true);
        } else {
          console.log('[home] No sandbox in URL, creating new sandbox automatically...');
          await createSandbox(true);
        }
      } catch (error) {
        console.error('[ai-sandbox] Failed to create or restore sandbox:', error);
        if (isMounted) {
          addChatMessage('Failed to create or restore sandbox.', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializePage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHomeScreen) {
        setHomeScreenFading(true);
        setTimeout(() => {
          setShowHomeScreen(false);
          setHomeScreenFading(false);
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHomeScreen]);

  useEffect(() => {
    if (!showHomeScreen && homeUrlInput && !urlScreenshot && !isCapturingScreenshot) {
      let screenshotUrl = homeUrlInput.trim();
      if (!screenshotUrl.match(/^https?:\/\//i)) {
        screenshotUrl = 'https://' + screenshotUrl;
      }
      captureUrlScreenshot(screenshotUrl);
    }
  }, [showHomeScreen, homeUrlInput]);

  useEffect(() => {
    checkSandboxStatus();
    const handleFocus = () => {
      checkSandboxStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // --- START: ADDED FOR HISTORY FEATURE ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyPanelRef.current && !historyPanelRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // --- END: ADDED FOR HISTORY FEATURE ---

  // Fetch URL AI projects on mount
  useEffect(() => {
    fetchUrlProjects();
  }, []);

  // Auto-save session to localStorage
  useEffect(() => {
    if (projectId || sandboxData || Object.keys(sandboxFiles).length > 0) {
      const session = {
        projectId,
        projectName: currentProjectName,
        sandboxData,
        files: sandboxFiles,
        chatMessages: chatMessages.slice(-50), // limit to last 50 messages
        targetUrl,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('urlai-session', JSON.stringify(session));
    }
  }, [projectId, currentProjectName, sandboxData, sandboxFiles, chatMessages, targetUrl]);

  // Session recovery from localStorage
  useEffect(() => {
    const skip = localStorage.getItem('urlai-skip-recovery');
    if (skip) { localStorage.removeItem('urlai-skip-recovery'); return; }

    const saved = localStorage.getItem('urlai-session');
    if (!saved) return;

    try {
      const session = JSON.parse(saved);
      if (session.projectId) {
        setProjectId(session.projectId);
        setCurrentProjectName(session.projectName || 'Untitled Clone');
      }
      if (session.targetUrl) setTargetUrl(session.targetUrl);
      if (session.chatMessages?.length > 0) setChatMessages(session.chatMessages);
      if (session.sandboxData?.sandboxId) {
        // Check if sandbox is still alive
        fetch('/api/sandbox-status')
          .then(r => r.json())
          .then(data => {
            if (data.active && data.healthy) {
              setSandboxData(session.sandboxData);
              updateStatus('Sandbox active', true);
              setShowHomeScreen(false);
            }
          })
          .catch(() => { });
      }
    } catch (e) {
      localStorage.removeItem('urlai-session');
    }
  }, []);

  const updateStatus = (text: string, active: boolean) => {
    setStatus({ text, active });
  };

  const log = (message: string, type: 'info' | 'error' | 'command' = 'info') => {
    setResponseArea(prev => [...prev, `[${type}] ${message}`]);
  };

  // Save chat message to URL AI database
  const saveChatMessageToDb = async (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
    if (!projectId) return;
    const dbType = type === 'ai' ? 'assistant' : type;
    if (dbType !== 'user' && dbType !== 'assistant') return;
    try {
      await fetch(`/api/urlai-chat/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: dbType, metadata }),
      });
    } catch (error) {
      console.error('[urlai-chat] Failed to save message:', error);
    }
  };

  const addChatMessage = (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
    setChatMessages(prev => {
      if (type === 'system' && prev.length > 0) {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === 'system' && lastMessage.content === content) {
          return prev;
        }
      }
      return [...prev, { content, type, timestamp: new Date(), metadata }];
    });
    // Persist to DB asynchronously
    saveChatMessageToDb(content, type, metadata);
  };

  const checkAndInstallPackages = async () => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }
    addChatMessage('Sandbox is ready. Vite configuration is handled by the template.', 'system');
  };

  const handleSurfaceError = (errors: any[]) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  const installPackages = async (packages: string[]) => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }

    try {
      const response = await fetch('/api/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages })
      });

      if (!response.ok) {
        throw new Error(`Failed to install packages: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'command':
                  if (!data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                case 'output':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'error':
                  if (data.message && data.message !== 'undefined') {
                    addChatMessage(data.message, 'command', { commandType: 'error' });
                  }
                  break;
                case 'warning':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'success':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                case 'status':
                  addChatMessage(data.message, 'system');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      addChatMessage(`Failed to install packages: ${error.message}`, 'system');
    }
  };

  const checkSandboxStatus = async () => {
    try {
      const response = await fetch('/api/sandbox-status');
      const data = await response.json();

      if (data.active && data.healthy && data.sandboxData) {
        setSandboxData(data.sandboxData);
        updateStatus('Sandbox active', true);
      } else if (data.active && !data.healthy) {
        updateStatus('Sandbox not responding', false);
      } else {
        setSandboxData(null);
        updateStatus('No sandbox', false);
      }
    } catch (error) {
      console.error('Failed to check sandbox status:', error);
      setSandboxData(null);
      updateStatus('Error', false);
    }
  };

  const createSandbox = async (fromHomeScreen = false) => {
    console.log('[createSandbox] Starting sandbox creation...');
    setLoading(true);
    setShowLoadingBackground(true);
    updateStatus('Creating sandbox...', false);
    setResponseArea([]);
    setScreenshotError(null);

    try {
      const response = await fetch('/api/create-ai-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      console.log('[createSandbox] Response data:', data);

      if (data.success) {
        setSandboxData(data);
        updateStatus('Sandbox active', true);
        log('Sandbox created successfully!');
        log(`Sandbox ID: ${data.sandboxId}`);
        log(`URL: ${data.url}`);

        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('sandbox', data.sandboxId);
        newParams.set('model', aiModel);
        // CORRECTED ROUTE
        router.push(`/urlai?${newParams.toString()}`, { scroll: false });

        setTimeout(() => {
          setShowLoadingBackground(false);
        }, 3000);

        if (data.structure) {
          displayStructure(data.structure);
        }

        setTimeout(fetchSandboxFiles, 1000);

        setTimeout(async () => {
          try {
            console.log('[createSandbox] Ensuring Vite server is running...');
            const restartResponse = await fetch('/api/restart-vite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (restartResponse.ok) {
              const restartData = await restartResponse.json();
              if (restartData.success) {
                console.log('[createSandbox] Vite server started successfully');
              }
            }
          } catch (error) {
            console.error('[createSandbox] Error starting Vite server:', error);
          }
        }, 2000);

        if (!fromHomeScreen) {
          addChatMessage(`Sandbox created! ID: ${data.sandboxId}. I now have context of your sandbox and can help you build your app. Just ask me to create components and I'll automatically apply them!

Tip: I automatically detect and install npm packages from your code imports (like react-router-dom, axios, etc.)`, 'system');
        }

        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = data.url;
          }
        }, 100);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[createSandbox] Error:', error);
      updateStatus('Error', false);
      log(`Failed to create sandbox: ${error.message}`, 'error');
      addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
    } finally {
      setLoading(false);
    }
  };

  const displayStructure = (structure: any) => {
    if (typeof structure === 'object') {
      setStructureContent(JSON.stringify(structure, null, 2));
    } else {
      setStructureContent(structure || 'No structure available');
    }
  };

  const applyGeneratedCode = async (code: string, isEdit: boolean = false) => {
    setLoading(true);
    log('Applying AI-generated code...');

    try {
      setCodeApplicationState({ stage: 'analyzing' });

      const pendingPackages = ((window as any).pendingPackages || []).filter((pkg: any) => pkg && typeof pkg === 'string');
      if (pendingPackages.length > 0) {
        console.log('[applyGeneratedCode] Sending packages from tool calls:', pendingPackages);
        (window as any).pendingPackages = [];
      }

      const response = await fetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: code,
          isEdit: isEdit,
          packages: pendingPackages,
          sandboxId: sandboxData?.sandboxId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to apply code: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalData: any = null;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'start':
                  setCodeApplicationState({ stage: 'analyzing' });
                  break;
                case 'step':
                  if (data.message.includes('Installing') && data.packages) {
                    setCodeApplicationState({
                      stage: 'installing',
                      packages: data.packages
                    });
                  } else if (data.message.includes('Creating files') || data.message.includes('Applying')) {
                    setCodeApplicationState({
                      stage: 'applying'
                    });
                  }
                  break;
                case 'package-progress':
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      installedPackages: data.installedPackages
                    }));
                  }
                  break;
                case 'command':
                  if (data.command && !data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                case 'success':
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      installedPackages: data.installedPackages
                    }));
                  }
                  break;
                case 'file-progress':
                  break;
                case 'file-complete':
                  break;
                case 'command-progress':
                  addChatMessage(`${data.action} command: ${data.command}`, 'command', { commandType: 'input' });
                  break;
                case 'command-output':
                  addChatMessage(data.output, 'command', {
                    commandType: data.stream === 'stderr' ? 'error' : 'output'
                  });
                  break;
                case 'command-complete':
                  if (data.success) {
                    addChatMessage(`Command completed successfully`, 'system');
                  } else {
                    addChatMessage(`Command failed with exit code ${data.exitCode}`, 'system');
                  }
                  break;
                case 'complete':
                  finalData = data;
                  setCodeApplicationState({ stage: 'complete' });
                  setTimeout(() => {
                    setCodeApplicationState({ stage: null });
                  }, 3000);
                  break;
                case 'error':
                  addChatMessage(`Error: ${data.message || data.error || 'Unknown error'}`, 'system');
                  break;
                case 'warning':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                case 'info':
                  if (data.message) {
                    addChatMessage(data.message, 'system');
                  }
                  break;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      if (finalData && finalData.type === 'complete') {
        const data: {
          success: boolean;
          results: any;
          explanation: string;
          structure: any;
          message: string;
          autoCompleted?: boolean;
          autoCompletedComponents?: string[];
          warning?: string;
          missingImports?: string[];
          debug?: any;
        } = {
          success: true,
          results: finalData.results,
          explanation: finalData.explanation,
          structure: finalData.structure,
          message: finalData.message,
          autoCompleted: finalData.autoCompleted,
          autoCompletedComponents: finalData.autoCompletedComponents,
          warning: finalData.warning,
          missingImports: finalData.missingImports,
          debug: finalData.debug,
        };

        if (data.success) {
          const { results } = data;

          if (results.packagesInstalled?.length > 0) {
            log(`Packages installed: ${results.packagesInstalled.join(', ')}`);
          }

          if (results.filesCreated?.length > 0) {
            log('Files created:');
            results.filesCreated.forEach((file: string) => {
              log(`  ${file}`, 'command');
            });

            if (sandboxData?.sandboxId && results.filesCreated.length > 0) {
              setTimeout(() => {
                if (iframeRef.current) {
                  iframeRef.current.src = iframeRef.current.src;
                }
              }, 1000);
            }
          }

          if (results.filesUpdated?.length > 0) {
            log('Files updated:');
            results.filesUpdated.forEach((file: string) => {
              log(`  ${file}`, 'command');
            });
          }

          setConversationContext(prev => ({
            ...prev,
            appliedCode: [...prev.appliedCode, {
              files: [...(results.filesCreated || []), ...(results.filesUpdated || [])],
              timestamp: new Date()
            }]
          }));

          if (results.commandsExecuted?.length > 0) {
            log('Commands executed:');
            results.commandsExecuted.forEach((cmd: string) => {
              log(`  $ ${cmd}`, 'command');
            });
          }

          if (results.errors?.length > 0) {
            results.errors.forEach((err: string) => {
              log(err, 'error');
            });
          }

          if (data.structure) {
            displayStructure(data.structure);
          }

          if (data.explanation) {
            log(data.explanation);
          }

          if (data.autoCompleted) {
            log('Auto-generating missing components...', 'command');

            if (data.autoCompletedComponents) {
              setTimeout(() => {
                log('Auto-generated missing components:', 'info');
                (data.autoCompletedComponents || []).forEach((comp: string) => {
                  log(`  ${comp}`, 'command');
                });
              }, 1000);
            }
          } else if (data.warning) {
            log(data.warning, 'error');

            if (data.missingImports && data.missingImports.length > 0) {
              const missingList = data.missingImports.join(', ');
              addChatMessage(
                `Ask me to "create the missing components: ${missingList}" to fix these import errors.`,
                'system'
              );
            }
          }

          log('Code applied successfully!');
          console.log('[applyGeneratedCode] Response data:', data);
          console.log('[applyGeneratedCode] Debug info:', data.debug);
          console.log('[applyGeneratedCode] Current sandboxData:', sandboxData);
          console.log('[applyGeneratedCode] Current iframe element:', iframeRef.current);
          console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current?.src);

          if (results.filesCreated?.length > 0) {
            setConversationContext(prev => ({
              ...prev,
              appliedCode: [...prev.appliedCode, {
                files: results.filesCreated,
                timestamp: new Date()
              }]
            }));

            if (isEdit) {
              addChatMessage(`Edit applied successfully!`, 'system');
            } else {
              const recentMessages = chatMessages.slice(-5);
              const isPartOfGeneration = recentMessages.some(m =>
                m.content.includes('AI recreation generated') ||
                m.content.includes('Code generated')
              );

              if (isPartOfGeneration) {
                addChatMessage(`Applied ${results.filesCreated.length} files successfully!`, 'system');
              } else {
                addChatMessage(`Applied ${results.filesCreated.length} files successfully!`, 'system', {
                  appliedFiles: results.filesCreated
                });
              }
            }

            if (results.packagesFailed?.length > 0) {
              addChatMessage(`⚠️ Some packages failed to install. Check the error banner above for details.`, 'system');
            }

            await fetchSandboxFiles();

            // --- AUTO-SAVE PROJECT VERSION ---
            try {
              const currentFiles = Object.entries(sandboxFiles).map(([path, content]) => ({
                path,
                content,
                type: path.endsWith('.css') ? 'css' : path.endsWith('.jsx') || path.endsWith('.tsx') ? 'jsx' : 'js'
              }));

              // Also include the just-applied files
              const appliedFileEntries = (results.filesCreated || []).map((path: string) => ({
                path,
                content: '',
                type: path.endsWith('.css') ? 'css' : 'jsx'
              }));

              // Merge: use sandbox files as base, applied files fill gaps
              const allFilePaths = new Set([...currentFiles.map(f => f.path), ...appliedFileEntries.map((f: any) => f.path)]);
              const filesToSave = Array.from(allFilePaths).map(p => {
                const existing = currentFiles.find(f => f.path === p);
                return existing || appliedFileEntries.find((f: any) => f.path === p);
              }).filter(Boolean);

              if (filesToSave.length > 0) {
                await saveProjectVersion(
                  filesToSave,
                  results.packagesInstalled || [],
                  conversationContext.currentProject || targetUrl || 'Generated Project',
                  isEdit ? 'Edit applied' : 'Initial generation'
                );
              }
            } catch (saveError) {
              console.error('[auto-save] Failed to save project version:', saveError);
            }
            // --- END AUTO-SAVE ---

            await checkAndInstallPackages();

            console.log('[build-test] Skipping build test - would need API endpoint');

            const refreshDelay = appConfig.codeApplication.defaultRefreshDelay;

            setTimeout(() => {
              if (iframeRef.current && sandboxData?.url) {
                console.log('[home] Refreshing iframe after code application...');

                const urlWithTimestamp = `${sandboxData.url}?t=${Date.now()}&applied=true`;
                iframeRef.current.src = urlWithTimestamp;

                setTimeout(() => {
                  try {
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.location.reload();
                      console.log('[home] Force reloaded iframe content');
                    }
                  } catch (e) {
                    console.log('[home] Could not reload iframe (cross-origin):', e);
                  }
                }, 1000);
              }
            }, refreshDelay);
          }

          if (iframeRef.current && sandboxData?.url) {
            const packagesInstalled = results?.packagesInstalled?.length > 0 || data.results?.packagesInstalled?.length > 0;
            const refreshDelay = packagesInstalled ? appConfig.codeApplication.packageInstallRefreshDelay : appConfig.codeApplication.defaultRefreshDelay;
            console.log(`[applyGeneratedCode] Packages installed: ${packagesInstalled}, refresh delay: ${refreshDelay}ms`);

            setTimeout(async () => {
              if (iframeRef.current && sandboxData?.url) {
                console.log('[applyGeneratedCode] Starting iframe refresh sequence...');
                console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current.src);
                console.log('[applyGeneratedCode] Sandbox URL:', sandboxData.url);

                try {
                  const urlWithTimestamp = `${sandboxData.url}?t=${Date.now()}&force=true`;
                  console.log('[applyGeneratedCode] Attempting direct navigation to:', urlWithTimestamp);

                  iframeRef.current.onload = null;

                  iframeRef.current.src = urlWithTimestamp;

                  await new Promise(resolve => setTimeout(resolve, 2000));

                  try {
                    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                    if (iframeDoc && iframeDoc.readyState === 'complete') {
                      console.log('[applyGeneratedCode] Iframe loaded successfully');
                      return;
                    }
                  } catch (e) {
                    console.log('[applyGeneratedCode] Cannot access iframe content (CORS), assuming loaded');
                    return;
                  }
                } catch (e) {
                  console.error('[applyGeneratedCode] Direct navigation failed:', e);
                }

                console.log('[applyGeneratedCode] Falling back to iframe recreation...');
                const parent = iframeRef.current.parentElement;
                const newIframe = document.createElement('iframe');

                newIframe.className = iframeRef.current.className;
                newIframe.title = iframeRef.current.title;
                newIframe.allow = iframeRef.current.allow;

                const sandboxValue = iframeRef.current.getAttribute('sandbox');
                if (sandboxValue) {
                  newIframe.setAttribute('sandbox', sandboxValue);
                }

                iframeRef.current.remove();

                newIframe.src = `${sandboxData.url}?t=${Date.now()}&recreated=true`;
                parent?.appendChild(newIframe);

                (iframeRef as any).current = newIframe;

                console.log('[applyGeneratedCode] Iframe recreated with new content');
              } else {
                console.error('[applyGeneratedCode] No iframe or sandbox URL available for refresh');
              }
            }, refreshDelay);
          }

        } else {
          throw new Error(finalData?.error || 'Failed to apply code');
        }
      } else {
        addChatMessage('Code application may have partially succeeded. Check the preview.', 'system');
      }
    } catch (error: any) {
      log(`Failed to apply code: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setGenerationProgress(prev => ({
        ...prev,
        isEdit: false
      }));
    }
  };

  const fetchSandboxFiles = async () => {
    if (!sandboxData) return;

    try {
      const response = await fetch('/api/get-sandbox-files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSandboxFiles(data.files || {});
          setFileStructure(data.structure || '');
          console.log('[fetchSandboxFiles] Updated file list:', Object.keys(data.files || {}).length, 'files');
        }
      }
    } catch (error) {
      console.error('[fetchSandboxFiles] Error fetching files:', error);
    }
  };

  // --- PROJECT PERSISTENCE FUNCTIONS (ISOLATED URL AI) ---
  const saveProjectVersion = async (
    files: Array<{ path: string; content: string; type: string }>,
    packages: string[] = [],
    projectName: string = 'Generated Project',
    message: string = ''
  ) => {
    setIsSaving(true);
    try {
      if (!projectId) {
        const res = await fetch('/api/urlai-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            sourceUrl: targetUrl || '',
            sandboxId: sandboxData?.sandboxId || '',
            files,
          }),
        });
        const data = await res.json();
        if (data.success && data.project) {
          setProjectId(data.project.id);
          setCurrentProjectName(projectName);
          setLastSavedVersion(1);
          await fetch(`/api/urlai-projects/${data.project.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files, packages, prompt: targetUrl || projectName, message: message || 'Initial version' }),
          });
          addChatMessage(`💾 Project saved! (v1)`, 'system');
        }
      } else {
        const res = await fetch(`/api/urlai-projects/${projectId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files, packages, prompt: targetUrl || '', message: message || `Version ${lastSavedVersion + 1}` }),
        });
        const data = await res.json();
        if (data.success) {
          setLastSavedVersion(data.version.version);
          // Also update the project's files
          await fetch(`/api/urlai-projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files, currentVersion: data.version.version }),
          });
          addChatMessage(`💾 Saved version ${data.version.version}`, 'system');
        }
      }
    } catch (error) {
      console.error('[save] Failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchVersionHistory = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/urlai-projects/${projectId}/versions`);
      const data = await res.json();
      if (data.success) setProjectVersions(data.versions || []);
    } catch (error) {
      console.error('[versions] Failed:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!projectId || !sandboxData) return;
    try {
      addChatMessage('Restoring version...', 'system');
      const res = await fetch(`/api/urlai-projects/${projectId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.success && data.files) {
        const fileXml = data.files.map((f: any) => `<file path="${f.path}">${f.content}</file>`).join('\n');
        await applyGeneratedCode(fileXml, false);
        addChatMessage(`✅ Restored to version ${data.version}`, 'system');
      }
    } catch (error) {
      console.error('[restore] Failed:', error);
      addChatMessage('Failed to restore version', 'system');
    }
  };

  // Fetch user's URL AI projects
  const fetchUrlProjects = async () => {
    try {
      const res = await fetch('/api/urlai-projects');
      if (res.ok) {
        const data = await res.json();
        setUserProjects(data.projects || []);
      }
    } catch (error) {
      console.error('[urlai] Failed to fetch projects:', error);
    }
  };

  // Load a saved URL AI project
  const loadUrlProject = async (loadProjectId: string) => {
    try {
      localStorage.setItem('urlai-skip-recovery', 'true');
      localStorage.removeItem('urlai-session');
      setProjectLoadingMessage('Loading project...');
      console.log('[loadUrlProject] Starting load for:', loadProjectId);

      const res = await fetch(`/api/urlai-projects/${loadProjectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      const { project: projectData } = await res.json();

      if (!projectData?.files?.length) {
        addChatMessage('No files found for this project.', 'system');
        setProjectLoadingMessage(null);
        return;
      }

      console.log('[loadUrlProject] Got project:', projectData.name, 'with', projectData.files.length, 'files');

      setProjectId(loadProjectId);
      setCurrentProjectName(projectData.name || 'Untitled Clone');
      setTargetUrl(projectData.sourceUrl || '');
      setShowHomeScreen(false);
      setHomeScreenFading(false);
      setActiveTab('preview');

      // Load chat history
      try {
        const chatRes = await fetch(`/api/urlai-chat/${loadProjectId}`);
        if (chatRes.ok) {
          const { messages } = await chatRes.json();
          const loadedMsgs: ChatMessage[] = messages.map((m: any) => ({
            content: m.content,
            type: m.type === 'assistant' ? 'ai' : m.type,
            timestamp: new Date(m.createdAt),
            metadata: m.metadata,
          }));
          setChatMessages([
            { content: `Loaded: ${projectData.name}`, type: 'system', timestamp: new Date() },
            { content: `Files: ${projectData.files.length} | Source: ${projectData.sourceUrl || 'N/A'}`, type: 'system', timestamp: new Date() },
            ...loadedMsgs,
          ]);
        }
      } catch (e) {
        setChatMessages([
          { content: `Loaded: ${projectData.name}`, type: 'system', timestamp: new Date() },
        ]);
      }

      // Create sandbox DIRECTLY (not via createSandbox() which has state timing issues)
      setProjectLoadingMessage('Creating sandbox...');
      console.log('[loadUrlProject] Creating sandbox directly...');

      const sandboxRes = await fetch('/api/create-ai-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const sandboxResult = await sandboxRes.json();

      if (!sandboxResult.success) {
        throw new Error(sandboxResult.error || 'Failed to create sandbox');
      }

      console.log('[loadUrlProject] Sandbox created:', sandboxResult.sandboxId);

      // Set sandbox data in state
      setSandboxData(sandboxResult);
      updateStatus('Sandbox active', true);
      setLoading(false);

      // Update URL with sandbox ID
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('sandbox', sandboxResult.sandboxId);
      newParams.set('model', aiModel);
      router.push(`/urlai?${newParams.toString()}`, { scroll: false });

      // Wait for Vite to start inside sandbox
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Apply files directly using the sandbox ID we have (not relying on sandboxData state)
      setProjectLoadingMessage('Applying files...');
      console.log('[loadUrlProject] Applying', projectData.files.length, 'files...');

      // Ensure critical files exist before applying
      const files = [...projectData.files];

      const hasMainJsx = files.some((f: any) => f.path === 'src/main.jsx' || f.path === 'main.jsx');
      if (!hasMainJsx) {
        console.warn('[loadUrlProject] main.jsx missing! Auto-generating');
        files.push({
          path: 'src/main.jsx',
          content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
          type: 'javascript'
        });
      }

      const hasIndexCss = files.some((f: any) => f.path === 'src/index.css' || f.path === 'index.css');
      if (!hasIndexCss) {
        console.warn('[loadUrlProject] index.css missing! Auto-generating Tailwind CSS');
        files.push({
          path: 'src/index.css',
          content: '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
          type: 'css'
        });
      }

      const codeString = files.map((f: any) => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n');

      const applyRes = await fetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: codeString,
          isEdit: false,
          sandboxId: sandboxResult.sandboxId,
        }),
      });

      if (!applyRes.ok) {
        throw new Error('Failed to apply code');
      }

      // Read the stream to completion
      const reader = applyRes.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          console.log('[loadUrlProject] Apply stream:', text.slice(0, 100));
        }
      }

      console.log('[loadUrlProject] Files applied, refreshing preview...');

      // Wait for Tailwind/Vite to rebuild
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Force iframe to load the sandbox URL
      if (iframeRef.current && sandboxResult.url) {
        iframeRef.current.src = `${sandboxResult.url}?t=${Date.now()}&loaded=true`;
      }

      setLastSavedVersion(projectData.currentVersion || 1);
      setProjectLoadingMessage(null);
      addChatMessage('✅ Project restored! You can continue editing.', 'system');
    } catch (error: any) {
      console.error('[loadUrlProject] Failed:', error);
      addChatMessage(`Failed to load project: ${error.message}`, 'system');
      setProjectLoadingMessage(null);
    }
  };
  // --- END PROJECT PERSISTENCE FUNCTIONS ---

  const restartViteServer = async () => {
    try {
      addChatMessage('Restarting Vite dev server...', 'system');

      const response = await fetch('/api/restart-vite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          addChatMessage('✓ Vite dev server restarted successfully!', 'system');

          setTimeout(() => {
            if (iframeRef.current && sandboxData?.url) {
              iframeRef.current.src = `${sandboxData.url}?t=${Date.now()}`;
            }
          }, 2000);
        } else {
          addChatMessage(`Failed to restart Vite: ${data.error}`, 'error');
        }
      } else {
        addChatMessage('Failed to restart Vite server', 'error');
      }
    } catch (error) {
      console.error('[restartViteServer] Error:', error);
      addChatMessage(`Error restarting Vite: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const applyCode = async () => {
    const code = promptInput.trim();
    if (!code) {
      log('Please enter some code first', 'error');
      addChatMessage('No code to apply. Please generate code first.', 'system');
      return;
    }

    if (loading) {
      console.log('[applyCode] Already loading, skipping...');
      return;
    }

    const isEdit = conversationContext.appliedCode.length > 0;
    await applyGeneratedCode(code, isEdit);
  };

  const renderMainContent = () => {
    if (activeTab === 'generation' && (generationProgress.isGenerating || generationProgress.files.length > 0)) {
      return (
        <div className="absolute inset-0 flex overflow-hidden">
          {!generationProgress.isEdit && (
            <div className="w-[250px] border-r border-blue-900/50 bg-black/30 flex flex-col flex-shrink-0">
              <div className="p-3 bg-gray-900/50 text-gray-200 flex items-center justify-between border-b border-blue-900/50">
                <div className="flex items-center gap-2">
                  <BsFolderFill className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">Explorer</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                <div className="text-sm">
                  <div
                    className="flex items-center gap-1 py-1 px-2 hover:bg-white/10 rounded cursor-pointer text-gray-300"
                    onClick={() => toggleFolder('app')}
                  >
                    {expandedFolders.has('app') ? (
                      <FiChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    {expandedFolders.has('app') ? (
                      <BsFolder2Open className="w-4 h-4 text-blue-400" />
                    ) : (
                      <BsFolderFill className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="font-medium text-gray-200">app</span>
                  </div>

                  {expandedFolders.has('app') && (
                    <div className="ml-4">
                      {(() => {
                        const fileTree: { [key: string]: Array<{ name: string; edited?: boolean }> } = {};

                        const editedFiles = new Set(
                          generationProgress.files
                            .filter(f => f.edited)
                            .map(f => f.path)
                        );

                        generationProgress.files.forEach(file => {
                          const parts = file.path.split('/');
                          const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                          const fileName = parts[parts.length - 1];

                          if (!fileTree[dir]) fileTree[dir] = [];
                          fileTree[dir].push({
                            name: fileName,
                            edited: file.edited || false
                          });
                        });

                        return Object.entries(fileTree).map(([dir, files]) => (
                          <div key={dir} className="mb-1">
                            {dir && (
                              <div
                                className="flex items-center gap-1 py-1 px-2 hover:bg-white/10 rounded cursor-pointer text-gray-300"
                                onClick={() => toggleFolder(dir)}
                              >
                                {expandedFolders.has(dir) ? (
                                  <FiChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <FiChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                {expandedFolders.has(dir) ? (
                                  <BsFolder2Open className="w-4 h-4 text-yellow-500" />
                                ) : (
                                  <BsFolderFill className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="text-gray-300">{dir.split('/').pop()}</span>
                              </div>
                            )}
                            {(!dir || expandedFolders.has(dir)) && (
                              <div className={dir ? 'ml-6' : ''}>
                                {files.sort((a, b) => a.name.localeCompare(b.name)).map(fileInfo => {
                                  const fullPath = dir ? `${dir}/${fileInfo.name}` : fileInfo.name;
                                  const isSelected = selectedFile === fullPath;

                                  return (
                                    <div
                                      key={fullPath}
                                      className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all ${isSelected
                                        ? 'bg-blue-600/80 text-white'
                                        : 'text-gray-300 hover:bg-white/10'
                                        }`}
                                      onClick={() => handleFileClick(fullPath)}
                                    >
                                      {getFileIcon(fileInfo.name)}
                                      <span className={`text-xs flex items-center gap-1 ${isSelected ? 'font-medium' : ''}`}>
                                        {fileInfo.name}
                                        {fileInfo.edited && (
                                          <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-blue-400' : 'bg-orange-500 text-white'
                                            }`}>✓</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden bg-black p-4">
            {generationProgress.isGenerating && (generationProgress.isThinking || generationProgress.thinkingText) && (
              <div className="px-2 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-purple-400 font-medium flex items-center gap-2">
                    {generationProgress.isThinking ? (
                      <>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                        AI is thinking...
                      </>
                    ) : (
                      <>
                        <span className="text-purple-400">✓</span>
                        Thought for {generationProgress.thinkingDuration || 0} seconds
                      </>
                    )}
                  </div>
                </div>
                {generationProgress.thinkingText && (
                  <div className="bg-purple-950/50 border border-purple-700/50 rounded-lg p-4 max-h-48 overflow-y-auto scrollbar-hide">
                    <pre className="text-xs font-mono text-purple-200 whitespace-pre-wrap">
                      {generationProgress.thinkingText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 rounded-lg flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide" ref={codeDisplayRef}>
                {selectedFile ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-gray-900 border border-blue-900/50 rounded-lg overflow-hidden shadow-sm shadow-blue-500/10">
                      <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getFileIcon(selectedFile)}
                          <span className="font-mono text-sm">{selectedFile}</span>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="hover:bg-black/20 p-1 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-[#0d1117]">
                        <SyntaxHighlighter
                          language={(() => {
                            const ext = selectedFile.split('.').pop()?.toLowerCase();
                            if (ext === 'css') return 'css';
                            if (ext === 'json') return 'json';
                            if (ext === 'html') return 'html';
                            return 'jsx';
                          })()}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                          showLineNumbers={true}
                        >
                          {(() => {
                            const file = generationProgress.files.find(f => f.path === selectedFile);
                            return file?.content || '// File content will appear here';
                          })()}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                ) :
                  generationProgress.files.length === 0 && !generationProgress.currentFile ? (
                    generationProgress.isThinking ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="mb-8 relative">
                            <div className="w-24 h-24 mx-auto">
                              <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                              <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                            </div>
                          </div>
                          <h3 className="text-xl font-medium text-white mb-2">AI is analyzing your request</h3>
                          <p className="text-gray-400 text-sm">{generationProgress.status || 'Preparing to generate code...'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-900 border border-blue-900/50 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-800 text-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-sm">Streaming code...</span>
                          </div>
                        </div>
                        <div className="p-4 bg-[#0d1117]">
                          <SyntaxHighlighter
                            language="jsx"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.875rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={true}
                          >
                            {generationProgress.streamedCode || 'Starting code generation...'}
                          </SyntaxHighlighter>
                          <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      {generationProgress.currentFile && (
                        <div className="bg-gray-900 border-2 border-blue-500/60 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20">
                          <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span className="font-mono text-sm">{generationProgress.currentFile.path}</span>
                              <span className={`px-2 py-0.5 text-xs rounded ${generationProgress.currentFile.type === 'css' ? 'bg-blue-600 text-white' :
                                generationProgress.currentFile.type === 'javascript' ? 'bg-yellow-600 text-white' :
                                  generationProgress.currentFile.type === 'json' ? 'bg-green-600 text-white' :
                                    'bg-gray-600 text-gray-100'
                                }`}>
                                {generationProgress.currentFile.type === 'javascript' ? 'JSX' : generationProgress.currentFile.type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="bg-[#0d1117]">
                            <SyntaxHighlighter
                              language={
                                generationProgress.currentFile.type === 'css' ? 'css' :
                                  generationProgress.currentFile.type === 'json' ? 'json' :
                                    generationProgress.currentFile.type === 'html' ? 'html' :
                                      'jsx'
                              }
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.75rem',
                                background: 'transparent',
                              }}
                              showLineNumbers={true}
                            >
                              {generationProgress.currentFile.content}
                            </SyntaxHighlighter>
                            <span className="inline-block w-2 h-3 bg-blue-400 ml-4 mb-4 animate-pulse" />
                          </div>
                        </div>
                      )}

                      {generationProgress.files.map((file, idx) => (
                        <div key={idx} className="bg-gray-900 border border-blue-900/50 rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-green-400">✓</span>
                              <span className="font-mono text-sm">{file.path}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded ${file.type === 'css' ? 'bg-blue-600 text-white' :
                              file.type === 'javascript' ? 'bg-yellow-600 text-white' :
                                file.type === 'json' ? 'bg-green-600 text-white' :
                                  'bg-gray-600 text-gray-100'
                              }`}>
                              {file.type === 'javascript' ? 'JSX' : file.type.toUpperCase()}
                            </span>
                          </div>
                          <div className="bg-[#0d1117] max-h-48 overflow-y-auto scrollbar-hide">
                            <SyntaxHighlighter
                              language={
                                file.type === 'css' ? 'css' :
                                  file.type === 'json' ? 'json' :
                                    file.type === 'html' ? 'html' :
                                      'jsx'
                              }
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.75rem',
                                background: 'transparent',
                              }}
                              showLineNumbers={true}
                              wrapLongLines={true}
                            >
                              {file.content}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      ))}

                      {!generationProgress.currentFile && generationProgress.streamedCode.length > 0 && (
                        <div className="bg-gray-900 border border-blue-900/50 rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              <span className="font-mono text-sm">Processing...</span>
                            </div>
                          </div>
                          <div className="bg-[#0d1117]">
                            <SyntaxHighlighter
                              language="jsx"
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.75rem',
                                background: 'transparent',
                              }}
                              showLineNumbers={false}
                            >
                              {(() => {
                                const lastFileEnd = generationProgress.files.length > 0
                                  ? generationProgress.streamedCode.lastIndexOf('</file>') + 7
                                  : 0;
                                let remainingContent = generationProgress.streamedCode.slice(lastFileEnd).trim();

                                remainingContent = remainingContent.replace(/<explanation>[\s\S]*?<\/explanation>/g, '').trim();

                                return remainingContent || 'Waiting for next file...';
                              })()}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {generationProgress.components.length > 0 && (
              <div className="mx-2 mt-4 mb-2">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                    style={{
                      width: `${(generationProgress.currentComponent / Math.max(generationProgress.components.length, 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeTab === 'preview') {
      if (urlScreenshot && (loading || generationProgress.isGenerating || !sandboxData?.url || isPreparingDesign)) {
        return (
          <div className="relative w-full h-full bg-gray-900">
            <img
              src={urlScreenshot}
              alt="Website preview"
              className="w-full h-full object-contain"
            />
            {(generationProgress.isGenerating || isPreparingDesign) && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center bg-black/70 rounded-lg p-6 backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white text-sm font-medium">
                    {generationProgress.isGenerating ? 'Generating code...' : `Preparing your design for ${targetUrl}...`}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }

      if (loadingStage || (generationProgress.isGenerating && !generationProgress.isEdit)) {
        return (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                {loadingStage === 'gathering' && 'Gathering website information...'}
                {loadingStage === 'planning' && 'Planning your design...'}
                {(loadingStage === 'generating' || generationProgress.isGenerating) && 'Generating your application...'}
              </h3>
              <p className="text-gray-400 text-sm">
                {loadingStage === 'gathering' && 'Analyzing the website structure and content'}
                {loadingStage === 'planning' && 'Creating the optimal React component architecture'}
                {(loadingStage === 'generating' || generationProgress.isGenerating) && 'Writing clean, modern code for your app'}
              </p>
            </div>
          </div>
        );
      }

      if (sandboxData?.url && !loading) {
        return (
          <div className="relative w-full h-full">
            <iframe
              ref={iframeRef}
              src={sandboxData.url}
              className="w-full h-full border-none"
              title="MYTH Sandbox"
              allow="clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
            <button
              onClick={() => {
                if (iframeRef.current && sandboxData?.url) {
                  console.log('[Manual Refresh] Forcing iframe reload...');
                  const newSrc = `${sandboxData.url}?t=${Date.now()}&manual=true`;
                  iframeRef.current.src = newSrc;
                }
              }}
              className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
              title="Refresh sandbox"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Save button */}
            <button
              onClick={async () => {
                const currentFiles = Object.entries(sandboxFiles).map(([path, content]) => ({
                  path,
                  content,
                  type: path.endsWith('.css') ? 'css' : path.endsWith('.jsx') || path.endsWith('.tsx') ? 'jsx' : 'js'
                }));
                if (currentFiles.length > 0) {
                  await saveProjectVersion(
                    currentFiles,
                    [],
                    conversationContext.currentProject || targetUrl || 'Generated Project',
                    'Manual save'
                  );
                }
              }}
              disabled={isSaving || Object.keys(sandboxFiles).length === 0}
              className="absolute bottom-4 right-16 bg-black/50 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              title={isSaving ? 'Saving...' : `Save project${lastSavedVersion > 0 ? ` (v${lastSavedVersion})` : ''}`}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              )}
            </button>

            {/* Version History button */}
            {projectId && (
              <button
                onClick={async () => {
                  setIsVersionPanelOpen(!isVersionPanelOpen);
                  if (!isVersionPanelOpen) {
                    await fetchVersionHistory();
                  }
                }}
                className="absolute bottom-4 right-28 bg-black/50 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                title="Version history"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Version History Panel */}
            {isVersionPanelOpen && projectId && (
              <div className="absolute top-0 right-0 w-72 h-full bg-gray-900/95 backdrop-blur-md border-l border-gray-700/50 overflow-y-auto z-50">
                <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Version History</h3>
                  <button
                    onClick={() => setIsVersionPanelOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {projectVersions.length === 0 ? (
                  <div className="p-4 text-gray-500 text-sm text-center">No versions saved yet</div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {projectVersions.map((v) => (
                      <div key={v.id} className="p-3 hover:bg-gray-800/50 transition-colors group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-blue-400">v{v.version}</span>
                          <span className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-gray-300 mb-2 truncate">{v.message || `Version ${v.version}`}</p>
                        <button
                          onClick={() => restoreVersion(v.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Restore this version
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      if (isCapturingScreenshot) {
        return (
          <div className="flex items-center justify-center h-full bg-black">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-800 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">Gathering website information</h3>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-full bg-black text-gray-500 text-lg">
          {screenshotError ? (
            <div className="text-center">
              <p className="mb-2 text-gray-300">Failed to capture screenshot</p>
              <p className="text-sm text-gray-500">{screenshotError}</p>
            </div>
          ) : sandboxData ? (
            <div className="text-gray-400 text-center">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading preview...</p>
            </div>
          ) : (
            <div className="text-gray-500 text-center">
              <p className="text-sm">Start chatting to create your first app</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const sendChatMessage = async () => {
    const message = aiChatInput.trim();
    if (!message) return;

    if (!aiEnabled) {
      addChatMessage('AI is disabled. Please enable it first.', 'system');
      return;
    }

    addChatMessage(message, 'user');
    setAiChatInput('');

    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'check packages' || lowerMessage === 'install packages' || lowerMessage === 'npm install') {
      if (!sandboxData) {
        addChatMessage('No active sandbox. Create a sandbox first!', 'system');
        return;
      }
      await checkAndInstallPackages();
      return;
    }

    let sandboxPromise: Promise<void> | null = null;
    let sandboxCreating = false;

    if (!sandboxData) {
      sandboxCreating = true;
      addChatMessage('Creating sandbox while I plan your app...', 'system');
      sandboxPromise = createSandbox(true).catch((error: any) => {
        addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
        throw error;
      });
    }

    const isEdit = conversationContext.appliedCode.length > 0;

    try {
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: true,
        status: 'Starting AI generation...',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: true,
        thinkingText: 'Analyzing your request...',
        thinkingDuration: undefined,
        currentFile: undefined,
        lastProcessedPosition: 0,
        isEdit: isEdit,
        files: prev.files
      }));

      console.log('[chat] Using backend file cache for context');

      const fullContext = {
        sandboxId: sandboxData?.sandboxId || (sandboxCreating ? 'pending' : null),
        structure: structureContent,
        recentMessages: chatMessages.slice(-20),
        conversationContext: conversationContext,
        currentCode: promptInput,
        sandboxUrl: sandboxData?.url,
        sandboxCreating: sandboxCreating
      };

      console.log('[chat] Sending context to AI:');
      console.log('[chat] - sandboxId:', fullContext.sandboxId);
      console.log('[chat] - isEdit:', conversationContext.appliedCode.length > 0);

      const response = await fetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          model: aiModel,
          context: fullContext,
          isEdit: conversationContext.appliedCode.length > 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let explanation = '';

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

                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  let text = data.text || '';

                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');

                  if (!text.includes('<file') && !text.includes('import React') &&
                    !text.includes('export default') && !text.includes('className=') &&
                    text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => {
                    const newStreamedCode = prev.streamedCode + data.text;

                    const updatedState: typeof prev = {
                      ...prev,
                      streamedCode: newStreamedCode,
                      isStreaming: true,
                      isThinking: false,
                      status: 'Generating code...'
                    };

                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    let match;
                    const processedFiles = new Set(prev.files.map(f => f.path));

                    while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                      const filePath = match[1];
                      const fileContent = match[2];

                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                          fileExt === 'css' ? 'css' :
                            fileExt === 'json' ? 'json' :
                              fileExt === 'html' ? 'html' : 'text';

                        const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);

                        if (existingFileIndex >= 0) {
                          updatedState.files = [
                            ...updatedState.files.slice(0, existingFileIndex),
                            {
                              ...updatedState.files[existingFileIndex],
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: true
                            },
                            ...updatedState.files.slice(existingFileIndex + 1)
                          ];
                        } else {
                          updatedState.files.push({
                            path: filePath,
                            content: fileContent.trim(),
                            type: fileType,
                            completed: true,
                            edited: false
                          });
                        }

                        if (!prev.isEdit) {
                          updatedState.status = `Completed ${filePath}`;
                        }
                        processedFiles.add(filePath);
                      }
                    }

                    const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                    if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                      const filePath = lastFileMatch[1];
                      const partialContent = lastFileMatch[2];

                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                          fileExt === 'css' ? 'css' :
                            fileExt === 'json' ? 'json' :
                              fileExt === 'html' ? 'html' : 'text';

                        updatedState.currentFile = {
                          path: filePath,
                          content: partialContent,
                          type: fileType
                        };

                        if (!prev.isEdit) {
                          updatedState.status = `Generating ${filePath}`;
                        }
                      }
                    } else {
                      updatedState.currentFile = undefined;
                    }

                    return updatedState;
                  });
                } else if (data.type === 'app') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: 'Generated App.jsx structure'
                  }));
                } else if (data.type === 'component') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${data.name}`,
                    components: [...prev.components, {
                      name: data.name,
                      path: data.path,
                      completed: true
                    }],
                    currentComponent: data.index
                  }));
                } else if (data.type === 'package') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: data.message || `Installing ${data.name}`
                  }));
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;

                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode
                  }));

                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingText: undefined,
                    thinkingDuration: undefined
                  }));

                  if (data.packagesToInstall && data.packagesToInstall.length > 0) {
                    console.log('[generate-code] Packages to install from tools:', data.packagesToInstall);
                    (window as any).pendingPackages = data.packagesToInstall;
                  }

                  const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                  const parsedFiles: GeneratedFile[] = [];
                  let fileMatch;

                  while ((fileMatch = fileRegex.exec(data.generatedCode)) !== null) {
                    const filePath = fileMatch[1];
                    const fileContent = fileMatch[2];
                    const fileExt = filePath.split('.').pop() || '';
                    const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                      fileExt === 'css' ? 'css' :
                        fileExt === 'json' ? 'json' :
                          fileExt === 'html' ? 'html' : 'text';

                    parsedFiles.push({
                      path: filePath,
                      content: fileContent.trim(),
                      type: fileType,
                      completed: true
                    });
                  }

                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${parsedFiles.length > 0 ? parsedFiles.length : prev.files.length} file${(parsedFiles.length > 0 ? parsedFiles.length : prev.files.length) !== 1 ? 's' : ''}!`,
                    isGenerating: false,
                    isStreaming: false,
                    isEdit: prev.isEdit,
                    files: prev.files.length > 0 ? prev.files : parsedFiles
                  }));
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      if (generatedCode) {
        const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
        const generatedFiles = [];
        let match;
        while ((match = fileRegex.exec(generatedCode)) !== null) {
          generatedFiles.push(match[1]);
        }

        if (isEdit && generatedFiles.length > 0) {
          const editedFileNames = generatedFiles.map(f => f.split('/').pop()).join(', ');
          addChatMessage(
            explanation || `Updated ${editedFileNames}`,
            'ai',
            {
              appliedFiles: [generatedFiles[0]]
            }
          );
        } else {
          addChatMessage(explanation || 'Code generated!', 'ai', {
            appliedFiles: generatedFiles
          });
        }

        setPromptInput(generatedCode);

        if (sandboxPromise) {
          addChatMessage('Waiting for sandbox to be ready...', 'system');
          try {
            await sandboxPromise;
            setChatMessages(prev => prev.filter(msg => msg.content !== 'Waiting for sandbox to be ready...'));
          } catch {
            addChatMessage('Sandbox creation failed. Cannot apply code.', 'system');
            return;
          }
        }

        if (sandboxData && generatedCode) {
          await applyGeneratedCode(generatedCode, isEdit);

          // --- START: ADDED FOR HISTORY FEATURE (with corrected regex) ---
          const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
          const newFiles: GeneratedFile[] = [];
          let match;
          while ((match = fileRegex.exec(generatedCode)) !== null) {
            const path = match[1];
            const content = match[2];
            const fileExt = path.split('.').pop()?.toLowerCase() || 'text';
            const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' : fileExt;
            newFiles.push({ path, content, type: fileType, completed: true, edited: true });
          }

          const filesMap = new Map(generationProgress.files.map(f => [f.path, f]));
          newFiles.forEach(file => filesMap.set(file.path, file));
          const completeFileSet = Array.from(filesMap.values());

          setGenerationProgress(prev => ({ ...prev, files: completeFileSet }));

          const newVersion: WebsiteVersion = {
            id: Date.now(),
            timestamp: new Date(),
            files: completeFileSet,
            prompt: message,
            type: 'edit',
          };
          setWebsiteHistory(prev => [newVersion, ...prev]);
          // --- END: ADDED FOR HISTORY FEATURE ---
        }
      }

      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: 'Generation complete!',
        isEdit: prev.isEdit,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined
      }));

      setTimeout(() => {
        setActiveTab('preview');
      }, 1000);
    } catch (error: any) {
      setChatMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
      addChatMessage(`Error: ${error.message}`, 'system');
      setGenerationProgress({
        isGenerating: false,
        status: '',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined,
        files: [],
        currentFile: undefined,
        lastProcessedPosition: 0
      });
      setActiveTab('preview');
    }
  };


  const downloadZip = async () => {
    if (!sandboxData) {
      addChatMessage('No active sandbox to download. Create a sandbox first!', 'system');
      return;
    }

    setLoading(true);
    log('Creating zip file...');
    addChatMessage('Creating ZIP file of your Vite app...', 'system');

    try {
      const response = await fetch('/api/create-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        log('Zip file created!');
        addChatMessage('ZIP file created! Download starting...', 'system');

        const link = document.createElement('a');
        link.href = data.dataUrl;
        link.download = data.fileName || 'e2b-project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addChatMessage(
          'Your Vite app has been downloaded! To run it locally:\n' +
          '1. Unzip the file\n' +
          '2. Run: npm install\n' +
          '3. Run: npm run dev\n' +
          '4. Open http://localhost:5173',
          'system'
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      log(`Failed to create zip: ${error.message}`, 'error');
      addChatMessage(`Failed to create ZIP: ${error.message}`, 'system');
    } finally {
      setLoading(false);
    }
  };

  const reapplyLastGeneration = async () => {
    if (!conversationContext.lastGeneratedCode) {
      addChatMessage('No previous generation to re-apply', 'system');
      return;
    }

    if (!sandboxData) {
      addChatMessage('Please create a sandbox first', 'system');
      return;
    }

    addChatMessage('Re-applying last generation...', 'system');
    const isEdit = conversationContext.appliedCode.length > 0;
    await applyGeneratedCode(conversationContext.lastGeneratedCode, isEdit);
  };

  // --- START: ADDED FOR HISTORY FEATURE ---
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
  // --- END: ADDED FOR HISTORY FEATURE ---

  useEffect(() => {
    if (codeDisplayRef.current && generationProgress.isStreaming) {
      codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
    }
  }, [generationProgress.streamedCode, generationProgress.isStreaming]);

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'jsx' || ext === 'js') {
      return <SiJavascript className="w-4 h-4 text-yellow-400" />;
    } else if (ext === 'tsx' || ext === 'ts') {
      return <SiReact className="w-4 h-4 text-blue-400" />;
    } else if (ext === 'css') {
      return <SiCss3 className="w-4 h-4 text-blue-400" />;
    } else if (ext === 'json') {
      return <SiJson className="w-4 h-4 text-green-400" />;
    } else {
      return <FiFile className="w-4 h-4 text-gray-400" />;
    }
  };

  const clearChatHistory = () => {
    setChatMessages([{
      content: 'Chat history cleared. How can I help you?',
      type: 'system',
      timestamp: new Date()
    }]);
  };


  const cloneWebsite = async () => {
    let url = urlInput.trim();
    if (!url) {
      setUrlStatus(prev => [...prev, 'Please enter a URL']);
      return;
    }

    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }

    setUrlStatus([`Using: ${url}`, 'Starting to scrape...']);

    setUrlOverlayVisible(false);

    const cleanUrl = url.replace(/^https?:\/\//i, '');
    addChatMessage(`Starting to clone ${cleanUrl}...`, 'system');

    captureUrlScreenshot(url);

    try {
      addChatMessage('Scraping website content...', 'system');
      const scrapeResponse = await fetch('/api/scrape-url-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!scrapeResponse.ok) {
        throw new Error(`Scraping failed: ${scrapeResponse.status}`);
      }

      const scrapeData = await scrapeResponse.json();

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to scrape website');
      }

      addChatMessage(`Scraped ${scrapeData.content.length} characters from ${url}`, 'system');

      setIsPreparingDesign(false);
      setActiveTab('generation');

      setConversationContext(prev => ({
        ...prev,
        scrapedWebsites: [...prev.scrapedWebsites, {
          url,
          content: scrapeData,
          timestamp: new Date()
        }],
        currentProject: `Clone of ${url}`
      }));

      let sandboxPromise: Promise<void> | null = null;
      if (!sandboxData) {
        addChatMessage('Creating sandbox while generating your React app...', 'system');
        sandboxPromise = createSandbox(true);
      }

      addChatMessage('Analyzing and generating React recreation...', 'system');

      // The scraper now embeds a grouped IMAGE CATALOG directly in scrapeData.content
      // so we don't need to inject a separate flat image list anymore.

      const recreatePrompt = `I scraped this website and want you to recreate it as a modern React application.

URL: ${url}

SCRAPED CONTENT:
${scrapeData.content}

${homeContextInput ? `ADDITIONAL CONTEXT/REQUIREMENTS FROM USER:
${homeContextInput}

Please incorporate these requirements into the design and implementation.` : ''}

REQUIREMENTS:
1. Create a COMPLETE React application with App.jsx as the main component
2. App.jsx MUST import and render all other components
3. Recreate the main sections and layout from the scraped content
4. ${homeContextInput ? `Apply the user's context/theme: "${homeContextInput}"` : `Use a modern dark theme with excellent contrast:
   - Background: #0a0a0a
   - Text: #ffffff
   - Links: #60a5fa
   - Accent: #3b82f6`}
5. Make it fully responsive
6. Include hover effects and smooth transitions
7. Create separate components for major sections (Header, Hero, Features, etc.)
8. Use semantic HTML5 elements

IMPORTANT CONSTRAINTS:
- DO NOT use React Router or any routing libraries
- Use regular <a> tags with href="#section" for navigation, NOT Link or NavLink components
- This is a single-page application, no routing needed
- ALWAYS create src/App.jsx that imports ALL components
- Each component should be in src/components/
- Use Tailwind CSS for ALL styling (no custom CSS files)
- Make sure the app actually renders visible content
- Create ALL components that you reference in imports
- u must create footer div at last component or component/footer.jsx file wuth <p>&copy; new Date() {ProjectName}.ReCreatedBy@MYTH. All rights reserved.</p> . project name depends on what user told to recreate

IMAGE HANDLING RULES (YOUR MOST CRITICAL TASK):

Above in the scraped content you will find an === IMAGE CATALOG === section.
Each image is labeled with:
  - URL: the actual image URL
  - Alt: alt text from the original site
  - Context: surrounding text from the original page
  - Section: a category like PRODUCT:IPHONE, PRODUCT:MACBOOK, LOGO, HERO, PROMO/ENTERTAINMENT, etc.

You MUST follow these rules:

1. MATCH IMAGES TO SECTIONS BY THEIR LABELS:
   - An image labeled PRODUCT:IPHONE goes in the iPhone section, NOWHERE ELSE
   - An image labeled PRODUCT:MACBOOK goes in the MacBook section
   - An image labeled LOGO goes in the header/nav
   - An image labeled PROMO/ENTERTAINMENT is for entertainment/TV/streaming sections ONLY
   - NEVER put a PROMO/ENTERTAINMENT image (TV shows, movies) in a PRODUCT section (iPhone, iPad, MacBook)

2. USE URL PATHS AS CLUES:
   - If the image URL contains "/iphone/" or "/ipad/" or "/macbook/" etc., it belongs to THAT product section
   - Example: https://www.apple.com/v/iphone/home/images/hero.jpg -> iPhone section
   - Example: https://www.apple.com/v/macbook-pro/images/overview.jpg -> MacBook Pro section

3. WHEN NO SCRAPED IMAGE MATCHES a section:
   - Use Picsum placeholder: https://picsum.photos/seed/{section-name}/800/600
   - Example: iPhone section -> https://picsum.photos/seed/iphone16/800/600
   - Example: MacBook section -> https://picsum.photos/seed/macbookpro/800/600
   - Each section gets a UNIQUE seed name

4. GENERAL RULES:
   - NEVER use empty src, via.placeholder.com, or placehold.co
   - NEVER use source.unsplash.com (it is deprecated and broken)
   - NEVER use the same image in multiple sections
   - DO NOT add crossOrigin attribute to img tags (it blocks images from servers without CORS headers)
   - Add loading="lazy" to images below the fold
   - Add descriptive alt text matching the product/section name
   - Use the EXACT URLs from the IMAGE CATALOG — do not modify or shorten them

ANIMATION & MAGIC UI COMPONENTS (MANDATORY):
framer-motion is pre-installed in the sandbox. You MUST use animated components inspired by Magic UI / 21st.dev:
- Hero: use AnimatedText (word-by-word reveal with framer-motion) + Particles or GradientMesh background
- Cards/Features: use BentoGrid or GlowCard (3D tilt + glow on hover) with stagger animations
- Logos/Testimonials: use Marquee (infinite horizontal scroll with mask gradient)
- Buttons: use ShimmerButton (animated shine sweep across the button)
- Section reveals: use StaggerContainer + StaggerItem (whileInView fade + slide up)
- Card borders: use BorderBeam (rotating conic-gradient border)
- Create these as small utility components in src/components/ui/magic.jsx or inline
- Use at LEAST 4-5 of these effects per generated website
- DO NOT use css-in-js or styled-components, use Tailwind + framer-motion only

Focus on the key sections and content, making it clean and modern while preserving ALL visual assets from the original site.`;

      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: true,
        status: 'Initializing AI...',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: true,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined,
        files: prev.files || [],
        currentFile: undefined,
        lastProcessedPosition: 0
      }));

      setActiveTab('generation');

      const aiResponse = await fetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: recreatePrompt,
          model: aiModel,
          context: {
            sandboxId: sandboxData?.sandboxId,
            structure: structureContent,
            conversationContext: conversationContext
          }
        })
      });

      if (!aiResponse.ok) {
        throw new Error(`AI generation failed: ${aiResponse.status}`);
      }

      const reader = aiResponse.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let explanation = '';

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

                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  let text = data.text || '';

                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');

                  if (!text.includes('<file') && !text.includes('import React') &&
                    !text.includes('export default') && !text.includes('className=') &&
                    text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => ({
                    ...prev,
                    streamedCode: prev.streamedCode + data.text,
                    lastProcessedPosition: prev.lastProcessedPosition || 0
                  }));
                } else if (data.type === 'component') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${data.name}`,
                    components: [...prev.components, {
                      name: data.name,
                      path: data.path,
                      completed: true
                    }],
                    currentComponent: prev.currentComponent + 1
                  }));
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;

                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode
                  }));
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      }

      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: 'Generation complete!',
        isEdit: prev.isEdit
      }));

      if (generatedCode) {
        addChatMessage('AI recreation generated!', 'system');

        if (explanation && explanation.trim()) {
          addChatMessage(explanation, 'ai');
        }

        setPromptInput(generatedCode);

        if (sandboxPromise) {
          addChatMessage('Waiting for sandbox to be ready...', 'system');
          try {
            await sandboxPromise;
            setChatMessages(prev => prev.filter(msg => msg.content !== 'Waiting for sandbox to be ready...'));
          } catch (error: any) {
            addChatMessage('Sandbox creation failed. Cannot apply code.', 'system');
            throw error;
          }
        }

        await applyGeneratedCode(generatedCode, false);

        addChatMessage(
          `Successfully recreated ${url} as a modern React app${homeContextInput ? ` with your requested context: "${homeContextInput}"` : ''}! The scraped content is now in my context, so you can ask me to modify specific sections or add features based on the original site.`,
          'ai',
          {
            scrapedUrl: url,
            scrapedContent: scrapeData,
            generatedCode: generatedCode
          }
        );

        setUrlInput('');
        setUrlStatus([]);
        setHomeContextInput('');

        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));

        setUrlScreenshot(null);
        setIsPreparingDesign(false);
        setTargetUrl('');
        setScreenshotError(null);
        setLoadingStage(null);

        setTimeout(() => {
          setActiveTab('preview');
        }, 1000);
      } else {
        throw new Error('Failed to generate recreation');
      }

    } catch (error: any) {
      addChatMessage(`Failed to clone website: ${error.message}`, 'system');
      setUrlStatus([]);
      setIsPreparingDesign(false);
      setUrlScreenshot(null);
      setTargetUrl('');
      setScreenshotError(null);
      setLoadingStage(null);
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: '',
        files: prev.files
      }));
      setActiveTab('preview');
    }
  };

  const captureUrlScreenshot = async (url: string) => {
    setIsCapturingScreenshot(true);
    setScreenshotError(null);
    try {
      const response = await fetch('/api/scrape-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (data.success && data.screenshot) {
        setUrlScreenshot(data.screenshot);
        setIsPreparingDesign(true);
        const cleanUrl = url.replace(/^https?:\/\//i, '');
        setTargetUrl(cleanUrl);
        if (activeTab !== 'preview') {
          setActiveTab('preview');
        }
      } else {
        setScreenshotError(data.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setScreenshotError('Network error while capturing screenshot');
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleHomeScreenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeUrlInput.trim()) return;

    setHomeScreenFading(true);

    setChatMessages([]);
    let displayUrl = homeUrlInput.trim();
    if (!displayUrl.match(/^https?:\/\//i)) {
      displayUrl = 'https://' + displayUrl;
    }
    const cleanUrl = displayUrl.replace(/^https?:\/\//i, '');
    addChatMessage(`Starting to clone ${cleanUrl}...`, 'system');

    const sandboxPromise = !sandboxData ? createSandbox(true) : Promise.resolve();

    if (!sandboxData) {
      captureUrlScreenshot(displayUrl);
    }

    setLoadingStage('gathering');
    setActiveTab('preview');

    setTimeout(async () => {
      setShowHomeScreen(false);
      setHomeScreenFading(false);

      await sandboxPromise;

      setUrlInput(homeUrlInput);
      setUrlOverlayVisible(false);
      setUrlStatus(['Scraping website content...']);

      try {
        let url = homeUrlInput.trim();
        if (!url.match(/^https?:\/\//i)) {
          url = 'https://' + url;
        }

        const scrapeResponse = await fetch('/api/scrape-url-enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        if (!scrapeResponse.ok) {
          throw new Error('Failed to scrape website');
        }

        const scrapeData = await scrapeResponse.json();

        if (!scrapeData.success) {
          throw new Error(scrapeData.error || 'Failed to scrape website');
        }

        setUrlStatus(['Website scraped successfully!', 'Generating React app...']);

        setIsPreparingDesign(false);
        setUrlScreenshot(null);
        setTargetUrl('');

        setLoadingStage('planning');

        setTimeout(() => {
          setLoadingStage('generating');
          setActiveTab('generation');
        }, 1500);

        setConversationContext(prev => ({
          ...prev,
          scrapedWebsites: [...prev.scrapedWebsites, {
            url: url,
            content: scrapeData,
            timestamp: new Date()
          }],
          currentProject: `${url} Clone`
        }));

        // The scraper now embeds a grouped IMAGE CATALOG directly in scrapeData.content
        const prompt = `I want to recreate the ${url} website as a complete React application based on the scraped content below.

${scrapeData.content}

${homeContextInput ? `ADDITIONAL CONTEXT/REQUIREMENTS FROM USER:
${homeContextInput}

Please incorporate these requirements into the design and implementation.` : ''}

IMPORTANT INSTRUCTIONS:
- Create a COMPLETE, working React application
- Implement ALL sections and features from the original site
- Use Tailwind CSS for all styling (no custom CSS files)
- Make it responsive and modern
- Ensure all text content matches the original
- Create proper component structure
- Make sure the app actually renders visible content
- Create ALL components that you reference in imports
- u must create footer div at last component or component/footer.jsx file wuth <p>&copy; new Date() {ProjectName}.ReCreatedBy@MYTH. All rights reserved.</p> . project name depends on what user told to recreate
${homeContextInput ? '- Apply the user\'s context/theme requirements throughout the application' : ''}

IMAGE HANDLING RULES (YOUR MOST CRITICAL TASK):

The IMAGE CATALOG above groups images by section (PRODUCT:IPHONE, PRODUCT:MACBOOK, LOGO, etc.).

1. MATCH images to sections by their labels and URL paths
   - /iphone/ in URL -> iPhone section ONLY
   - /macbook/ in URL -> MacBook section ONLY
   - PROMO/ENTERTAINMENT images go in entertainment sections, NEVER in product sections
2. When NO scraped image matches, use: https://picsum.photos/seed/{section-name}/800/600
   - CORRECT: https://picsum.photos/seed/iphone16pro/800/600
   - WRONG: generic placeholder or source.unsplash.com (deprecated)
3. NEVER reuse the same image across multiple sections
4. NEVER use placeholder services, empty src, or generic images
5. NEVER use source.unsplash.com (it is deprecated and broken)
6. DO NOT add crossOrigin attribute to img tags (it blocks images from servers without CORS headers)
7. Add loading="lazy" to images below the fold
8. Use the EXACT URLs from the IMAGE CATALOG — do not modify or shorten them

ANIMATION & MAGIC UI (MANDATORY):
framer-motion is pre-installed. Use animated components: AnimatedText, Marquee, ShimmerButton, BentoGrid, GlowCard, Particles, StaggerFadeIn, BorderBeam.
Create them as utility components in src/components/ui/magic.jsx. Use at least 4-5 per site.

Focus on the key sections and content, making it clean and modern while preserving ALL visual assets.`;

        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: true,
          status: 'Initializing AI...',
          components: [],
          currentComponent: 0,
          streamedCode: '',
          isStreaming: true,
          isThinking: false,
          thinkingText: undefined,
          thinkingDuration: undefined,
          files: prev.files || [],
          currentFile: undefined,
          lastProcessedPosition: 0
        }));

        const aiResponse = await fetch('/api/generate-ai-code-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: aiModel,
            context: {
              sandboxId: sandboxData?.sandboxId,
              structure: structureContent,
              conversationContext: conversationContext
            }
          })
        });

        if (!aiResponse.ok || !aiResponse.body) {
          throw new Error('Failed to generate code');
        }

        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let generatedCode = '';
        let explanation = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  let text = data.text || '';

                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');

                  if (!text.includes('<file') && !text.includes('import React') &&
                    !text.includes('export default') && !text.includes('className=') &&
                    text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => {
                    const newStreamedCode = prev.streamedCode + data.text;

                    const updatedState: typeof prev = {
                      ...prev,
                      streamedCode: newStreamedCode,
                      isStreaming: true,
                      isThinking: false,
                      status: 'Generating code...'
                    };

                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    let match;
                    const processedFiles = new Set(prev.files.map(f => f.path));

                    while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                      const filePath = match[1];
                      const fileContent = match[2];

                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                          fileExt === 'css' ? 'css' :
                            fileExt === 'json' ? 'json' :
                              fileExt === 'html' ? 'html' : 'text';

                        const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);

                        if (existingFileIndex >= 0) {
                          updatedState.files = [
                            ...updatedState.files.slice(0, existingFileIndex),
                            {
                              ...updatedState.files[existingFileIndex],
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: true
                            },
                            ...updatedState.files.slice(existingFileIndex + 1)
                          ];
                        } else {
                          updatedState.files.push({
                            path: filePath,
                            content: fileContent.trim(),
                            type: fileType,
                            completed: true,
                            edited: false
                          });
                        }

                        if (!prev.isEdit) {
                          updatedState.status = `Completed ${filePath}`;
                        }
                        processedFiles.add(filePath);
                      }
                    }

                    const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                    if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                      const filePath = lastFileMatch[1];
                      const partialContent = lastFileMatch[2];

                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                          fileExt === 'css' ? 'css' :
                            fileExt === 'json' ? 'json' :
                              fileExt === 'html' ? 'html' : 'text';

                        updatedState.currentFile = {
                          path: filePath,
                          content: partialContent,
                          type: fileType
                        };

                        if (!prev.isEdit) {
                          updatedState.status = `Generating ${filePath}`;
                        }
                      }
                    } else {
                      updatedState.currentFile = undefined;
                    }

                    return updatedState;
                  });
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;

                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode
                  }));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }

        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));

        if (generatedCode) {
          addChatMessage('AI recreation generated!', 'system');

          if (explanation && explanation.trim()) {
            addChatMessage(explanation, 'ai');
          }

          setPromptInput(generatedCode);

          await applyGeneratedCode(generatedCode, false);

          // --- START: ADDED FOR HISTORY FEATURE (with corrected regex) ---
          const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
          const parsedFiles: GeneratedFile[] = [];
          let match;
          while ((match = fileRegex.exec(generatedCode)) !== null) {
            const path = match[1];
            const content = match[2];
            const fileExt = path.split('.').pop()?.toLowerCase() || 'text';
            const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' : fileExt;
            parsedFiles.push({ path, content, type: fileType, completed: true, edited: false });
          }

          setGenerationProgress(prev => ({ ...prev, files: parsedFiles }));

          const newVersion: WebsiteVersion = {
            id: Date.now(),
            timestamp: new Date(),
            files: parsedFiles,
            prompt: `Clone: ${homeUrlInput.trim()}` + (homeContextInput.trim() ? ` (${homeContextInput.trim()})` : ''),
            type: 'clone',
          };
          setWebsiteHistory(prev => [newVersion, ...prev]);
          // --- END: ADDED FOR HISTORY FEATURE ---

          addChatMessage(
            `Successfully recreated ${url} as a modern React app${homeContextInput ? ` with your requested context: "${homeContextInput}"` : ''}! The scraped content is now in my context, so you can ask me to modify specific sections or add features based on the original site.`,
            'ai',
            {
              scrapedUrl: url,
              scrapedContent: scrapeData,
              generatedCode: generatedCode
            }
          );

          setConversationContext(prev => ({
            ...prev,
            generatedComponents: [],
            appliedCode: [...prev.appliedCode, {
              files: [],
              timestamp: new Date()
            }]
          }));
        } else {
          throw new Error('Failed to generate recreation');
        }

        setUrlInput('');
        setUrlStatus([]);
        setHomeContextInput('');

        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));

        setUrlScreenshot(null);
        setIsPreparingDesign(false);
        setTargetUrl('');
        setScreenshotError(null);
        setLoadingStage(null);

        setTimeout(() => {
          setActiveTab('preview');
        }, 1000);
      } catch (error: any) {
        addChatMessage(`Failed to clone website: ${error.message}`, 'system');
        setUrlStatus([]);
        setIsPreparingDesign(false);
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: '',
          files: prev.files
        }));
      }
    }, 500);
  };

  return (
    <div className="font-sans bg-black text-gray-200 h-screen flex flex-col">

      <AnimatePresence>
        <motion.div
          className="fixed z-[100] w-[200px] h-[200px] md:w-[300px] md:h-[300px]"
          variants={botVariants}
          animate={showHomeScreen ? (showStyleSelector ? 'homeWithSelector' : 'home') : 'app'}
          // REMOVED: `fromLanding` logic
          initial={showHomeScreen ? "home" : "app"}
        >
          {/* <MichiBot showARButton={showHomeScreen} /> */}
        </motion.div>
      </AnimatePresence>


      {/* page 1 : Home Screen Overlay */}
      {showHomeScreen && (
        <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${homeScreenFading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-black overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/40 via-blue-400/25 to-transparent rounded-full blur-[80px] animate-[sunPulse_4s_ease-in-out_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-blue-300/35 via-blue-600/25 to-transparent rounded-full blur-[40px] animate-[sunPulse_4s_ease-in-out_infinite_0.5s]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-gradient-radial from-blue-200/15 to-transparent rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-1/2 w-[800px] h-[800px] animate-[orbShrink_3s_ease-out_forwards]" style={{ transform: 'translateX(-50%) translateY(45%)' }}>
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-blue-700 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute inset-16 bg-blue-600 rounded-full blur-[80px] opacity-40 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute inset-32 bg-blue-500 rounded-full blur-[60px] opacity-50 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <div className="absolute inset-48 bg-blue-300 rounded-full blur-[40px] opacity-60"></div>
              </div>
            </div>
          </div>

          {/* CORRECTED ROUTE */}
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            size="icon"
            title="Go to Landing Page"
            className="absolute top-8 left-8 z-30 h-10 w-10 text-gray-300 bg-black/50 backdrop-blur-sm border border-blue-900/50 rounded-full transition-all duration-300 hover:text-white hover:bg-blue-500/20 shadow-[0_0_15px_1px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_2px_rgba(59,130,246,0.6)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Button>

          <button
            onClick={() => {
              setHomeScreenFading(true);
              setTimeout(() => {
                setShowHomeScreen(false);
                setHomeScreenFading(false);
              }, 500);
            }}
            className="absolute top-8 right-8 text-white hover:text-white transition-all duration-300 opacity-0 hover:opacity-100 bg-black/60 backdrop-blur-sm p-2 rounded-lg shadow-sm"
            style={{ opacity: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between animate-[fadeIn_0.8s_ease-out]"></div>

          <div className="relative z-10 h-full flex items-center justify-center px-4">
            <div className="text-center max-w-4xl min-w-[600px] mx-auto">
              <div className="text-center pt-[150px] md:pt-[200px]">
                <h1 className="text-[2.5rem] lg:text-[3.8rem] text-center text-white font-semibold tracking-tight leading-[0.9] animate-[fadeIn_0.8s_ease-out]">
                  <span className="hidden md:inline">MYTH</span>
                  <span className="md:hidden">MYTH</span>
                </h1>
                <motion.p
                  className="text-base lg:text-lg max-w-lg mx-auto mt-2.5 text-white/90 text-center text-balance"
                  animate={{
                    opacity: showStyleSelector ? 0.7 : 1
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  Re-imagine any website, in seconds.
                </motion.p>
              </div>

              <form onSubmit={handleHomeScreenSubmit} className="mt-5 max-w-3xl mx-auto">
                <div className="w-full relative group">
                  <input
                    type="text"
                    value={homeUrlInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setHomeUrlInput(value);

                      const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/?.*)?$/;
                      if (domainRegex.test(value) && value.length > 5) {
                        setTimeout(() => setShowStyleSelector(true), 100);
                      } else {
                        setShowStyleSelector(false);
                        setSelectedStyle(null);
                      }
                    }}
                    placeholder=" "
                    aria-placeholder="https://firecrawl.dev"
                    className="h-[3.25rem] w-full resize-none focus-visible:outline-none focus-visible:ring-blue-500 focus-visible:ring-2 rounded-[18px] text-sm text-[#e5e7eb] px-4 pr-12 border-[.75px] border-blue-700 bg-black/60 placeholder:text-gray-400"
                    style={{
                      boxShadow: '0 0 0 1px #e3e1de66, 0 1px 2px #5f4a2e14, 0 4px 6px #5f4a2e0a, 0 40px 40px -24px #684b2514',
                      filter: 'drop-shadow(rgba(249, 224, 184, 0.3) -0.731317px -0.731317px 35.6517px)'
                    }}
                    autoFocus
                  />
                  <div
                    aria-hidden="true"
                    className={`absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none text-sm text-opacity-50 text-start transition-opacity ${homeUrlInput ? 'opacity-0' : 'opacity-100'
                      }`}
                  >
                    <span className="text-[#605A57]/50" style={{ fontFamily: 'monospace' }}>
                      https://firecrawl.dev
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={!homeUrlInput.trim()}
                    className="absolute top-1/2 transform -translate-y-1/2 right-2 flex h-10 items-center justify-center 
                                    rounded-md px-4 text-sm font-medium text-zinc-500 
                                    hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 
                                    focus-visible:ring-zinc-950 focus-visible:ring-offset-2 
                                    active:scale-95 active:bg-zinc-200 
                                    disabled:opacity-50 disabled:cursor-not-allowed 
                                    transition-all duration-200"
                    title={selectedStyle ? `Clone with ${selectedStyle} Style` : 'Clone Website'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <polyline points="9 10 4 15 9 20"></polyline>
                      <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                    </svg>
                  </button>

                </div>

                {showStyleSelector && (
                  <div className="overflow-hidden mt-4">
                    <div className={`transition-all duration-500 ease-out transform ${showStyleSelector ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                      }`}>
                      <div className="bg-black/50 backdrop-blur-sm border border-blue-900/40 rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-white mb-3 font-medium">How do you want your site to look?</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { name: 'Neobrutalist', description: 'Bold colors, thick borders' },
                            { name: 'Glassmorphism', description: 'Frosted glass effects' },
                            { name: 'Minimalist', description: 'Clean and simple' },
                            { name: 'Dark Mode', description: 'Dark theme' },
                            { name: 'Gradient', description: 'Colorful gradients' },
                            { name: 'Retro', description: '80s/90s aesthetic' },
                            { name: 'Modern', description: 'Contemporary design' },
                            { name: 'Monochrome', description: 'Black and white' }
                          ].map((style) => (
                            <button
                              key={style.name}
                              type="button"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const form = e.currentTarget.closest('form');
                                  if (form) {
                                    form.requestSubmit();
                                  }
                                }
                              }}
                              onClick={() => {
                                if (selectedStyle === style.name) {
                                  setSelectedStyle(null);
                                  const currentAdditional = homeContextInput.replace(/^[^,]+theme\s*,?\s*/, '').trim();
                                  setHomeContextInput(currentAdditional);
                                } else {
                                  setSelectedStyle(style.name);
                                  const currentAdditional = homeContextInput.replace(/^[^,]+theme\s*,?\s*/, '').trim();
                                  setHomeContextInput(style.name.toLowerCase() + ' theme' + (currentAdditional ? ', ' + currentAdditional : ''));
                                }
                              }}
                              className={`p-3 rounded-lg border transition-all ${selectedStyle === style.name
                                ? 'border-blue-500 bg-blue-50/10 text-white shadow-sm'
                                : 'border-blue-900/40 bg-black/40 hover:border-blue-700 hover:bg-blue-500/10 text-gray-300'
                                }`}
                            >
                              <div className="text-sm font-medium">{style.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{style.description}</div>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 mb-2">
                          <input
                            type="text"
                            value={(() => {
                              if (!selectedStyle) return homeContextInput;
                              const additional = homeContextInput.replace(new RegExp('^' + selectedStyle.toLowerCase() + ' theme\\s*,?\\s*', 'i'), '');
                              return additional;
                            })()}
                            onChange={(e) => {
                              const additionalContext = e.target.value;
                              if (selectedStyle) {
                                setHomeContextInput(selectedStyle.toLowerCase() + ' theme' + (additionalContext.trim() ? ', ' + additionalContext : ''));
                              } else {
                                setHomeContextInput(additionalContext);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const form = e.currentTarget.closest('form');
                                if (form) {
                                  form.requestSubmit();
                                }
                              }
                            }}
                            placeholder="Add more details: specific features, color preferences..."
                            className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-6 flex items-center justify-center animate-[fadeIn_1s_ease-out]">
                <select
                  value={aiModel}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setAiModel(newModel);
                    const params = new URLSearchParams(searchParams);
                    params.set("model", newModel);
                    if (sandboxData?.sandboxId) {
                      params.set("sandbox", sandboxData.sandboxId);
                    }
                    // CORRECTED ROUTE
                    router.push(`/urlai?${params.toString()}`);
                  }}
                  className="px-4 py-2 text-sm rounded-xl bg-white/10 border border-white/20 text-white shadow-lg backdrop-blur-md 
                            hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ease-in-out"
                >
                  {appConfig.ai.availableModels.map((model) => (
                    <option
                      key={model}
                      value={model}
                      className="bg-gray-900 text-white"
                    >
                      {appConfig.ai.modelDisplayNames[model] || model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recent Clones */}
              {userProjects.length > 0 && (
                <div className="mt-10 animate-[fadeIn_1.2s_ease-out]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Recent Clones</h2>
                    <button
                      onClick={() => setIsProjectsListOpen(!isProjectsListOpen)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {isProjectsListOpen ? 'Show Less' : `View All (${userProjects.length})`}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                    {(isProjectsListOpen ? userProjects : userProjects.slice(0, 6)).map((proj: any) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setHomeScreenFading(true);
                          setTimeout(() => {
                            setShowHomeScreen(false);
                            setHomeScreenFading(false);
                            loadUrlProject(proj.id);
                          }, 400);
                        }}
                        className="text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                          </svg>
                          <span className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                            {proj.name}
                          </span>
                        </div>
                        {proj.sourceUrl && (
                          <p className="text-[10px] text-gray-500 truncate ml-5.5">
                            {proj.sourceUrl.replace(/^https?:\/\//, '').slice(0, 30)}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 ml-5.5">
                          <span className="text-[10px] text-gray-500">
                            {proj.files?.length || 0} files
                          </span>
                          <span className="text-[10px] text-blue-400/70">
                            v{proj.currentVersion || 1}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {new Date(proj.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* page 2 : ai code generator */}
      <header className="bg-black px-4 py-3 border-b border-blue-900/50 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          {/* CORRECTED ROUTE */}
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            size="icon"
            title="Home"
            className="h-9 w-9 text-gray-400 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Model Selector - Right side */}
          <select
            value={aiModel}
            onChange={(e) => {
              const newModel = e.target.value;
              setAiModel(newModel);
              const params = new URLSearchParams(searchParams);
              params.set('model', newModel);
              if (sandboxData?.sandboxId) {
                params.set('sandbox', sandboxData.sandboxId);
              }
              // CORRECTED ROUTE
              router.push(`/urlai?${params.toString()}`);
            }}
            className="px-3 py-1.5 text-sm bg-gray-900 border border-blue-900/50 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            {appConfig.ai.availableModels.map(model => (
              <option key={model} value={model} className="bg-gray-900 text-white">
                {appConfig.ai.modelDisplayNames[model] || model}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => createSandbox()}
            size="icon"
            title="Create new sandbox"
            className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            onClick={reapplyLastGeneration}
            size="icon"
            title="Re-apply last generation"
            disabled={!conversationContext.lastGeneratedCode || !sandboxData}
            className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 disabled:text-gray-600 disabled:hover:bg-transparent"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            onClick={downloadZip}
            disabled={!sandboxData}
            size="icon"
            title="Download your Vite app as ZIP"
            className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 disabled:text-gray-600 disabled:hover:bg-transparent"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </Button>

          {/* --- START: ADDED FOR HISTORY FEATURE --- */}
          <div className="relative" ref={historyPanelRef}>
            <Button variant="ghost" onClick={() => setIsHistoryOpen(prev => !prev)} size="icon" title="Version History" disabled={websiteHistory.length === 0} className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 disabled:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </Button>
            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-blue-900/50 rounded-lg shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-blue-900/50"><h3 className="font-semibold text-white">Version History</h3></div>
                  <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-blue-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {websiteHistory.length > 0 ? (
                      websiteHistory.map(version => (
                        <div key={version.id} className="p-3 border-b border-blue-900/60 last:border-b-0 transition-colors hover:bg-blue-500/10">
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold uppercase tracking-wider ${version.type === 'clone' ? 'text-green-400' : 'text-blue-400'}`}>{version.type}</span>
                            <span className="text-xs text-gray-400">{version.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm text-gray-200 mt-2 leading-snug break-words line-clamp-2" title={version.prompt}>{version.prompt}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              onClick={() => handleLoadVersion(version.id)}
                              className="flex-1 h-8 text-xs bg-blue-700 hover:bg-blue-600 text-white font-semibold"
                            >
                              Load Version
                            </Button>
                            <Button
                              onClick={() => handleDownloadVersion(version.id)}
                              className="flex-1 h-8 text-xs bg-gray-800 hover:bg-gray-700 text-white font-semibold flex items-center justify-center gap-1"
                              title="Download this version as ZIP"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              Download
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
          {/* --- END: ADDED FOR HISTORY FEATURE --- */}

          <div className="inline-flex items-center gap-2 bg-gray-900/80 text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-900/50">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${status.active ? 'bg-green-500 shadow-[0_0_8px_0px_#22c55e]' : 'bg-gray-600'}`} />
            <span id="status-text" className="text-gray-300">{status.text}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Center Panel - AI Chat (1/3 of remaining width) */}
        <div className="flex-1 max-w-[400px] flex flex-col border-r border-blue-900/50 bg-black/50 text-gray-200">
          {conversationContext.scrapedWebsites.length > 0 && (
            <div className="p-4 bg-gray-900/50 border-b border-blue-900/50">
              <div className="flex flex-col gap-2">
                {conversationContext.scrapedWebsites.map((site, idx) => {
                  const metadata = site.content?.metadata || {};
                  const sourceURL = metadata.sourceURL || site.url;
                  const favicon = metadata.favicon || `https://www.google.com/s2/favicons?domain=${new URL(sourceURL).hostname}&sz=32`;
                  const siteName = metadata.ogSiteName || metadata.title || new URL(sourceURL).hostname;

                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <img
                        src={favicon}
                        alt={siteName}
                        className="w-4 h-4 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(sourceURL).hostname}&sz=32`;
                        }}
                      />
                      <a
                        href={sourceURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-blue-400 truncate max-w-[250px] transition-colors"
                        title={sourceURL}
                      >
                        {siteName}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 scrollbar-hide" ref={chatMessagesRef}>
            {chatMessages.map((msg, idx) => {
              const isGenerationComplete = msg.content.includes('Successfully recreated') ||
                msg.content.includes('AI recreation generated!') ||
                msg.content.includes('Code generated!');

              const completedFiles = msg.metadata?.appliedFiles || [];

              return (
                <div key={idx} className="block">
                  <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className="block">
                      <div className={`block rounded-lg px-4 py-2 text-white ${msg.type === 'user' ? 'bg-blue-900/40 ml-auto max-w-[90%]' :
                        msg.type === 'ai' ? 'bg-gray-800 text-gray-200 mr-auto max-w-[90%]' :
                          msg.type === 'system' ? 'bg-gray-800/50 text-gray-300 text-sm border border-gray-700/50' :
                            msg.type === 'command' ? 'bg-gray-900 text-gray-300 font-mono text-sm' :
                              msg.type === 'error' ? 'bg-red-900/50 text-red-200 text-sm border border-red-700/50' :
                                'bg-gray-800 text-gray-300 text-sm'
                        }`}>
                        {msg.type === 'command' ? (
                          <div className="flex items-start gap-2">
                            <span className={`text-xs ${msg.metadata?.commandType === 'input' ? 'text-blue-400' :
                              msg.metadata?.commandType === 'error' ? 'text-red-400' :
                                msg.metadata?.commandType === 'success' ? 'text-green-400' :
                                  'text-gray-400'
                              }`}>
                              {msg.metadata?.commandType === 'input' ? '$' : '>'}
                            </span>
                            <span className="flex-1 whitespace-pre-wrap text-gray-300">{msg.content}</span>
                          </div>
                        ) : msg.type === 'error' ? (
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-red-800/50 rounded-full flex items-center justify-center border border-red-700">
                                <svg className="w-5 h-5 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold mb-1 text-red-100">Build Errors Detected</div>
                              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                              <div className="mt-2 text-xs opacity-70">Press 'F' or click the Fix button above to resolve</div>
                            </div>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {msg.metadata?.appliedFiles && msg.metadata.appliedFiles.length > 0 && (
                        <div className="mt-2 inline-block bg-gray-900/80 backdrop-blur-sm border border-blue-900/30 rounded-lg p-3">
                          <div className="text-xs font-medium mb-2 text-gray-400">
                            {msg.content.includes('Applied') ? 'Files Updated:' : 'Generated Files:'}
                          </div>
                          <div className="flex flex-wrap items-start gap-1.5">
                            {msg.metadata.appliedFiles.map((filePath, fileIdx) => {
                              const fileName = filePath.split('/').pop() || filePath;
                              return (
                                <div
                                  key={`applied-${fileIdx}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-800 text-gray-300 rounded-md text-xs animate-fade-in-up"
                                  style={{ animationDelay: `${fileIdx * 30}ms` }}
                                >
                                  {getFileIcon(fileName)}
                                  {fileName}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isGenerationComplete && generationProgress.files.length > 0 && idx === chatMessages.length - 1 && !msg.metadata?.appliedFiles && !chatMessages.some(m => m.metadata?.appliedFiles) && (
                        <div className="mt-2 inline-block bg-gray-900/80 backdrop-blur-sm border border-blue-900/30 rounded-lg p-3">
                          <div className="text-xs font-medium mb-2 text-gray-400">Generated Files:</div>
                          <div className="flex flex-wrap items-start gap-1.5">
                            {generationProgress.files.map((file, fileIdx) => (
                              <div
                                key={`complete-${fileIdx}`}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-800 text-gray-300 rounded-md text-xs animate-fade-in-up"
                                style={{ animationDelay: `${fileIdx * 30}ms` }}
                              >
                                {getFileIcon(file.path)}
                                {file.path.split('/').pop()}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {codeApplicationState.stage && (
              <CodeApplicationProgress state={codeApplicationState} />
            )}

            {generationProgress.isGenerating && (
              <div className="inline-block bg-gray-900/80 backdrop-blur-sm border border-blue-900/30 rounded-lg p-3">
                <div className="text-sm font-medium mb-2 text-blue-300">
                  {generationProgress.status}
                </div>
                <div className="flex flex-wrap items-start gap-1">
                  {generationProgress.files.map((file, idx) => (
                    <div
                      key={`file-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-300 rounded-md text-xs animate-fade-in-up"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      {file.path.split('/').pop()}
                    </div>
                  ))}

                  {generationProgress.currentFile && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/70 text-gray-300 rounded-md text-xs animate-pulse"
                      style={{ animationDelay: `${generationProgress.files.length * 30}ms` }}>
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      {generationProgress.currentFile.path.split('/').pop()}
                    </div>
                  )}
                </div>

                {generationProgress.streamedCode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 border-t border-blue-900/30 pt-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-gray-400">AI Response Stream</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-blue-900/50 to-transparent" />
                    </div>
                    <div className="bg-[#0d1117] border border-gray-800 rounded max-h-32 overflow-y-auto scrollbar-hide">
                      <SyntaxHighlighter
                        language="jsx"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '0.75rem',
                          fontSize: '11px',
                          lineHeight: '1.5',
                          background: 'transparent',
                          maxHeight: '8rem',
                          overflow: 'hidden'
                        }}
                      >
                        {(() => {
                          const lastContent = generationProgress.streamedCode.slice(-1000);
                          const startIndex = lastContent.indexOf('<');
                          return startIndex !== -1 ? lastContent.slice(startIndex) : lastContent;
                        })()}
                      </SyntaxHighlighter>
                      <span className="inline-block w-2 h-3 bg-blue-400 ml-3 mb-3 animate-pulse" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-blue-900/50 bg-black">
            <div className="relative">
              <Textarea
                className="min-h-[60px] pr-12 resize-y bg-gray-950 text-gray-100 placeholder-gray-600 border border-blue-800/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-300 shadow-md hover:border-blue-700"
                placeholder="Ask me to make a change..."
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                rows={3}
              />
              <button
                onClick={sendChatMessage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-lg shadow-lg hover:from-blue-500 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                title="Send message (Enter)"
                disabled={!aiChatInput.trim()}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview or Generation (2/3 of remaining width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-black border-b border-blue-900/50 flex justify-between items-center">
            {/* START: Replace this entire div block */}
            <div className="flex items-center gap-4">
              {/* --- UPDATED Toggle Button UI --- */}
              <div className="relative flex bg-gray-900 rounded-lg p-1 border border-blue-900/50">
                {/* Code Button */}
                <button
                  onClick={() => setActiveTab('generation')}
                  className={`relative z-10 p-2 rounded-md transition-colors duration-300 ${activeTab === 'generation' ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  title="Code"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  {activeTab === 'generation' && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 bg-blue-600/50 rounded-md"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                  )}
                </button>
                {/* Preview Button */}
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`relative z-10 p-2 rounded-md transition-colors duration-300 ${activeTab === 'preview' ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  title="Preview"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {activeTab === 'preview' && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 bg-blue-600/50 rounded-md"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                  )}
                </button>
              </div>
            </div>
            {/* END: Replacement block ends here */}

            <div className="flex gap-2 items-center">
              {activeTab === 'generation' && (generationProgress.isGenerating || generationProgress.files.length > 0) && (
                <div className="flex items-center gap-3">
                  {!generationProgress.isEdit && (
                    <div className="text-gray-400 text-sm">
                      {generationProgress.files.length} files generated
                    </div>
                  )}
                  <div className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all duration-200 bg-gray-900/80 text-gray-300 border border-blue-900/50 h-8 px-3 py-1 text-sm gap-2`}>
                    {generationProgress.isGenerating ? (
                      <>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                        {generationProgress.isEdit ? 'Editing code' : 'Live generation'}
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        COMPLETE
                      </>
                    )}
                  </div>
                </div>
              )}
              {sandboxData && !generationProgress.isGenerating && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
                    asChild
                  >
                    <a
                      href={sandboxData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new tab"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden bg-black">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div >
  );
}