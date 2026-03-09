import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export async function GET(req: NextRequest) {
    try {
        const sandboxId = req.nextUrl.searchParams.get('sandboxId');
        if (!sandboxId) return NextResponse.json({ error: 'Missing sandboxId' }, { status: 400 });

        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        // Recursive file listing is complex with E2B basic API, usually we list known directories
        // or run a command like 'find . -maxdepth 3 -not -path "*/node_modules/*"'
        const proc = await sandbox.commands.run('find mobile-app -maxdepth 4 -not -path "*/node_modules/*" -not -path "*/.*" -type f');
        const files = proc.stdout.split('\n').filter(Boolean);

        const fileContents = await Promise.all(files.map(async (path) => {
            const content = await sandbox.files.read(path);
            return { path: path.replace('mobile-app/', ''), content, type: path.split('.').pop() || 'text' };
        }));

        return NextResponse.json({ success: true, files: fileContents });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
