import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatHistory } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/chat/:projectId - Get all chat messages for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const messages = await db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.projectId, projectId))
      .orderBy(chatHistory.createdAt);

    return NextResponse.json({ 
      success: true, 
      messages 
    });
  } catch (error) {
    console.error('[GET /api/chat] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch chat messages' 
    }, { status: 500 });
  }
}

// POST /api/chat/:projectId - Add a chat message to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const body = await request.json();
    const { content, type, metadata } = body;

    if (!content || !type) {
      return NextResponse.json({ 
        error: 'Content and type are required' 
      }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const [newMessage] = await db.insert(chatHistory).values({
      id,
      projectId,
      content,
      type,
      metadata: metadata || null,
      createdAt: now,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      message: newMessage 
    });
  } catch (error) {
    console.error('[POST /api/chat] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to save chat message' 
    }, { status: 500 });
  }
}
