import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, checkpoints } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/checkpoints/[id] - Get a specific checkpoint
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { id } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checkpoint = await db.query.checkpoints.findFirst({
      where: eq(checkpoints.id, id),
      with: {
        project: true,
      },
    });

    if (!checkpoint) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 });
    }

    // Verify the user owns this checkpoint's project
    if (checkpoint.project.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      checkpoint 
    });
  } catch (error) {
    console.error('[GET /api/checkpoints/[id]] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch checkpoint' 
    }, { status: 500 });
  }
}

// DELETE /api/checkpoints/[id] - Delete a checkpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { id } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the checkpoint to verify ownership
    const checkpoint = await db.query.checkpoints.findFirst({
      where: eq(checkpoints.id, id),
      with: {
        project: true,
      },
    });

    if (!checkpoint) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 });
    }

    if (checkpoint.project.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.delete(checkpoints).where(eq(checkpoints.id, id));

    return NextResponse.json({ 
      success: true, 
      message: 'Checkpoint deleted' 
    });
  } catch (error) {
    console.error('[DELETE /api/checkpoints/[id]] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete checkpoint' 
    }, { status: 500 });
  }
}
