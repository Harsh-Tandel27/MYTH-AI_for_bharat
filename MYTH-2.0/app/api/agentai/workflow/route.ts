import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectMongoDB from '@/lib/mongodb';
import Workflow from '@/lib/models/workflow.model';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, name, flowData, prompt } = await request.json();

    if (!flowData || !flowData.nodes || !flowData.edges) {
      return NextResponse.json(
        { error: 'Invalid workflow data' },
        { status: 400 }
      );
    }

    await connectMongoDB();

    let workflow;

    if (id) {
      // Update existing workflow
      workflow = await Workflow.findOneAndUpdate(
        { _id: id, userId },
        {
          name: name || 'Untitled Workflow',
          flowData,
          $push: prompt ? { promptHistory: prompt } : {},
        },
        { new: true }
      );

      if (!workflow) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }
    } else {
      // Create new workflow
      workflow = await Workflow.create({
        name: name || 'Untitled Workflow',
        userId,
        flowData,
        promptHistory: prompt ? [prompt] : [],
      });
    }

    console.log('[Workflow Save] Saved workflow:', workflow._id);

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow._id.toString(),
        name: workflow.name,
        updatedAt: workflow.updatedAt,
      },
    });

  } catch (error) {
    console.error('[Workflow Save] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save workflow' },
      { status: 500 }
    );
  }
}

// GET: List all workflows for user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectMongoDB();

    const workflows = await Workflow.find({ userId })
      .select('name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      workflows: workflows.map((w: any) => ({
        id: w._id.toString(),
        name: w.name,
        updatedAt: w.updatedAt,
      })),
    });

  } catch (error) {
    console.error('[Workflow List] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list workflows' },
      { status: 500 }
    );
  }
}
