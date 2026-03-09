'use client';

import dynamic from 'next/dynamic';

// Dynamically import WorkflowCanvas to avoid SSR issues with React Flow
const WorkflowCanvas = dynamic(
    () => import('./components/WorkflowCanvas'),
    {
        ssr: false,
        loading: () => (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="text-gray-500 text-sm">Loading workflow canvas...</div>
            </div>
        )
    }
);

export default function AgentAI() {
    return (
        <div className="h-screen w-full bg-black">
            <WorkflowCanvas />
        </div>
    );
}