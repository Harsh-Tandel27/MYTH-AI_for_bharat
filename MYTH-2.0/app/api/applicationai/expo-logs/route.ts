import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    const sandboxId = req.nextUrl.searchParams.get('sandboxId');

    if (!sandboxId) {
        return new Response(JSON.stringify({ error: 'Missing sandboxId' }), { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { Sandbox } = await import('@e2b/code-interpreter');
                const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

                console.log(`[applicationai/expo-logs] Attaching to logs for sandbox: ${sandboxId}`);

                // Keep the user informed with a few friendly diagnostic lines
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: '\x1b[35m[MYTH] Establishing secure handshake with sandbox...\x1b[0m\n' })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: '\x1b[35m[MYTH] Monitoring Expo/Metro logs for tunnel credentials...\x1b[0m\n' })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: '\x1b[35m[MYTH] Log stream active and synchronized.\x1b[0m\n' })}\n\n`));

                // Use tail -f to stream the log file
                // -n +1 ensures we get all content from the beginning if it already exists
                const proc = await sandbox.commands.run('tail -f -n +1 /tmp/expo.log', {
                    timeoutMs: 0,
                    onStdout: (data) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`));

                        const cleanedData = data.replace(/\u001b\[[0-9;]*m/g, '').replace(/[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                        const urlMatch = cleanedData.match(/(exp|https):\/\/[a-zA-Z0-9.-]+(\.exp\.direct|\.ngrok-free\.app|\.ngrok\.io)[^\s]*/);

                        if (urlMatch) {
                            const url = urlMatch[0].trim();
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'expo-url', url })}\n\n`));
                        }
                    },
                    onStderr: (data) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`));

                        // Check stderr too!
                        const cleanedData = data.replace(/\u001b\[[0-9;]*m/g, '').replace(/[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                        const urlMatch = cleanedData.match(/(exp|https):\/\/[a-zA-Z0-9.-]+(\.exp\.direct|\.ngrok-free\.app|\.ngrok\.io)[^\s]*/);

                        if (urlMatch) {
                            const url = urlMatch[0].trim();
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'expo-url', url })}\n\n`));
                        }
                    }
                });

                // Periodic check for URL via explicit command is REMOVED here.
                // The separate /api/applicationai/expo-qr endpoint handles the polling robustly.
                // We keep this stream for stdout/stderr visualization.

                await proc;
                controller.close();

            } catch (error: any) {
                console.error('[applicationai/expo-logs] Stream Error:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`));
                controller.close();
            }
        },
        cancel() {
            console.log('[applicationai/expo-logs] Stream cancelled by client');
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
