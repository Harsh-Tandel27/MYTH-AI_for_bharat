import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;



export async function POST(req: NextRequest) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

    const modelMap: Record<string, any> = {
        'claude-3-5-sonnet-20241022': anthropic('claude-3-5-sonnet-20241022'),
        'gpt-4o': openai('gpt-4o'),
        'gemini-3-pro-preview': google('gemini-3-pro-preview'),
        'google/gemini-3-pro-preview': google('gemini-3-pro-preview'),
        'gemini-3-flash-preview': google('gemini-3-flash-preview'),
    };

    try {
        const body = await req.json();
        const { prompt, model = 'gemini-3-pro-preview', style = 'Modern', sandboxId, isEdit = false, currentCodebase = [] } = body;

        console.log('[Generate Code] Request Body keys:', Object.keys(body));
        console.log('[Generate Code] SandboxId:', sandboxId);
        console.log('[Generate Code] Prompt length:', prompt?.length);

        if (!prompt || !sandboxId) {
            console.error('[Generate Code] Validation failed: missing prompt or sandboxId');
            return new Response(JSON.stringify({ error: 'Prompt and sandboxId are required' }), { status: 400 });
        }

        const selectedModel = modelMap[model] || modelMap['gemini-3-pro-preview'];

        const systemPrompt = `You are an expert React Native and Expo developer. You generate complete, production-ready mobile applications.
${isEdit ? 'The user is requesting MODIFICATIONS to an existing codebase. Act as a surgical editor.' : 'You are creating a new React Native application using Expo.'}

CRITICAL MOBILE RULES:
1. NO WEB APIs: DO NOT use 'window', 'document', 'localStorage', or any browser-specific libraries.
2. STYLING: Use 'StyleSheet' from 'react-native'. Use the "${style}" design style.
3. EXPO STRUCTURE: You are working in a standard Expo project using Expo Router.
   - MANDATORY: USE EXPO SDK 54.
   - 'app.json' and 'package.json' MUST remain in the root.
   - ALWAYS include a proper 'package.json' with exactly these versions for baseline:
       "expo": "^54.0.0",
       "expo-router": "~4.0.0",
       "react": "19.1.0",
       "react-native": "0.81.0",
       "expo-status-bar": "~2.0.0",
       "@expo/ngrok": "^4.1.0"
   - FOR NAVIGATION: Use 'expo-router'. Create an 'app/' directory for screens.
   - MANDATORY FILES:
     - 'app/_layout.js': Root layout with <Stack /> or <Tabs />.
     - 'app/index.js': The main entry point/home screen.
4. ASSETS: Use placeholder images from 'https://picsum.photos' if needed.

OUTPUT FORMAT:
You MUST output code strictly using XML-style tags <file path="...">...</file> for each file.
Example:
<file path="app/index.js">
import { View, Text } from 'react-native';
export default function Home() { return <View><Text>Home</Text></View>; }
</file>

${isEdit ? `
CONTEXT: EXISTING CODEBASE
${currentCodebase.map((f: any) => `<file path="${f.path}">${f.content}</file>`).join('\n')}
` : ''}
`;

        const userPrompt = `Application Goal: ${prompt}
Selected Style: ${style}
Generate ${isEdit ? 'modified' : 'complete'} files for this Expo application.`;

        console.log('[Generate Code] Calling streamText with system prompt length:', systemPrompt.length);
        const result = await streamText({
            model: selectedModel,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7,
        });
        console.log('[Generate Code] streamText call returned (stream started)');

        // Create streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let fullText = '';
                    for await (const chunk of result.textStream) {
                        fullText += chunk;
                        // Stream the raw text to the UI immediately
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stream', text: chunk })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', generatedCode: fullText })}\n\n`));
                    controller.close();
                } catch (error: any) {
                    console.error('[Generate Code] Stream error:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('[Generate Code] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
