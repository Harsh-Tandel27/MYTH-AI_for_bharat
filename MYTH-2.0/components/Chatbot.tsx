import { AnimatePresence, motion, Variants } from 'framer-motion'
import { Bot, SendHorizonal, X } from 'lucide-react'
import React, { useState } from 'react'

const Chatbot = () => {
    const [isChatOpen, setIsChatOpen] = useState(false); // State for the new chatbot

    // Animation variants for the chat window
    const chatWindowVariants: Variants = {
        hidden: { opacity: 0, y: 40, scale: 0.95, transition: { type: 'spring', damping: 20, stiffness: 150 } },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 150 } },
    };
    return (
        <div>
            <div className="fixed bottom-20 right-4 z-50">
                {/* Chat Window */}
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.div
                            variants={chatWindowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="w-[340px] h-[450px] mb-4 bg-gray-950/60 border border-white/20 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden origin-bottom-right"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Bot className="h-7 w-7 text-indigo-400" />
                                        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-gray-950" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">MYTH AI</h3>
                                        <p className="text-xs text-gray-400">Typically replies instantly</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsChatOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            {/* Messages Area */}
                            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-indigo-950/70 p-3 text-sm text-gray-200">
                                        Hello! How can I help you reimagine your web project today?
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] rounded-2xl rounded-br-none bg-gray-800/80 p-3 text-sm text-white">
                                        Can you tell me more about the Enterprise plan?
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-indigo-950/70 p-3 text-sm text-gray-200">
                                        Of course! The Enterprise plan is designed for teams and includes features like on-premise deployment, dedicated support, and custom integrations. Would you like to connect with our sales team?
                                    </div>
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-white/10 flex-shrink-0">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="w-full bg-gray-900/80 border border-white/10 rounded-full py-2 pl-4 pr-12 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors">
                                        <SendHorizonal className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Action Button (FAB) */}
                <motion.button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isChatOpen ? 'x' : 'bot'}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isChatOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
                        </motion.div>
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    )
}

export default Chatbot
