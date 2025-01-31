export interface Server {
  name: string;
  version: string;
}

export interface ServerConfig {
  capabilities: {
    tools: Record<string, unknown>;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface McpError extends Error {
  code: string;
}

export const ErrorCode = {
  MethodNotFound: 'METHOD_NOT_FOUND',
  InternalError: 'INTERNAL_ERROR',
  InvalidRequest: 'INVALID_REQUEST'
} as const;
