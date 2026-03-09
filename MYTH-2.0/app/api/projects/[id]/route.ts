import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Log what we're returning
    console.log('[GET /api/projects/[id]] Returning project:', {
      id: project.id,
      name: project.name,
      hasFiles: !!project.files,
      filesCount: Array.isArray(project.files) ? project.files.length : 0,
    });

    return NextResponse.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('[GET /api/projects/[id]] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch project'
    }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update a project (files, sandboxId, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before allowing update
    const [existing] = await db
      .select({ userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, id));

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { files, sandboxId, name } = body;

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (files !== undefined) updateData.files = files;
    if (sandboxId !== undefined) updateData.sandboxId = sandboxId;
    if (name !== undefined) updateData.name = name;

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: updatedProject
    });
  } catch (error) {
    console.error('[PATCH /api/projects/[id]] Error:', error);
    return NextResponse.json({
      error: 'Failed to update project'
    }, { status: 500 });
  }
}
