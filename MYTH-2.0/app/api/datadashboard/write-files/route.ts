import { Sandbox } from '@e2b/code-interpreter';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { sandboxId, files } = await req.json();

        if (!sandboxId) throw new Error('Sandbox ID is required');
        if (!files || !Array.isArray(files)) throw new Error('Files array is required');

        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        for (const file of files) {
            const { path, content } = file;
            if (!path || content === undefined) continue;

            // Default to /home/user for dashboards
            const fullPath = path.startsWith('/') ? path : `/home/user/${path}`;
            await (sandbox as any).files.write(fullPath, content);
        }

        return NextResponse.json({ success: true, message: `Applied ${files.length} files` });
    } catch (error: any) {
        console.error('[Dashboard Write Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
