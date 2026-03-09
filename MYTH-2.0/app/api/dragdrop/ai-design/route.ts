import { NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { headers, sampleRows } = await req.json();

        const systemPrompt = `You are an elite Senior UI/UX Designer specialized in Premium Dark-Mode Web Interfaces.
I have spreadsheet data with these normalized slugs: ${headers.join(", ")}.
Sample data: ${JSON.stringify(sampleRows)}

Your task is to design a STUNNING, HIGH-END website component to display this data. The design must be modern, clean, and feel premium.

REQUIREMENTS:
1. "containerStyle": Return Tailwind classes for a responsive grid. MUST BE: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" or similar.
2. "cardHtml": A single card's HTML using double curly braces for slugs (e.g., {{PRICE}}).
   - AESTHETICS: Dark theme (bg-[#111] or bg-[#161616]), subtle borders (border-[#222]), rounded-2xl, overflow-hidden.
   - EFFECTS: Add hover:border-blue-500/50 or similar.
   - IMAGES: If an IMAGE slug exists, use an <img> with "w-full h-48 object-cover". Add an "onError" to hide broken images.
   - TYPOGRAPHY: Use "text-sm font-semibold text-white" for titles, "text-xs text-gray-400" for descriptions, and "text-[#f59e0b] font-bold" for prices/highlights.
   - BUTTONS: Always include a beautiful "Call to Action" button like "Add to Cart" or "Learn More".

Return ONLY a JSON object:
{
  "containerStyle": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
  "cardHtml": "<div class='bg-[#111] border border-[#222] rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform'>...</div>",
  "columns": ["list", "of", "slugs", "used"]
}

Avoid basic designs. Go for a high-end SaaS or E-commerce feel.`;

        const { text } = await generateText({
            model: google("gemini-2.0-flash"),
            prompt: systemPrompt,
            temperature: 0.7,
            maxRetries: 0,
        });

        // Extract JSON from markdown if needed
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const design = JSON.parse(cleaned);

        return NextResponse.json(design);
    } catch (error: any) {
        console.error("AI Design Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
