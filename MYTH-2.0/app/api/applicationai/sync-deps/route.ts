import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { sandboxId } = await req.json();

                if (!sandboxId) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'Missing sandboxId' })}\n\n`));
                    controller.close();
                    return;
                }

                const { Sandbox } = await import('@e2b/code-interpreter');
                const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: `\n\x1b[36m[Sync] Synchronizing dependencies...\x1b[0m\n` })}\n\n`));

                const proc = await sandbox.commands.run('npm install --legacy-peer-deps', {
                    cwd: '/home/user/mobile-app',
                    onStdout: (data) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`));
                    },
                    onStderr: (data) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`));
                    }
                });

                await proc;

                if (proc.exitCode === 0) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', exitCode: 0 })}\n\n`));
                } else {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: `Dependency sync failed with exit code ${proc.exitCode}` })}\n\n`));
                }
                controller.close();

            } catch (error: any) {
                console.error('[applicationai/sync-deps] Error:', error);
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
