import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export async function POST(req: NextRequest) {
    try {
        const { sandboxId, files } = await req.json();

        if (!sandboxId || !files) {
            return NextResponse.json({ error: 'Sandbox ID and files are required' }, { status: 400 });
        }

        console.log(`[apply-frontend-files] Connecting to sandbox: ${sandboxId}`);

        let sandbox;
        let retries = 3;
        while (retries > 0) {
            try {
                sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
                break;
            } catch (connectErr: any) {
                retries--;
                console.error(`[apply-frontend-files] Connect failed (${retries} retries left):`, connectErr.message);
                if (retries === 0) throw new Error(`Failed to connect to sandbox after 3 attempts: ${connectErr.message}`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        console.log(`[apply-frontend-files] Applying ${files.length} files...`);
        let appliedCount = 0;
        const errors: string[] = [];

        for (const file of files) {
            try {
                const normalizedPath = file.path.startsWith('/') ? file.path : `/home/user/app/${file.path}`;
                console.log(`[apply-frontend-files] Writing: ${normalizedPath}`);

                // Ensure directory exists
                const dir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
                if (dir) {
                    await sandbox!.runCode(`import os; os.makedirs("${dir}", exist_ok=True)`);
                }

                await sandbox!.files.write(normalizedPath, file.content);
                appliedCount++;
            } catch (fileErr: any) {
                console.error(`[apply-frontend-files] Failed to write ${file.path}:`, fileErr.message);
                errors.push(`${file.path}: ${fileErr.message}`);
            }
        }

        // Trigger Vite rebuild by touching a file if index.css or App.jsx changed
        const triggerRebuild = files.some((f: any) => f.path.includes('index.css') || f.path.includes('App.jsx'));
        if (triggerRebuild) {
            console.log('[apply-frontend-files] Triggering Vite rebuild...');
            await sandbox!.runCode(`import os; import time; os.utime('/home/user/app/src/index.css', None) if os.path.exists('/home/user/app/src/index.css') else None`);
        }

        if (errors.length > 0 && appliedCount === 0) {
            return NextResponse.json({ success: false, error: `All ${files.length} files failed: ${errors[0]}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `${appliedCount}/${files.length} files applied successfully`,
            warnings: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('[apply-frontend-files] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
