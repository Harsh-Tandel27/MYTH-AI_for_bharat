import { Sandbox } from '@e2b/code-interpreter';
import { NextRequest } from 'next/server';

export const maxDuration = 300;

interface ApplyFile {
    path: string;
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const { sandboxId, files } = await req.json();

        if (!sandboxId || !files || !Array.isArray(files)) {
            return new Response(JSON.stringify({ error: 'sandboxId and files array are required' }), { status: 400 });
        }

        console.log(`[Apply Files] ApplicationAI: Writing ${files.length} files to sandbox ${sandboxId}`);

        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        for (const file of files) {
            // All files go into the mobile-app subdirectory
            const fullPath = `/home/user/mobile-app/${file.path}`;
            console.log(`[Apply Files] Writing: ${fullPath}`);

            if (file.path === 'package.json') {
                console.log(`[Apply Files] [DIAGNOSTIC] package.json content:\n${file.content}`);
            }

            // Ensure directory exists (mkdir -p logic handled by e2b files.write if needed, but let's be safe for deep paths)
            // Actually, sandbox.files.write should handle nested directories automatically if they don't exist.
            await sandbox.files.write(fullPath, file.content);
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Applied ${files.length} files successfully`
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
