import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(request: Request) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
    try {
        const { sectionType, currentData, prompt } = await request.json();

        if (!prompt || !currentData) {
            return NextResponse.json({ error: 'Missing prompt or currentData' }, { status: 400 });
        }

        const systemPrompt = `You are a website section editor AI. You receive JSON data representing a website section and a user instruction. Return ONLY valid JSON (no markdown, no code fences) with the updated section data.

Rules:
- Only modify the fields the user asks to change
- Keep all other fields exactly as they are
- The structure must match the input structure exactly
- Return raw JSON only, no explanation

Section type: ${sectionType}
Current data: ${JSON.stringify(currentData, null, 2)}

User instruction: "${prompt}"

Return the updated JSON:`;

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: systemPrompt,
            temperature: 0.3,
            maxRetries: 0,
        });

        // Parse the JSON response — strip code fences if present
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const updatedData = JSON.parse(cleaned);

        return NextResponse.json({ success: true, data: updatedData });
    } catch (error) {
        console.error('[dragdrop/ai-edit] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'AI edit failed' },
            { status: 500 }
        );
    }
}
