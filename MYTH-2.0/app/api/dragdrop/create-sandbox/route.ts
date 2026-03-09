import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import { appConfig } from '@/config/app.config';

// Separate global state for drag-drop builder — does NOT touch the main sandbox
declare global {
    var dragDropSandbox: any;
    var dragDropSandboxData: { sandboxId: string; url: string } | null;
}

export async function POST() {
    let sandbox: any = null;

    try {
        console.log('[dragdrop/create-sandbox] Creating sandbox for drag-drop builder...');

        // Kill existing drag-drop sandbox if any
        if (global.dragDropSandbox) {
            console.log('[dragdrop/create-sandbox] Killing existing drag-drop sandbox...');
            try {
                await global.dragDropSandbox.kill();
            } catch (e) {
                console.error('[dragdrop] Failed to close existing sandbox:', e);
            }
            global.dragDropSandbox = null;
            global.dragDropSandboxData = null;
        }

        // Create a simple sandbox for serving static HTML
        sandbox = await Sandbox.create({
            apiKey: process.env.E2B_API_KEY,
            timeoutMs: appConfig.e2b.timeoutMs,
        });

        const sandboxId = (sandbox as any).sandboxId || Date.now().toString();
        const host = (sandbox as any).getHost(8080);

        console.log(`[dragdrop/create-sandbox] Sandbox created: ${sandboxId}`);

        // Set up a simple static file server using Python http.server
        await sandbox.runCode(`
import os
os.makedirs('/home/user/site', exist_ok=True)

# Create a placeholder index.html
with open('/home/user/site/index.html', 'w') as f:
    f.write('<html><body style="background:#050505;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif"><h2>Ready to deploy...</h2></body></html>')

print('Site directory ready')
    `);

        // Start a simple HTTP server on port 8080
        await sandbox.runCode(`
import subprocess, os

os.chdir('/home/user/site')
process = subprocess.Popen(
    ['python3', '-m', 'http.server', '8080'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)
print(f'HTTP server started on port 8080, PID: {process.pid}')
    `);

        // Give the server a moment to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Store globally (separate from main sandbox)
        global.dragDropSandbox = sandbox;
        global.dragDropSandboxData = {
            sandboxId,
            url: `https://${host}`,
        };

        console.log('[dragdrop/create-sandbox] Ready at:', `https://${host}`);

        return NextResponse.json({
            success: true,
            sandboxId,
            url: `https://${host}`,
        });
    } catch (error) {
        console.error('[dragdrop/create-sandbox] Error:', error);

        if (sandbox) {
            try { await sandbox.kill(); } catch (_) { }
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create sandbox' },
            { status: 500 }
        );
    }
}
