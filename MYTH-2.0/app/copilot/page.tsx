'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const OpenClawChat = dynamic(
    () => import('../saas_copilot/components/OpenClawChat'),
    {
        ssr: false,
        loading: () => (
            <div className="h-screen w-full bg-[var(--color-background)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[var(--color-muted-foreground)] text-sm">Loading MYTH Copilot...</span>
                </div>
            </div>
        ),
    }
);

export default function CopilotPage() {
    const router = useRouter();
    return <OpenClawChat onBack={() => router.push('/dashboard')} />;
}
