'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MichiBot from "@/components/MichiBot";
import { appConfig } from '@/config/app.config';

// Interface for props passed from the parent component
interface UrlMobileViewProps {
  homeUrlInput: string;
  setHomeUrlInput: (value: string) => void;
  homeContextInput: string;
  setHomeContextInput: (value: string) => void;
  handleHomeScreenSubmit: (e: React.FormEvent) => Promise<void>;
  generationProgress: any;
  loadingStage: 'gathering' | 'planning' | 'generating' | null;
  urlScreenshot: string | null;
  sandboxData: { url: string } | null;
  aiChatInput: string;
  setAiChatInput: (value: string) => void;
  sendChatMessage: () => Promise<void>;
  getFileIcon: (fileName: string) => React.ReactNode;
  status: { text: string; active: boolean };
  aiModel: string;
  setAiModel: (model: string) => void;
  downloadZip: () => Promise<void>;
  goHome: () => void; // This will now be used for a full reset
}

export default function UrlMobileView({
  homeUrlInput,
  setHomeUrlInput,
  homeContextInput,
  setHomeContextInput,
  handleHomeScreenSubmit,
  generationProgress,
  loadingStage,
  urlScreenshot,
  sandboxData,
  aiChatInput,
  setAiChatInput,
  sendChatMessage,
  getFileIcon,
  status,
  aiModel,
  setAiModel,
  downloadZip,
  goHome, // The parent function to reset
}: UrlMobileViewProps) {
  
  // --- KEY FIX: INTERNAL STATE TO CONTROL THE VIEW ---
  // This ensures the component always starts on the 'input' screen.
  const [viewStage, setViewStage] = useState<'input' | 'generating' | 'complete'>('input');

  // This effect watches the props from the parent to decide when to switch from 'generating' to 'complete'.
  useEffect(() => {
    // Only transition to 'complete' if we are currently in the 'generating' stage
    // and the parent component signals that the sandbox is ready and generation is no longer active.
    if (viewStage === 'generating' && sandboxData?.url && !generationProgress.isGenerating && !loadingStage) {
      setViewStage('complete');
    }
  }, [sandboxData, generationProgress.isGenerating, loadingStage, viewStage]);

  // Wrapper function for the form submission.
  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeUrlInput.trim()) return;

    // 1. Change our internal state to show the 'generating' screen.
    setViewStage('generating');

    // 2. Call the parent's submit handler to kick off the backend process.
    await handleHomeScreenSubmit(e);
  };

  const botVariants = {
    initial: { top: '20%', scale: 0.8 },
    generating: { top: '8%', scale: 0.4 },
    complete: { top: '8%', scale: 0.4 },
  } as const;

  const getStatusText = () => {
    if (viewStage === 'generating') {
      return generationProgress.status || loadingStage || 'Initializing...';
    }
    if (viewStage === 'complete') {
      return "Recreation Complete!";
    }
    return "Re-imagine any website, in seconds.";
  };

  return (
    <div className="font-sans bg-black text-gray-200 h-screen w-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 p-3 flex items-center justify-between z-20">
        <Button
          onClick={goHome} // Use the prop to trigger a full reset from the parent
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Button>
        
        <AnimatePresence>
        {viewStage !== 'input' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <Button
              onClick={downloadZip}
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-gray-400 hover:bg-white/10 hover:text-white"
              disabled={!sandboxData}
            >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
            </Button>
            <div className="inline-flex items-center gap-2 bg-gray-900/80 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-900/50">
              <div className={`w-2 h-2 rounded-full transition-colors ${status.active ? 'bg-green-500 shadow-[0_0_8px_0px_#22c55e]' : 'bg-gray-600'}`} />
              <span className="text-gray-300">{status.text}</span>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </header>

      <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-[200px] h-[200px] z-10"
          variants={botVariants}
          animate={viewStage}
          initial="initial"
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
          <MichiBot showARButton={viewStage === 'input'} />
      </motion.div>

      <main className="flex-1 flex flex-col justify-end overflow-hidden pt-16">
        <AnimatePresence mode="wait">
          {/* --- Screen 1: Initial Input Form --- */}
          {viewStage === 'input' && (
             <motion.div
               key="input-form"
               initial={{ y: '100%' }}
               animate={{ y: '0%' }}
               exit={{ y: '100%' }}
               transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
               className="bg-gray-950/50 backdrop-blur-md border-t border-blue-900/50 rounded-t-3xl p-6 flex flex-col justify-end"
             >
                <div className="text-center pt-20 mb-6">
                    <h1 className="text-4xl text-white font-bold tracking-tight">MYTH</h1>
                    <p className="text-center text-gray-300 mt-2">{getStatusText()}</p>
                </div>
                <form onSubmit={handleMobileSubmit} className="flex flex-col gap-4">
                    <input type="text" value={homeUrlInput} onChange={(e) => setHomeUrlInput(e.target.value)} placeholder="Enter a website URL" className="h-12 w-full text-center bg-black/50 border border-blue-800/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-white placeholder-gray-500" />
                    <input type="text" value={homeContextInput} onChange={(e) => setHomeContextInput(e.target.value)} placeholder="Optional: Theme, features..." className="h-12 w-full text-center bg-black/50 border border-blue-800/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-white placeholder-gray-500" />
                    <Button type="submit" disabled={!homeUrlInput.trim()} className="w-full h-12 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl text-lg font-bold disabled:opacity-50">Generate</Button>
                </form>
                <div className="mt-4 flex justify-center">
                    <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="px-3 py-1.5 text-sm bg-black border border-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {appConfig.ai.availableModels.map(model => ( <option key={model} value={model}>{appConfig.ai.modelDisplayNames[model] || model}</option>))}
                    </select>
                </div>
             </motion.div>
          )}

          {/* --- Screen 2: Generation Progress --- */}
          {viewStage === 'generating' && (
              <motion.div
                  key="generating-view"
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-gray-950/50 backdrop-blur-md border-t border-blue-900/50 rounded-t-3xl p-6 flex flex-col"
              >
                  <div className="flex-shrink-0 text-center mb-4 pt-12">
                     <p className="text-gray-300 font-medium">{getStatusText()}</p>
                     <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-3 relative">
                       <div className="absolute inset-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 w-full animate-flow" />
                     </div>
                  </div>
                  {urlScreenshot && (
                    <div className="flex-shrink-0 rounded-xl overflow-hidden my-4 border border-blue-900/50 shadow-lg">
                      <img src={urlScreenshot} alt="Website preview" className="w-full h-auto object-cover" />
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    <p className="text-sm font-medium text-gray-400 mb-2">Generated Files:</p>
                    {generationProgress.files.map((file: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-black/40 rounded-lg text-sm">
                        <span className="text-green-400">✓</span>
                        {getFileIcon(file.path)}
                        <span>{file.path.split('/').pop()}</span>
                      </div>
                    ))}
                    {generationProgress.currentFile && (
                        <div className="flex items-center gap-3 p-2 bg-black/40 rounded-lg text-sm animate-pulse">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          {getFileIcon(generationProgress.currentFile.path)}
                          <span>{generationProgress.currentFile.path.split('/').pop()}</span>
                        </div>
                    )}
                  </div>
              </motion.div>
          )}

          {/* --- Screen 3: Complete Preview & Chat --- */}
          {viewStage === 'complete' && (
             <motion.div
                  key="complete-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="h-full flex flex-col pt-12"
             >
                 <div className="flex-1 relative border-4 border-gray-700 rounded-3xl m-2 mb-0 overflow-hidden shadow-2xl shadow-blue-500/20">
                     <iframe src={sandboxData.url} className="w-full h-full bg-white" title="Preview" sandbox="allow-scripts allow-same-origin allow-forms"/>
                 </div>
                 <div className="p-4">
                     <div className="relative">
                        <Textarea
                            className="w-full pr-12 resize-none bg-gray-950 text-gray-100 placeholder-gray-600 border border-blue-800/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="Ask for changes..."
                            value={aiChatInput}
                            onChange={(e) => setAiChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
                            }}
                            rows={1}
                         />
                         <button onClick={sendChatMessage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg" disabled={!aiChatInput.trim()}>
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                         </button>
                     </div>
                 </div>
             </motion.div>
          )}
          </AnimatePresence>
        </main>
    </div>
  );
}