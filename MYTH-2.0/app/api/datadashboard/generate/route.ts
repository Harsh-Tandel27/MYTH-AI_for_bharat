import { NextRequest, NextResponse } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { requireCredits, CREDIT_COSTS } from '@/lib/credits';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1' });
const googleGenerativeAI = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        // Deduct credits before generating dashboard code
        const creditResult = await requireCredits(CREDIT_COSTS.DATA_DASHBOARD, 'Data Dashboard — AI Streamlit app generation');
        if (creditResult.ok === false) return creditResult.response;

        const { plan, goal, style, model = 'google/gemini-3-pro-preview', fileName } = await req.json();

        // Multimodal provider selection
        const isAnthropic = model.startsWith('anthropic/');
        const isGoogle = model.startsWith('google/');
        const isOpenAI = model.startsWith('openai/');

        const modelProvider = isAnthropic ? anthropic : (isOpenAI ? openai : (isGoogle ? googleGenerativeAI : groq));
        const actualModelId = isAnthropic ? model.replace('anthropic/', '') :
            (isOpenAI ? model.replace('openai/', '') :
                (isGoogle ? model.replace('google/', '') : model));

        const selectedModel = modelProvider(actualModelId);

        const systemPrompt = `You are an expert Python Developer specializing in Streamlit and Pandas.
    Your task is to generate a COMPLETE app.py for a Streamlit dashboard.
    
    DATASET FILENAME: ${fileName}
    DASHBOARD PLAN: ${JSON.stringify(plan)}
    USER GOAL: ${goal}
    VISUAL STYLE: ${style}
    
    CRITICAL RULES:
    1. Import streamlit, pandas, plotly.express, and any other needed libs.
    2. Load the data using pd.read_csv('${fileName}') or pd.read_excel('${fileName}').
    3. Implement the cleaning steps and metrics defined in the plan.
    4. Use Plotly for interactive charts.
    5. Follow the visual style: ${style}.
    6. Output ONLY the code within <file path="app.py"> tags.
    7. No explanations, just code.
    
    IMPORTANT: Ensure the code is COMPLETE and ends with the closing </file> tag.`;

        const result = await streamText({
            model: selectedModel,
            prompt: systemPrompt,
            // @ts-expect-error - Vercel AI SDK type definition mismatch for maxTokens
            maxTokens: 8000, // Ensure enough tokens for full app
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('[Code Gen Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
