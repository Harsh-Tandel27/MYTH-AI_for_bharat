import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { url, path = '/health', method = 'GET' } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const targetUrl = `${url}${path}`;
        console.log(`[health-check] Proxying ${method} to: ${targetUrl}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const res = await fetch(targetUrl, {
                method,
                cache: 'no-store',
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const bodyText = await res.text();
            console.log(`[health-check] Response ${res.status}: ${bodyText}`);

            if (res.ok) {
                let data = {};
                try { data = JSON.parse(bodyText); } catch { }
                return NextResponse.json({ success: true, status: res.status, data });
            } else {
                return NextResponse.json({
                    success: false,
                    status: res.status,
                    body: bodyText.substring(0, 500),
                    reason: `Server responded with ${res.status}`
                });
            }
        } catch (fetchError: any) {
            clearTimeout(timeout);
            const reason = fetchError.name === 'AbortError'
                ? 'Request timed out after 8s'
                : fetchError.message;
            console.log(`[health-check] Fetch error: ${reason}`);
            return NextResponse.json({
                success: false,
                error: reason,
                reason: `Connection failed: ${reason}`
            });
        }

    } catch (error: any) {
        console.error('[health-check] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
