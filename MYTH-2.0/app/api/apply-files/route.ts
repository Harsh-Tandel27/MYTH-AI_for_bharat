import { Sandbox } from '@e2b/code-interpreter';
import { NextRequest } from 'next/server';

export const maxDuration = 300;

interface ApplyFile {
    path: string;
    content: string;
    layer: 'frontend' | 'backend';
}

export async function POST(req: NextRequest) {
    try {
        const { frontendSandboxId, backendSandboxId, files } = await req.json();

        const frontendFiles = files.filter((f: ApplyFile) => f.layer === 'frontend');
        const backendFiles = files.filter((f: ApplyFile) => f.layer === 'backend');

        console.log('[Apply Files] Budget:', {
            frontendFiles: frontendFiles.length,
            backendFiles: backendFiles.length
        });

        let appliedFiles = { frontend: 0, backend: 0 };

        // Handle frontend files if they exist and id is provided
        if (frontendFiles.length > 0) {
            if (!frontendSandboxId) throw new Error('Frontend sandbox ID required for frontend files');
            console.log('[Apply Files] Connecting to frontend sandbox:', frontendSandboxId);
            const frontendSandbox = await Sandbox.connect(frontendSandboxId, { apiKey: process.env.E2B_API_KEY });
            for (const file of frontendFiles) {
                const fullPath = file.path.startsWith('/') ? file.path : `/home/user/app/${file.path}`;
                console.log('[Frontend] Writing:', fullPath);
                await frontendSandbox.files.write(fullPath, file.content);
                appliedFiles.frontend++;
            }
        }

        // Handle backend files if they exist and id is provided
        if (backendFiles.length > 0) {
            if (!backendSandboxId) throw new Error('Backend sandbox ID required for backend files');
            console.log('[Apply Files] Connecting to backend sandbox:', backendSandboxId);
            const backendSandbox = await Sandbox.connect(backendSandboxId, { apiKey: process.env.E2B_API_KEY });
            for (const file of backendFiles) {
                const fullPath = file.path.startsWith('/') ? file.path : `/home/user/backend/${file.path}`;
                console.log('[Backend] Writing:', fullPath);
                await backendSandbox.files.write(fullPath, file.content);
                appliedFiles.backend++;
            }
        }

        console.log('[Apply Files] Complete!', appliedFiles);

        return new Response(JSON.stringify({
            success: true,
            applied: appliedFiles,
            message: `Applied ${appliedFiles.frontend} frontend and ${appliedFiles.backend} backend files`
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Apply Files] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to apply files' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
