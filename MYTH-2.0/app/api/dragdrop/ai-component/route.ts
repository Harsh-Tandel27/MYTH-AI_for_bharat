import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(request: Request) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const systemPrompt = `You are a website component generator. The user describes a section they want for their website. Generate a complete, self-contained HTML section using inline styles only. The section should:
- Use a dark theme (background: #0a0a0a, text: #fafafa, muted: #a3a3a3, accent: #3b82f6)
- Be responsive and modern
- Use the Inter font family
- Be a complete <section> element with proper padding
- NOT use any external CSS frameworks or JS libraries
- Be production-quality and visually stunning

Return ONLY the raw HTML, no markdown, no code fences, no explanation.

User request: "${prompt}"`;

        const { text } = await generateText({
            model: google('gemini-2.0-flash'),
            prompt: systemPrompt,
            temperature: 0.7,
            maxRetries: 0,
        });

        let html = text.trim();
        if (html.startsWith('```')) {
            html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '');
        }

        return NextResponse.json({ success: true, html });
    } catch (error) {
        console.error('[dragdrop/ai-component] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'AI component generation failed' },
            { status: 500 }
        );
    }
}
