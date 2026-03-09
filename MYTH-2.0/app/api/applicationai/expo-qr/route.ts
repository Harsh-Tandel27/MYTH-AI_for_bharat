import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { sandboxId } = await req.json();

        if (!sandboxId) {
            return NextResponse.json({ error: 'Missing sandboxId' }, { status: 400 });
        }

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        console.log(`[applicationai/expo-qr] Querying Metro manifest in sandbox: ${sandboxId}`);

        // 1. Diagnostics: Check if npx expo is even running
        // Wrap in try-catch to ignore CommandExitError if grep fails
        try {
            const psRes = await sandbox.commands.run("ps aux | grep 'npx expo' | grep -v grep || true", { timeoutMs: 3000 });
            if (!psRes.stdout.trim()) {
                console.log('[applicationai/expo-qr] Diagnostic: npx expo process not found.');
            } else {
                console.log('[applicationai/expo-qr] Diagnostic: npx expo process is alive.');
            }
        } catch (e) {
            console.log('[applicationai/expo-qr] Diagnostic: ps check failed.');
        }

        // 2. Check if Metro is alive at http://localhost:8081/status
        // We try BOTH localhost and 127.0.0.1 to be extremely robust.
        const targets = ['http://localhost:8081', 'http://127.0.0.1:8081'];
        let activeTarget = null;

        for (const target of targets) {
            try {
                const statusRes = await sandbox.commands.run(`curl -s ${target}/status`, { timeoutMs: 3000 });
                const status = statusRes.stdout.trim();
                if (status === 'packager-status:running') {
                    activeTarget = target;
                    console.log(`[applicationai/expo-qr] Metro is running at ${target}`);
                    break;
                }
            } catch (e) {
                // Continue to next target
            }
        }

        if (!activeTarget) {
            console.log('[applicationai/expo-qr] Metro is not yet responsive on localhost or 127.0.0.1.');

            // diagnostic: check if port 8081 is listening
            try {
                const lsofRes = await sandbox.commands.run('lsof -i :8081 || true', { timeoutMs: 2000 });
                if (lsofRes.stdout.trim()) {
                    console.log('[applicationai/expo-qr] Diagnostic: port 8081 is listening but /status not ready yet.');
                }
            } catch (e) { }

            return NextResponse.json({
                status: 'starting',
                sandboxId,
                message: 'Waiting for Metro bundler to wake up...'
            }, { status: 202 });
        }

        // 3. Fetch the manifest from the active target
        try {
            console.log(`[applicationai/expo-qr] Fetching manifest from ${activeTarget} (15s timeout)...`);
            const manifestRes = await sandbox.commands.run(`curl -s -H "Accept: application/json" -H "expo-platform: android" ${activeTarget}/`, { timeoutMs: 15000 });
            const manifestStr = manifestRes.stdout.trim();

            if (manifestStr) {
                try {
                    const manifest = JSON.parse(manifestStr);
                    // Log manifest keys for debugging
                    console.log(`[HYPER_ROBUST_DIAGNOSTIC] Manifest keys: ${Object.keys(manifest).join(', ')}`);
                    const hostUri = manifest.hostUri || (manifest.bundleUrl ? new URL(manifest.bundleUrl).host : null);

                    if (hostUri) {
                        const url = hostUri.startsWith('exp://') ? hostUri : `exp://${hostUri}`;
                        console.log('[HYPER_ROBUST_DIAGNOSTIC] Successfully extracted URL from manifest:', url);
                        return NextResponse.json({
                            status: 'ready', sandboxId,
                            expo: { protocol: 'exp', url, tunnel: url, port: 8081 },
                            qr: { value: url, format: 'text' }
                        });
                    }
                } catch (jsonErr) {
                    console.log('[HYPER_ROBUST_DIAGNOSTIC] Manifest is not valid JSON, searching raw content...');
                    const tunnelMatch = manifestStr.match(/[a-zA-Z0-9-]+\.exp\.direct|[a-zA-Z0-9-]+\.ngrok-free\.app|[a-zA-Z0-9-]+\.ngrok\.io/);
                    if (tunnelMatch) {
                        const url = `exp://${tunnelMatch[0]}`;
                        console.log('[HYPER_ROBUST_DIAGNOSTIC] Found tunnel string in raw manifest:', url);
                        return NextResponse.json({
                            status: 'ready', sandboxId,
                            expo: { protocol: 'exp', url, tunnel: url, port: 8081 },
                            qr: { value: url, format: 'text' }
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[HYPER_ROBUST_DIAGNOSTIC] Error fetching manifest:', e);
        }

        // 4. Fallback: Search metadata files and logs
        const searchFiles = [
            '/home/user/mobile-app/.expo/packager-info.json',
            '/home/user/mobile-app/.expo/settings.json',
            '/tmp/expo.log',
            '/home/user/mobile-app/expo.log'
        ];

        for (const file of searchFiles) {
            try {
                const res = await sandbox.commands.run(`cat ${file} 2>/dev/null || true`, { timeoutMs: 2000 });
                const content = res.stdout.replace(/\u001b\[[0-9;]*m/g, '').replace(/[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

                // Try JSON parsing first for packager-info
                if (file.endsWith('.json')) {
                    try {
                        const json = JSON.parse(content);
                        const url = json.expoServerUri || json.tunnelExporterUri;
                        if (url) {
                            return NextResponse.json({
                                status: 'ready', sandboxId,
                                expo: { protocol: 'exp', url, tunnel: url, port: 8081 },
                                qr: { value: url, format: 'text' }
                            });
                        }
                    } catch (e) { /* not JSON */ }
                }

                // Regex search
                const tunnelMatch = content.match(/(exp|https):\/\/[a-zA-Z0-9.-]+(\.exp\.direct|\.ngrok-free\.app|\.ngrok\.io)[^\s]*/);
                if (tunnelMatch) {
                    const url = tunnelMatch[0].trim();
                    return NextResponse.json({
                        status: 'ready', sandboxId,
                        expo: { protocol: 'exp', url, tunnel: url, port: 8081 },
                        qr: { value: url, format: 'text' }
                    });
                }
            } catch (e) { /* ignore file */ }
        }

        // 4. Last Resort: Recursive grep in the home directory
        try {
            const grepRes = await sandbox.commands.run("grep -r 'exp://' /home/user/mobile-app --exclude-dir=node_modules -l | xargs cat 2>/dev/null | grep -o 'exp://[a-zA-Z0-9.-]*\\.exp\\.direct' | head -n 1 || true", { timeoutMs: 5000 });
            if (grepRes.stdout.trim()) {
                const url = grepRes.stdout.trim();
                return NextResponse.json({
                    status: 'ready', sandboxId,
                    expo: { protocol: 'exp', url, tunnel: url, port: 8081 },
                    qr: { value: url, format: 'text' }
                });
            }
        } catch (e) { /* grep failed */ }

        // 5. Ngrok Direct Check: If ngrok is used, it often has a local API on 4040
        try {
            const ngrokRes = await sandbox.commands.run('curl -s http://localhost:4040/api/tunnels', { timeoutMs: 2000 });
            const ngrokData = JSON.parse(ngrokRes.stdout);
            const publicUrl = ngrokData.tunnels?.[0]?.public_url;
            if (publicUrl) {
                const url = publicUrl.replace('https://', 'exp://');
                console.log(`[HYPER_ROBUST_DIAGNOSTIC] Found URL via ngrok API:`, url);
                return NextResponse.json({
                    status: 'ready', sandboxId,
                    expo: { protocol: 'exp', url, tunnel: url, port: 8081 },
                    qr: { value: url, format: 'text' }
                });
            }
        } catch (e) { /* ngrok API not responsive */ }

        // 6. Final Diagnostics: Silenced (only log to server console)
        try {
            const psInfo = await sandbox.commands.run('ps aux | grep -e expo -e metro -e ngrok | grep -v grep || true', { timeoutMs: 2000 });
            console.log(`[HYPER_ROBUST_DIAGNOSTIC] Process Check:\n${psInfo.stdout}`);
        } catch (e) { /* ignore */ }

        return NextResponse.json({
            status: 'starting',
            sandboxId,
            message: 'Waiting for tunnel URL (manifest/logs/meta)... If this persists, verify ngrok tunnel is healthy in logs.'
        }, { status: 202 });

    } catch (error: any) {
        console.error('[applicationai/expo-qr] Global Error:', error);
        return NextResponse.json({
            status: 'error',
            error: error.message
        }, { status: 500 });
    }
}
