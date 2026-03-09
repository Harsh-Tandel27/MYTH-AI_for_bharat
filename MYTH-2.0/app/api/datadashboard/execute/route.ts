import { NextRequest } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    try {
        const { sandboxId, command, cwd, isBackground } = await req.json();

        if (!sandboxId || !command) {
            return new Response(JSON.stringify({ error: 'Sandbox ID and command are required' }), { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    console.log(`[Dashboard Execute] Connecting to ${sandboxId}, running: ${command} (BG: ${isBackground})`);
                    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: `Executing: ${command}` })}\n\n`));

                    const pythonScript = `
import subprocess
import os
import sys
import time

os.chdir('${cwd || '/home/user'}')

# Force unbuffered output
os.environ['PYTHONUNBUFFERED'] = '1'

cmd = '${command.replace(/'/g, "\\'")}'
print(f"Starting: {cmd}")

if ${isBackground ? 'True' : 'False'}:
    # Background Mode (Streamlit)
    process = subprocess.Popen(
        cmd, 
        shell=True, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT, # Merge stderr into stdout
        text=True,
        bufsize=1,
        env=os.environ
    )
    
    print(f"Process started with PID: {process.pid}")
    
    # Monitor for startup success (URL) or failure
    # Streamlit can be slow to start in limited envs, giving it 45s
    start_time = time.time()
    while time.time() - start_time < 45:
        line = process.stdout.readline()
        if not line:
            break
        print(line, end='', flush=True)
        
        # Check for various success indicators
        if 'Network URL' in line or 'External URL' in line or 'view your Streamlit app' in line:
            print("Server Ready Detected")
            break
            
    # Check if process died
    if process.poll() is not None:
        print(f"Process died unexpectedly with code {process.returncode}")
            
    # We exit the Python script, but the subprocess remains running
else:
    # Foreground Mode (Pip)
    process = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        env=os.environ
    )
    print(process.stdout)
    print(process.stderr, file=sys.stderr)
`;

                    // execute runCode
                    // Note: In this SDK version, runCode buffers output. 
                    // We accept that 'pip install' might show logs at the end.
                    const result = await sandbox.runCode(pythonScript);

                    if (result.logs.stdout.length > 0) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: result.logs.stdout.join('\n') })}\n\n`));
                    }
                    if (result.logs.stderr.length > 0) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', content: result.logs.stderr.join('\n') })}\n\n`));
                    }

                    if (result.error) {
                        throw new Error(result.error.value || result.error.name);
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', exitCode: 0 })}\n\n`));
                    controller.close();
                } catch (error: any) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
