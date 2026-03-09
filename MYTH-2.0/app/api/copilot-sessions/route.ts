import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { copilotChatSessions } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';

// GET /api/copilot-sessions — List all sessions for the user
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessions = await db
            .select()
            .from(copilotChatSessions)
            .where(eq(copilotChatSessions.userId, userId))
            .orderBy(desc(copilotChatSessions.updatedAt));

        const sessionList = sessions.map(s => ({
            _id: s.id,
            title: s.title,
            messageCount: s.messages ? (s.messages as any[]).length : 0,
            updatedAt: s.updatedAt,
        }));

        return NextResponse.json({ success: true, sessions: sessionList });
    } catch (error: any) {
        console.error('[GET /api/copilot-sessions] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

// POST /api/copilot-sessions — Create a new session
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { wsUrl } = await req.json();
        const id = crypto.randomUUID();

        await db.insert(copilotChatSessions).values({
            id,
            userId,
            title: 'New Chat',
            gatewayUrl: wsUrl,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, sessionId: id });
    } catch (error: any) {
        console.error('[POST /api/copilot-sessions] Error:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
