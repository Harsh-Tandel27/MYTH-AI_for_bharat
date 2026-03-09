import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlProjects } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/urlai-projects/[id] — Get a specific URL AI project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const [project] = await db.select().from(urlProjects).where(eq(urlProjects.id, id));

        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, project });
    } catch (error) {
        console.error('[urlai-projects/id] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}

// PATCH /api/urlai-projects/[id] — Update project files, sandbox, name
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { files, sandboxId, name, currentVersion } = body;

        const updateData: any = { updatedAt: new Date() };
        if (files !== undefined) updateData.files = files;
        if (sandboxId !== undefined) updateData.sandboxId = sandboxId;
        if (name !== undefined) updateData.name = name;
        if (currentVersion !== undefined) updateData.currentVersion = currentVersion;

        const [updated] = await db.update(urlProjects).set(updateData).where(eq(urlProjects.id, id)).returning();

        if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        return NextResponse.json({ success: true, project: updated });
    } catch (error) {
        console.error('[urlai-projects/id] PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

// DELETE /api/urlai-projects/[id] — Delete a project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const [project] = await db.select().from(urlProjects).where(eq(urlProjects.id, id));
        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        await db.delete(urlProjects).where(eq(urlProjects.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[urlai-projects/id] DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
