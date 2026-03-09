import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, checkpoints } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// POST /api/checkpoints - Create a new checkpoint for a project
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, prompt, files, thumbnailUrl } = body;

    if (!projectId || !prompt || !files) {
      return NextResponse.json({ 
        error: 'projectId, prompt, and files are required' 
      }, { status: 400 });
    }

    // Verify user owns this project
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const id = crypto.randomUUID();

    const [newCheckpoint] = await db.insert(checkpoints).values({
      id,
      projectId,
      prompt,
      files,
      thumbnailUrl: thumbnailUrl || null,
      createdAt: new Date(),
    }).returning();

    // Update the project's updatedAt timestamp
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ 
      success: true, 
      checkpoint: newCheckpoint 
    });
  } catch (error) {
    console.error('[POST /api/checkpoints] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create checkpoint' 
    }, { status: 500 });
  }
}

// GET /api/checkpoints?projectId=xxx - List checkpoints for a project
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ 
        error: 'projectId query parameter is required' 
      }, { status: 400 });
    }

    // Verify user owns this project
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectCheckpoints = await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.projectId, projectId))
      .orderBy(desc(checkpoints.createdAt));

    return NextResponse.json({ 
      success: true, 
      checkpoints: projectCheckpoints 
    });
  } catch (error) {
    console.error('[GET /api/checkpoints] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch checkpoints' 
    }, { status: 500 });
  }
}
