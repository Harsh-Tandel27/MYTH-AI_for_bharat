import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { copilotChatSessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/copilot-sessions/[sessionId] — Get session details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { sessionId } = await params;

        const [session] = await db
            .select()
            .from(copilotChatSessions)
            .where(and(
                eq(copilotChatSessions.id, sessionId),
                eq(copilotChatSessions.userId, userId)
            ));

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, session });
    } catch (error: any) {
        console.error('[GET /api/copilot-sessions/id] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }
}

// PUT /api/copilot-sessions/[sessionId] — Update session messages/title
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { sessionId } = await params;
        const { messages, title } = await req.json();

        // Prepare update data
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (messages) updateData.messages = messages;
        if (title) updateData.title = title;

        // Auto-generate title from first user message if it's "New Chat"
        if (messages && messages.length > 0 && (!title || title === 'New Chat')) {
            const firstUserMsg = messages.find((m: any) => m.role === 'user');
            if (firstUserMsg && firstUserMsg.content) {
                updateData.title = firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
            }
        }

        await db
            .update(copilotChatSessions)
            .set(updateData)
            .where(and(
                eq(copilotChatSessions.id, sessionId),
                eq(copilotChatSessions.userId, userId)
            ));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[PUT /api/copilot-sessions/id] Error:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}

// DELETE /api/copilot-sessions/[sessionId] — Delete session
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { sessionId } = await params;

        await db
            .delete(copilotChatSessions)
            .where(and(
                eq(copilotChatSessions.id, sessionId),
                eq(copilotChatSessions.userId, userId)
            ));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[DELETE /api/copilot-sessions/id] Error:', error);
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
