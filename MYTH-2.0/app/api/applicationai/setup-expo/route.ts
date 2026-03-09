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

                const runCmd = async (cmd: string, description: string, cwd: string = '/home/user') => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: `\n\x1b[36m[Setup] ${description}...\x1b[0m\n` })}\n\n`));

                    const proc = await sandbox.commands.run(cmd, {
                        cwd,
                        onStdout: (data) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`));
                        },
                        onStderr: (data) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`));
                        }
                    });

                    await proc;
                    return proc.exitCode;
                };

                // Step 1: Create mobile-app directory
                await sandbox.commands.run('mkdir -p mobile-app');

                // Step 2: Create Expo project
                // Using --yes and --template blank to skip prompts
                const exitCode = await runCmd('npx create-expo-app@latest . --yes --template blank', 'Creating Expo project', '/home/user/mobile-app');

                if (exitCode !== 0) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'Failed to create Expo project' })}\n\n`));
                    controller.close();
                    return;
                }

                // Step 3: Pre-install @expo/ngrok locally to avoid interactive prompt during tunnel start
                await runCmd('npm install @expo/ngrok@^4.1.0', 'Installing tunnel dependencies', '/home/user/mobile-app');

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', exitCode: 0 })}\n\n`));
                controller.close();

            } catch (error: any) {
                console.error('[applicationai/setup-expo] Error:', error);
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
