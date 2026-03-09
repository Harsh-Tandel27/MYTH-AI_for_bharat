import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export async function POST(req: NextRequest) {
    try {
        const { sandboxId } = await req.json();

        if (!sandboxId) {
            return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 });
        }

        console.log(`[restart-frontend] Connecting to sandbox: ${sandboxId}`);
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        console.log('[restart-frontend] Restarting Vite dev server...');
        await sandbox.runCode(`
import subprocess
import os
import time

os.chdir('/home/user/app')

# Kill any existing Vite processes
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
time.sleep(1)

# Start Vite dev server
env = os.environ.copy()
env['FORCE_COLOR'] = '0'

process = subprocess.Popen(
    ['npm', 'run', 'dev'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    env=env
)
print(f'✓ Vite dev server started with PID: {process.pid}')
`);

        return NextResponse.json({ success: true, message: 'Vite server restart triggered' });

    } catch (error: any) {
        console.error('[restart-frontend] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
