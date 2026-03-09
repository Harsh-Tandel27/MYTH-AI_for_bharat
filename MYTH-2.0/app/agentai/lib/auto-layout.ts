import dagre from 'dagre';
import { type Node, type Edge } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;

/**
 * Auto-layout nodes using Dagre graph layout algorithm
 * Creates a clean tree/grid structure with no overlapping
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: NODE_WIDTH, 
      height: NODE_HEIGHT 
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      // Adding targetPosition and sourcePosition for proper edge connections
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
    };
  });

  return { nodes: layoutedNodes as Node[], edges };
}

/**
 * Check if nodes need layout (e.g., all at same position)
 */
export function needsLayout(nodes: Node[]): boolean {
  if (nodes.length <= 1) return false;
  
  const positions = nodes.map((n) => `${Math.round(n.position.x)},${Math.round(n.position.y)}`);
  const uniquePositions = new Set(positions);
  
  // If many nodes share the same position, layout is needed
  return uniquePositions.size < nodes.length * 0.5;
}
