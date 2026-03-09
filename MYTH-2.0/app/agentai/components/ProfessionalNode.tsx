'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface ProfessionalNodeData {
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

const ProfessionalNode = memo(({ data, selected }: NodeProps<ProfessionalNodeData>) => {
    return (
        <div
            className={`
        min-w-[180px] px-4 py-3 rounded-lg
        bg-[#111111] border transition-all duration-200
        ${selected ? 'border-white/40 shadow-lg' : 'border-[#262626]'}
      `}
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !bg-[#444444] !border-[#262626]"
            />

            <div className="flex items-center gap-2">
                {data.icon && (
                    <div className="text-gray-400">
                        {data.icon}
                    </div>
                )}
                <div>
                    <div className="text-sm font-medium text-white">
                        {data.label}
                    </div>
                    {data.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                            {data.description}
                        </div>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-2 !h-2 !bg-[#444444] !border-[#262626]"
            />
        </div>
    );
});

ProfessionalNode.displayName = 'ProfessionalNode';

export default ProfessionalNode;
