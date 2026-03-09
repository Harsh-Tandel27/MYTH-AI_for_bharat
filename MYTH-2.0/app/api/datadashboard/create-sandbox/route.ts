import { Sandbox } from '@e2b/code-interpreter';
import { NextRequest, NextResponse } from 'next/server';
import { appConfig } from '@/config/app.config';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        console.log('[Dashboard Sandbox] Creating specialized Python sandbox...');
        const sandbox = await Sandbox.create({
            apiKey: process.env.E2B_API_KEY,
            timeoutMs: appConfig.e2b.timeoutMs
        })

        const sandboxId = (sandbox as any).sandboxId;
        const host = (sandbox as any).getHost(8501); // Streamlit default port

        console.log(`[Dashboard Sandbox] Created: ${sandboxId} at ${host}`);

        return NextResponse.json({
            success: true,
            sandboxId,
            url: `https://${host}`,
            message: 'Python sandbox provisioned for Dashboard'
        });

    } catch (error: any) {
        console.error('[Dashboard Sandbox Error]:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
