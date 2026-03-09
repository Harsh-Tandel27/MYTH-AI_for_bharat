import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectVersions } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/projects/[id]/versions — List all versions for a project
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

        // Verify project ownership
        const [project] = await db
            .select({ id: projects.id, userId: projects.userId, currentVersion: projects.currentVersion })
            .from(projects)
            .where(eq(projects.id, id));

        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Get all versions (without file contents for listing — files can be large)
        const versions = await db
            .select({
                id: projectVersions.id,
                version: projectVersions.version,
                prompt: projectVersions.prompt,
                message: projectVersions.message,
                createdAt: projectVersions.createdAt,
            })
            .from(projectVersions)
            .where(eq(projectVersions.projectId, id))
            .orderBy(desc(projectVersions.version));

        return NextResponse.json({
            success: true,
            currentVersion: project.currentVersion,
            versions,
        });
    } catch (error) {
        console.error('[GET /api/projects/[id]/versions] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }
}

// POST /api/projects/[id]/versions — Save a new version snapshot
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
        const { files, packages = [], prompt = '', message = '' } = body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json(
                { error: 'files array is required' },
                { status: 400 }
            );
        }

        // Verify project ownership and get current version
        const [project] = await db
            .select()
            .from(projects)
            .where(eq(projects.id, id));

        if (!project || project.userId !== userId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const newVersionNum = (project.currentVersion || 0) + 1;
        const versionId = crypto.randomUUID();

        // Create the version snapshot
        await db.insert(projectVersions).values({
            id: versionId,
            projectId: id,
            version: newVersionNum,
            files,
            packages,
            prompt,
            message: message || `Version ${newVersionNum}`,
            createdAt: new Date(),
        });

        // Update the project's current files and version number
        await db
            .update(projects)
            .set({
                files,
                currentVersion: newVersionNum,
                updatedAt: new Date(),
            })
            .where(eq(projects.id, id));

        console.log(`[projects] Saved version ${newVersionNum} for project ${id} (${files.length} files)`);

        return NextResponse.json({
            success: true,
            version: {
                id: versionId,
                version: newVersionNum,
                message: message || `Version ${newVersionNum}`,
                filesCount: files.length,
            },
        });
    } catch (error) {
        console.error('[POST /api/projects/[id]/versions] Error:', error);
        return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
    }
}
