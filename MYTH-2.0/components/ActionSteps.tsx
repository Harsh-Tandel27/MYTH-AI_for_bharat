'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    Check,
    Loader2,
    Circle,
    Globe,
    Search,
    FileCode,
    Package,
    Terminal,
    Sparkles,
    AlertCircle
} from 'lucide-react';

export type ActionStatus = 'pending' | 'running' | 'completed' | 'error';

export interface ActionStep {
    id: string;
    type: 'web_request' | 'web_search' | 'file_write' | 'npm_install' | 'command' | 'thinking' | 'plan';
    label: string;
    detail?: string; // e.g., file path, package names
    status: ActionStatus;
    children?: ActionStep[];
}

interface ActionStepsProps {
    steps: ActionStep[];
    isExpanded?: boolean;
    onToggle?: () => void;
    title?: string;
}

const stepIcons: Record<ActionStep['type'], React.ComponentType<{ className?: string }>> = {
    web_request: Globe,
    web_search: Search,
    file_write: FileCode,
    npm_install: Package,
    command: Terminal,
    thinking: Sparkles,
    plan: Circle,
};

function getStatusIcon(status: ActionStatus) {
    switch (status) {
        case 'completed':
            return <Check className="w-4 h-4 text-green-400" />;
        case 'running':
            return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-400" />;
        default:
            return <Circle className="w-4 h-4 text-gray-500" />;
    }
}

function ActionStepItem({ step, indent = 0 }: { step: ActionStep; indent?: number }) {
    const Icon = stepIcons[step.type] || Circle;
    const isRunning = step.status === 'running';
    const isCompleted = step.status === 'completed';

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-start gap-3 py-2 ${indent > 0 ? 'ml-6 border-l border-gray-700/50 pl-4' : ''}`}
        >
            {/* Status indicator */}
            <div className="mt-0.5 flex-shrink-0">
                {getStatusIcon(step.status)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isRunning ? 'text-blue-400' : isCompleted ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-sm ${isRunning ? 'text-white font-medium' : isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                        {step.label}
                    </span>
                </div>

                {/* Detail (file path, package names, etc.) */}
                {step.detail && isRunning && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1 ml-6"
                    >
                        <code className="text-xs font-mono bg-gray-800/80 text-gray-300 px-2 py-1 rounded">
                            {step.detail}
                        </code>
                    </motion.div>
                )}

                {/* Nested children */}
                {step.children && step.children.length > 0 && (
                    <div className="mt-1">
                        {step.children.map((child) => (
                            <ActionStepItem key={child.id} step={child} indent={indent + 1} />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function ActionSteps({ steps, isExpanded = true, onToggle, title }: ActionStepsProps) {
    const [localExpanded, setLocalExpanded] = useState(isExpanded);
    const expanded = onToggle ? isExpanded : localExpanded;
    const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

    const completedCount = steps.filter(s => s.status === 'completed').length;
    const runningStep = steps.find(s => s.status === 'running');

    return (
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {runningStep ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : completedCount === steps.length && steps.length > 0 ? (
                        <Check className="w-4 h-4 text-green-400" />
                    ) : (
                        <Circle className="w-4 h-4 text-gray-500" />
                    )}

                    <span className="text-sm font-medium text-white">
                        {title || (runningStep ? runningStep.label : `${completedCount} actions taken`)}
                    </span>
                </div>

                <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Steps list */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-700/50"
                    >
                        <div className="p-3 space-y-1">
                            {steps.map((step) => (
                                <ActionStepItem key={step.id} step={step} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper component for the "Plan" view like in Bolt
export function PlanView({
    planSteps
}: {
    planSteps: Array<{ id: string; label: string; status: ActionStatus; detail?: string }>
}) {
    return (
        <div className="space-y-1 p-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-gray-800 rounded">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                </div>
                <span className="text-sm font-medium text-white">Plan</span>
            </div>

            {planSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3 py-2">
                    {/* Status icon */}
                    {getStatusIcon(step.status)}

                    {/* Content */}
                    <div className="flex-1">
                        <span className={`text-sm ${step.status === 'running' ? 'text-white' :
                                step.status === 'completed' ? 'text-gray-400' :
                                    'text-gray-500'
                            }`}>
                            {step.label}
                        </span>

                        {/* Sub-detail for running step */}
                        {step.status === 'running' && step.detail && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2"
                            >
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <FileCode className="w-4 h-4" />
                                    <span>Writing</span>
                                </div>
                                <code className="text-sm font-mono text-gray-300 bg-gray-900/60 px-2 py-0.5 rounded">
                                    {step.detail}
                                </code>
                            </motion.div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
