import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectVersions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// POST /api/projects/[id]/restore — Restore a specific version
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { versionId } = body;

        if (!versionId) {
            return NextResponse.json(
                { error: 'versionId is required' },
                { status: 400 }
            );
        }

        // Verify project ownership
        const [project] = await db
            .select()
            .from(projects)
            .where(eq(projects.id, id));

        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Get the specific version
        const [version] = await db
            .select()
            .from(projectVersions)
            .where(
                and(
                    eq(projectVersions.id, versionId),
                    eq(projectVersions.projectId, id)
                )
            );

        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        // Update the project's current files to the restored version
        await db
            .update(projects)
            .set({
                files: version.files,
                updatedAt: new Date(),
            })
            .where(eq(projects.id, id));

        console.log(`[projects] Restored project ${id} to version ${version.version}`);

        return NextResponse.json({
            success: true,
            version: version.version,
            files: version.files,
            packages: version.packages,
            message: `Restored to version ${version.version}`,
        });
    } catch (error) {
        console.error('[POST /api/projects/[id]/restore] Error:', error);
        return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
    }
}
