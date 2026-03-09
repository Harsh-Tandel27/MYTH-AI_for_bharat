import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

// Store active sandboxes globally
declare global {
    var applicationSandboxes: Map<string, { sandbox: any; createdAt: Date }>;
}

if (!global.applicationSandboxes) {
    global.applicationSandboxes = new Map();
}

export async function POST(req: NextRequest) {
    try {
        const { sessionId: existingSessionId } = await req.json().catch(() => ({}));
        const sessionId = existingSessionId || `app_session_${Date.now()}`;

        console.log(`[applicationai/create-sandbox] Session: ${sessionId}`);

        // Create a new sandbox
        const sandbox = await Sandbox.create({
            apiKey: process.env.E2B_API_KEY,
            timeoutMs: 3600000 // 1 hour for mobile builds
        });

        console.log(`[applicationai/create-sandbox] Sandbox created: ${sandbox.sandboxId}`);

        // Store in global map
        global.applicationSandboxes.set(sessionId, {
            sandbox,
            createdAt: new Date()
        });

        return NextResponse.json({
            success: true,
            sessionId,
            sandboxId: sandbox.sandboxId,
            url: `https://${sandbox.getHost(8081)}`, // Expo default port
        });

    } catch (error: any) {
        console.error('[applicationai/create-sandbox] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
