import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxState } from '@/types/sandbox';

declare global {
    var activeSandbox: any;
    var sandboxData: any;
    var sandboxState: SandboxState;
}

export async function POST(request: NextRequest) {
    try {
        const { images, sandboxId } = await request.json();

        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ success: false, error: 'No images provided' }, { status: 400 });
        }

        // Get or reconnect to sandbox
        let sandbox = global.activeSandbox;
        if (!sandbox && sandboxId) {
            try {
                sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
                global.activeSandbox = sandbox;
            } catch (err) {
                return NextResponse.json({ success: false, error: 'Sandbox not available' }, { status: 400 });
            }
        }

        if (!sandbox) {
            return NextResponse.json({ success: false, error: 'No active sandbox' }, { status: 400 });
        }

        // Get sandbox URL for constructing image URLs
        const sandboxUrl = global.sandboxData?.url;
        if (!sandboxUrl) {
            return NextResponse.json({ success: false, error: 'Sandbox URL not available' }, { status: 400 });
        }

        const uploadedUrls: { name: string; url: string; path: string }[] = [];

        for (const [index, image] of images.entries()) {
            const { name, content } = image; // content is base64 data URL like "data:image/png;base64,..."

            // Generate a unique filename to avoid collisions
            const ext = name.split('.').pop() || 'png';
            const safeName = `upload-${Date.now()}-${index}.${ext}`;
            const sandboxPath = `/home/user/app/public/uploads/${safeName}`;

            // Extract raw base64 from data URL
            // content format: "data:image/png;base64,iVBOR..."
            const base64Match = content.match(/^data:[^;]+;base64,(.+)$/);
            if (!base64Match) {
                console.error(`[upload-to-sandbox] Invalid base64 format for ${name}`);
                continue;
            }
            const rawBase64 = base64Match[1];

            // Write the image file to the sandbox using Python
            try {
                await sandbox.runCode(`
import os
import base64

dir_path = os.path.dirname("${sandboxPath}")
os.makedirs(dir_path, exist_ok=True)

img_data = base64.b64decode("""${rawBase64}""")
with open("${sandboxPath}", 'wb') as f:
    f.write(img_data)

print(f"Image written: ${sandboxPath} ({len(img_data)} bytes)")
        `);

                // In Vite, files in public/ are served at the root
                // So public/uploads/image.png is accessible at /uploads/image.png
                const imageUrl = `${sandboxUrl}/uploads/${safeName}`;

                uploadedUrls.push({
                    name: name,
                    url: imageUrl,
                    path: `/uploads/${safeName}`,
                });

                console.log(`[upload-to-sandbox] Uploaded ${name} -> ${imageUrl}`);
            } catch (writeError) {
                console.error(`[upload-to-sandbox] Failed to write ${name}:`, writeError);
            }
        }

        return NextResponse.json({
            success: true,
            uploads: uploadedUrls,
        });

    } catch (error) {
        console.error('[upload-to-sandbox] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}
