import mongoose, { Schema, model, models, type Document } from 'mongoose';

// A single file in a project version
export interface IProjectFile {
    path: string;
    content: string;
}

// A snapshot of the project at a point in time
export interface IProjectVersion {
    version: number;
    files: IProjectFile[];
    packages: string[];
    prompt: string;
    message: string;
    createdAt: Date;
}

// The full project document
export interface IProject extends Document {
    name: string;
    sourceUrl: string;
    userId: string;
    currentVersion: number;
    versions: IProjectVersion[];
    thumbnail: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectFileSchema = new Schema<IProjectFile>(
    {
        path: { type: String, required: true },
        content: { type: String, required: true },
    },
    { _id: false }
);

const ProjectVersionSchema = new Schema<IProjectVersion>(
    {
        version: { type: Number, required: true },
        files: { type: [ProjectFileSchema], required: true },
        packages: { type: [String], default: [] },
        prompt: { type: String, default: '' },
        message: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const ProjectSchema = new Schema<IProject>(
    {
        name: {
            type: String,
            required: true,
            default: 'Untitled Project',
        },
        sourceUrl: {
            type: String,
            default: '',
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        currentVersion: {
            type: Number,
            default: 1,
        },
        versions: {
            type: [ProjectVersionSchema],
            default: [],
        },
        thumbnail: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast lookups
ProjectSchema.index({ userId: 1, updatedAt: -1 });
ProjectSchema.index({ sourceUrl: 1 });

const Project = models.Project || model<IProject>('Project', ProjectSchema);

export default Project;
