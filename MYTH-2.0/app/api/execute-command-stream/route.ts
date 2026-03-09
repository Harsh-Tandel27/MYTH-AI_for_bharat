import { NextRequest } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    try {
        const { sandboxId, command, cwd } = await req.json();

        if (!sandboxId || !command) {
            return new Response(JSON.stringify({ error: 'Sandbox ID and command are required' }), { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    console.log(`[execute-command] Connecting to ${sandboxId}, running: ${command}`);
                    const sandbox = await Sandbox.connect(sandboxId);

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: `Executing: ${command}` })}\n\n`));

                    const process = await sandbox.process.start({
                        cmd: command,
                        cwd: cwd || '/home/user/backend', // Default to backend for now
                        onStdout: (data) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`));
                        },
                        onStderr: (data) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`));
                        }
                    });

                    const exitCode = await process.wait();

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', exitCode })}\n\n`));
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
