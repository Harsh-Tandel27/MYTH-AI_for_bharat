import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { sandboxId } = await req.json();

        if (!sandboxId) {
            return new Response(JSON.stringify({ error: 'Missing sandboxId' }), { status: 400 });
        }

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        console.log('[applicationai/start-expo] Starting Expo in background...');

        // Start Expo with redirect to /tmp/expo.log
        // 1. Ensure all standard assets exist to prevent Metro resolution hangs
        await sandbox.commands.run('cd /home/user/mobile-app && mkdir -p assets && touch assets/icon.png assets/splash.png assets/adaptive-icon.png assets/favicon.png', { timeoutMs: 5000 });

        // 2. Start Expo with --tunnel. 
        // Note: We explicitly install @expo/ngrok locally right before starting 
        // because the user's logs indicate Expo CLI doesn't find it otherwise 
        // and prompts for global install (which fails in non-interactive).
        await sandbox.commands.run('npm install @expo/ngrok@^4.1.0', {
            cwd: '/home/user/mobile-app',
            timeoutMs: 30000
        });

        // 3. Hyper-Robust Environment. Re-adding TERM=xterm to trick Expo into TTY mode.
        // 4. We use background: true to avoid blocking the API.
        await sandbox.commands.run('TERM=xterm FORCE_COLOR=1 EXPO_NO_TELEMETRY=1 npx expo start --tunnel > /tmp/expo.log 2>&1', {
            cwd: '/home/user/mobile-app',
            background: true
        });

        console.log('[applicationai/start-expo] Expo started with TERM=xterm');

        return new Response(JSON.stringify({
            success: true,
            message: 'Expo server starting in background'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[applicationai/start-expo] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
