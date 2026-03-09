import { type ExecutionContext } from './node-schemas';

/**
 * Variable Resolver - n8n style variable replacement
 * 
 * Resolves template strings like:
 * - "Hello {{trigger.body.name}}" → "Hello John"
 * - "Summary: {{ai_1.text}}" → "Summary: AI generated text..."
 * 
 * Supports nested paths like {{nodeId.path.to.value}}
 */

// Regex to match {{variable.path}} patterns
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Get a nested value from an object using dot notation path
 * @param obj - The object to traverse
 * @param path - Dot-separated path like "body.user.name"
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Format a value for string interpolation
 * @param value - Any value to format
 * @returns String representation of the value
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Resolve all variables in a template string
 * 
 * @param template - String containing {{variable}} placeholders
 * @param context - ExecutionContext with node outputs
 * @returns String with all variables replaced
 * 
 * @example
 * const context = {
 *   trigger: { body: { name: "John" } },
 *   gemini_1: { text: "Hello world" }
 * };
 * resolveVariables("Hello {{trigger.body.name}}, message: {{gemini_1.text}}", context);
 * // Returns: "Hello John, message: Hello world"
 */
export function resolveVariables(template: string, context: ExecutionContext): string {
  return template.replace(VARIABLE_PATTERN, (match, variablePath: string) => {
    // Parse the variable path: nodeId.path.to.value
    const trimmedPath = variablePath.trim();
    const dotIndex = trimmedPath.indexOf('.');
    
    if (dotIndex === -1) {
      // No dot means just the node ID - return the whole output
      const nodeOutput = context[trimmedPath];
      if (nodeOutput === undefined) {
        console.warn(`[VariableResolver] Node "${trimmedPath}" not found in context`);
        return match; // Keep original if not found
      }
      return formatValue(nodeOutput);
    }
    
    const nodeId = trimmedPath.substring(0, dotIndex);
    const valuePath = trimmedPath.substring(dotIndex + 1);
    
    const nodeOutput = context[nodeId];
    if (nodeOutput === undefined) {
      console.warn(`[VariableResolver] Node "${nodeId}" not found in context`);
      return match; // Keep original if not found
    }
    
    const value = getNestedValue(nodeOutput as Record<string, unknown>, valuePath);
    if (value === undefined) {
      console.warn(`[VariableResolver] Path "${valuePath}" not found in node "${nodeId}"`);
      return match; // Keep original if not found
    }
    
    return formatValue(value);
  });
}

/**
 * Extract all variable references from a template
 * 
 * @param template - String containing {{variable}} placeholders
 * @returns Array of variable paths found (without the braces)
 * 
 * @example
 * extractVariables("Hello {{trigger.body.name}}, {{ai.text}}")
 * // Returns: ["trigger.body.name", "ai.text"]
 */
export function extractVariables(template: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    matches.push(match[1].trim());
  }
  
  // Reset regex lastIndex
  VARIABLE_PATTERN.lastIndex = 0;
  
  return matches;
}

/**
 * Get all unique node IDs referenced in a template
 * 
 * @param template - String containing {{variable}} placeholders
 * @returns Array of unique node IDs
 */
export function getReferencedNodeIds(template: string): string[] {
  const variables = extractVariables(template);
  const nodeIds = new Set<string>();
  
  for (const variable of variables) {
    const dotIndex = variable.indexOf('.');
    const nodeId = dotIndex === -1 ? variable : variable.substring(0, dotIndex);
    nodeIds.add(nodeId);
  }
  
  return Array.from(nodeIds);
}

/**
 * Check if all variables in a template can be resolved
 * 
 * @param template - String containing {{variable}} placeholders
 * @param context - ExecutionContext with node outputs
 * @returns object with isValid and missing variables
 */
export function validateVariables(
  template: string,
  context: ExecutionContext
): { isValid: boolean; missing: string[] } {
  const variables = extractVariables(template);
  const missing: string[] = [];
  
  for (const variablePath of variables) {
    const dotIndex = variablePath.indexOf('.');
    const nodeId = dotIndex === -1 ? variablePath : variablePath.substring(0, dotIndex);
    
    if (!context[nodeId]) {
      missing.push(variablePath);
      continue;
    }
    
    if (dotIndex !== -1) {
      const valuePath = variablePath.substring(dotIndex + 1);
      const value = getNestedValue(context[nodeId] as Record<string, unknown>, valuePath);
      if (value === undefined) {
        missing.push(variablePath);
      }
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}
