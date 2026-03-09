import { NextRequest, NextResponse } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1' });
const googleGenerativeAI = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const { headers, sampleData, goal, style, model = 'google/gemini-3-pro-preview' } = await req.json();

        // Multimodal provider selection
        const isAnthropic = model.startsWith('anthropic/');
        const isGoogle = model.startsWith('google/');
        const isOpenAI = model.startsWith('openai/');

        const modelProvider = isAnthropic ? anthropic : (isOpenAI ? openai : (isGoogle ? googleGenerativeAI : groq));
        const actualModelId = isAnthropic ? model.replace('anthropic/', '') :
            (isOpenAI ? model.replace('openai/', '') :
                (isGoogle ? model.replace('google/', '') : model));

        const selectedModel = modelProvider(actualModelId);

        const prompt = `You are a Data Science Architect. Analyze the following dataset and create a dashboard plan.
    
    DATASET HEADERS: ${headers.join(', ')}
    SAMPLE DATA: ${JSON.stringify(sampleData)}
    USER GOAL: ${goal}
    VISUAL STYLE: ${style}
    
    OUTPUT FORMAT (STRICT JSON):
    {
      "cleaningSteps": ["step 1", "step 2"],
      "metrics": [{"label": "Total Revenue", "logic": "Sum of Price"}],
      "charts": [{"type": "line", "title": "Sales Over Time", "x": "Date", "y": "Amount"}],
      "filters": ["Category", "Region"],
      "layout": "Grid layout with metrics on top and charts below",
      "reasoning": "Explain why this plan fits the goal"
    }`;

        const { text } = await generateText({
            model: selectedModel,
            prompt: prompt,
        });

        // Clean potential markdown from AI response
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const plan = JSON.parse(jsonStr);

        return NextResponse.json({ success: true, plan });
    } catch (error: any) {
        console.error('[Data Plan Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
