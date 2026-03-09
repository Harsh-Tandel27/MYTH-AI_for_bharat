import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { html } = await request.json();

        if (!html || typeof html !== 'string') {
            return NextResponse.json({ error: 'Missing html in request body' }, { status: 400 });
        }

        // Check if drag-drop sandbox exists
        if (!global.dragDropSandbox) {
            return NextResponse.json({ error: 'No sandbox available. Create one first.' }, { status: 400 });
        }

        const sandbox = global.dragDropSandbox;

        console.log(`[dragdrop/deploy] Deploying HTML (${html.length} bytes)...`);

        // Escape the HTML for safe embedding in the Python script
        const escapedHtml = Buffer.from(html).toString('base64');

        // Write the HTML file to the sandbox
        await sandbox.runCode(`
import base64

html_b64 = """${escapedHtml}"""
html_content = base64.b64decode(html_b64).decode('utf-8')

with open('/home/user/site/index.html', 'w') as f:
    f.write(html_content)

print(f'Deployed {len(html_content)} bytes to index.html')
    `);

        const url = global.dragDropSandboxData?.url || '';

        console.log('[dragdrop/deploy] Deployed successfully to:', url);

        return NextResponse.json({
            success: true,
            url,
            sandboxId: global.dragDropSandboxData?.sandboxId,
        });
    } catch (error) {
        console.error('[dragdrop/deploy] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Deployment failed' },
            { status: 500 }
        );
    }
}
