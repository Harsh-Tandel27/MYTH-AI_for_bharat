import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlProjects, urlProjectVersions } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET — List all versions for a URL AI project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const [project] = await db.select({ id: urlProjects.id, userId: urlProjects.userId, currentVersion: urlProjects.currentVersion }).from(urlProjects).where(eq(urlProjects.id, id));
        if (!project || project.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const versions = await db
            .select({ id: urlProjectVersions.id, version: urlProjectVersions.version, prompt: urlProjectVersions.prompt, message: urlProjectVersions.message, createdAt: urlProjectVersions.createdAt })
            .from(urlProjectVersions)
            .where(eq(urlProjectVersions.projectId, id))
            .orderBy(desc(urlProjectVersions.version));

        return NextResponse.json({ success: true, currentVersion: project.currentVersion, versions });
    } catch (error) {
        console.error('[urlai-versions] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }
}

// POST — Save a new version snapshot
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { files, packages = [], prompt = '', message = '' } = body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({ error: 'files array is required' }, { status: 400 });
        }

        const [project] = await db.select().from(urlProjects).where(eq(urlProjects.id, id));
        if (!project || project.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const newVersion = (project.currentVersion || 0) + 1;

        await db.insert(urlProjectVersions).values({
            id: crypto.randomUUID(),
            projectId: id,
            version: newVersion,
            files,
            packages,
            prompt,
            message: message || `Version ${newVersion}`,
            createdAt: new Date(),
        });

        await db.update(urlProjects).set({ files, currentVersion: newVersion, updatedAt: new Date() }).where(eq(urlProjects.id, id));

        console.log(`[urlai-versions] Saved v${newVersion} for project ${id}`);
        return NextResponse.json({ success: true, version: { version: newVersion, filesCount: files.length } });
    } catch (error) {
        console.error('[urlai-versions] POST error:', error);
        return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
    }
}
