import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export async function POST(request: NextRequest) {
    try {
        const { frontendSandboxId, backendSandboxId } = await request.json();

        if (!frontendSandboxId || !backendSandboxId) {
            return NextResponse.json({
                success: false,
                error: 'Both frontend and backend sandbox IDs are required'
            }, { status: 400 });
        }

        console.log('[create-fullstack-zip] Connecting to sandboxes...');
        const frontendSandbox = await Sandbox.connect(frontendSandboxId);
        const backendSandbox = await Sandbox.connect(backendSandboxId);

        console.log('[create-fullstack-zip] Zipping frontend...');
        // Create zip of frontend
        const fZipResult = await frontendSandbox.runCode(`
import zipfile
import os
import base64

os.chdir('/home/user/app')
with zipfile.ZipFile('/tmp/frontend.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '.next', 'dist']]
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.')
            zipf.write(file_path, arcname)

with open('/tmp/frontend.zip', 'rb') as f:
    print(base64.b64encode(f.read()).decode('utf-8'))
    `);

        console.log('[create-fullstack-zip] Zipping backend...');
        // Create zip of backend
        const bZipResult = await backendSandbox.runCode(`
import zipfile
import os
import base64

os.chdir('/home/user/backend')
with zipfile.ZipFile('/tmp/backend.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '.next', 'dist']]
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.')
            zipf.write(file_path, arcname)

with open('/tmp/backend.zip', 'rb') as f:
    print(base64.b64encode(f.read()).decode('utf-8'))
    `);

        const frontendBase64 = fZipResult.logs.stdout.join('').trim();
        const backendBase64 = bZipResult.logs.stdout.join('').trim();

        return NextResponse.json({
            success: true,
            frontendZip: frontendBase64,
            backendZip: backendBase64,
            message: 'Individual layer zips created successfully'
        });

    } catch (error: any) {
        console.error('[create-fullstack-zip] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
