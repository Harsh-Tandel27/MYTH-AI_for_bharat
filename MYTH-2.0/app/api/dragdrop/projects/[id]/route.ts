import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dragdropProjects } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/dragdrop/projects/[id] — load a specific project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        const [project] = await db
            .select()
            .from(dragdropProjects)
            .where(eq(dragdropProjects.id, id));

        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, project });
    } catch (error) {
        console.error('[GET /api/dragdrop/projects/[id]] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}

// PATCH /api/dragdrop/projects/[id] — update an existing project
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { name, themeId, sections } = body;

        const updateData: any = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (themeId !== undefined) updateData.themeId = themeId;
        if (sections !== undefined) updateData.sections = sections;

        const [updated] = await db
            .update(dragdropProjects)
            .set(updateData)
            .where(eq(dragdropProjects.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, project: updated });
    } catch (error) {
        console.error('[PATCH /api/dragdrop/projects/[id]] Error:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

// DELETE /api/dragdrop/projects/[id] — delete a project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // Verify ownership before deleting
        const [project] = await db
            .select()
            .from(dragdropProjects)
            .where(eq(dragdropProjects.id, id));

        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        await db.delete(dragdropProjects).where(eq(dragdropProjects.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE /api/dragdrop/projects/[id]] Error:', error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
