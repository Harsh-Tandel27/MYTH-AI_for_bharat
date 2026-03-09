import { Sandbox } from '@e2b/code-interpreter';
import { NextRequest } from 'next/server';

export const maxDuration = 300;

interface ApplyCodeRequest {
    frontendCode: string;
    backendCode: string;
    frontendSandboxId: string;
    backendSandboxId: string;
}

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const body = await req.json().catch(() => ({}));
                const { frontendCode, backendCode, frontendSandboxId, backendSandboxId }: Partial<ApplyCodeRequest> = body;

                // Parse frontend code
                if (frontendCode) {
                    if (!frontendSandboxId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Frontend sandbox ID required for frontend code' })}\n\n`));
                        controller.close();
                        return;
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Connecting to frontend sandbox...' })}\n\n`));
                    const frontendSandbox = await Sandbox.connect(frontendSandboxId);

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Applying frontend source code...' })}\n\n`));
                    const frontendFiles = parseFrontendCode(frontendCode);
                    let frontendCreatedFiles: string[] = [];

                    for (const file of frontendFiles) {
                        const fullPath = file.path.startsWith('/') ? file.path : `/home/user/app/${file.path}`;
                        await frontendSandbox.files.write(fullPath, file.content);
                        frontendCreatedFiles.push(file.path);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: 'file-created',
                            layer: 'frontend',
                            path: file.path
                        })}\n\n`));
                    }

                    // Install frontend dependencies if package.json changed
                    if (frontendFiles.some(f => f.path === 'package.json')) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Installing frontend dependencies...' })}\n\n`));
                        await (frontendSandbox as any).process.start({ cmd: 'npm install', cwd: '/home/user/app' });
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'frontend-complete',
                        filesCreated: frontendCreatedFiles
                    })}\n\n`));
                }

                // Parse backend code
                if (backendCode) {
                    if (!backendSandboxId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Backend sandbox ID required for backend code' })}\n\n`));
                        controller.close();
                        return;
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Connecting to backend sandbox...' })}\n\n`));
                    const backendSandbox = await Sandbox.connect(backendSandboxId);

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Applying backend source code...' })}\n\n`));
                    const backendFiles = parseBackendCode(backendCode);
                    let backendCreatedFiles: string[] = [];

                    for (const file of backendFiles) {
                        const fullPath = file.path.startsWith('/') ? file.path : `/home/user/backend/${file.path}`;
                        await backendSandbox.files.write(fullPath, file.content);
                        backendCreatedFiles.push(file.path);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: 'file-created',
                            layer: 'backend',
                            path: file.path
                        })}\n\n`));
                    }

                    // Install backend dependencies if package.json changed
                    if (backendFiles.some(f => f.path === 'package.json')) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Installing backend dependencies...' })}\n\n`));
                        await (backendSandbox as any).process.start({ cmd: 'npm install', cwd: '/home/user/backend' });
                    }

                    // Start backend server
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', message: 'Starting backend server...' })}\n\n`));
                    await (backendSandbox as any).process.start({
                        cmd: 'npm start',
                        cwd: '/home/user/backend',
                        onStdout: (data: string) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                type: 'backend-log',
                                message: data
                            })}\n\n`));
                        },
                        onStderr: (data: string) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                type: 'backend-error',
                                message: data
                            })}\n\n`));
                        }
                    });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'backend-complete',
                        filesCreated: backendCreatedFiles
                    })}\n\n`));
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    success: true
                })}\n\n`));

                controller.close();

            } catch (error: any) {
                console.error('[Apply MERN Code] Error:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'error',
                    message: error.message
                })}\n\n`));
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
}

function parseFrontendCode(code: string): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;

    while ((match = fileRegex.exec(code)) !== null) {
        const path = match[1];
        const content = match[2].trim();
        files.push({ path, content });
    }

    return files;
}

function parseBackendCode(code: string): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;

    while ((match = fileRegex.exec(code)) !== null) {
        const path = match[1];
        const content = match[2].trim();
        files.push({ path, content });
    }

    return files;
}
