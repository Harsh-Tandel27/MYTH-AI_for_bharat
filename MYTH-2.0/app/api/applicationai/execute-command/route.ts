import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { sandboxId, command, cwd = '/home/user' } = await req.json();

                if (!sandboxId || !command) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'Missing sandboxId or command' })}\n\n`));
                    controller.close();
                    return;
                }

                // We need to use the global map to find the sandbox object
                // NOTE: In edge runtime, global variables might not persist as expected.
                // For E2B, we usually need the actual sandbox instance or to use their REST API if available.
                // However, the project pattern uses global maps. Let's try to reach it.
                // If it's not available, we might need a different orchestration or to use sandboxId directly if E2B allows connecting by ID.

                // Re-connecting to sandbox by ID is possible in E2B
                const { Sandbox } = await import('@e2b/code-interpreter');
                const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

                const proc = await sandbox.commands.run(command, {
                    cwd,
                    onStdout: (data) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`));
                    },
                    onStderr: (data) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`));
                    }
                });

                await proc;

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', exitCode: proc.exitCode })}\n\n`));
                controller.close();

            } catch (error: any) {
                console.error('[applicationai/execute-command] Error:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
