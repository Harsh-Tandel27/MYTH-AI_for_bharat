import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlChatHistory } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET — Get all chat messages for a URL AI project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId } = await params;
        const messages = await db.select().from(urlChatHistory)
            .where(eq(urlChatHistory.projectId, projectId))
            .orderBy(urlChatHistory.createdAt);

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        console.error('[urlai-chat] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST — Save a chat message
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId } = await params;
        const { content, type, metadata } = await request.json();

        if (!content || !type) return NextResponse.json({ error: 'Content and type required' }, { status: 400 });

        const [msg] = await db.insert(urlChatHistory).values({
            id: crypto.randomUUID(),
            projectId,
            content,
            type,
            metadata: metadata || null,
            createdAt: new Date(),
        }).returning();

        return NextResponse.json({ success: true, message: msg });
    } catch (error) {
        console.error('[urlai-chat] POST error:', error);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
}
