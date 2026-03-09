import mongoose, { Schema, model, models, type Document } from 'mongoose';

export interface IWorkflow extends Document {
  name: string;
  userId: string;
  flowData: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
  promptHistory: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    name: {
      type: String,
      required: true,
      default: 'Untitled Workflow',
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    flowData: {
      nodes: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          position: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
          },
          data: { type: Schema.Types.Mixed, default: {} },
        },
      ],
      edges: [
        {
          id: { type: String, required: true },
          source: { type: String, required: true },
          target: { type: String, required: true },
        },
      ],
    },
    promptHistory: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
WorkflowSchema.index({ userId: 1, updatedAt: -1 });

const Workflow = models.Workflow || model<IWorkflow>('Workflow', WorkflowSchema);

export default Workflow;
