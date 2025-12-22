/**
 * 🔌 MODEL CONTEXT PROTOCOL (MCP) IMPLEMENTATION
 * 
 * Full MCP Protocol Support for Vision Cortex Brain System
 * Enables seamless inter-AI communication and tool sharing
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

// ============================================================================
// MCP PROTOCOL INTERFACES & TYPES
// ============================================================================

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  text?: string;
  blob?: Buffer;
}

export interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
  experimental?: Record<string, any>;
}

// ============================================================================
// MCP SERVER IMPLEMENTATION
// ============================================================================

export class MCPServer extends EventEmitter {
  private tools: Map<string, Tool> = new Map();
  private resources: Map<string, Resource> = new Map();
  private prompts: Map<string, Prompt> = new Map();
  private clients: Set<WebSocket> = new Set();
  private capabilities: MCPCapabilities;

  constructor(capabilities?: MCPCapabilities) {
    super();
    
    this.capabilities = {
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
      logging: {},
      experimental: {},
      ...capabilities,
    };

    console.log('🔌 MCP Server initialized with capabilities:', this.capabilities);
  }

  /**
   * Register a tool with the MCP server
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.emit('tools/list_changed');
    console.log(`🔧 Tool registered: ${tool.name}`);
  }

  /**
   * Register a resource with the MCP server
   */
  registerResource(resource: Resource): void {
    this.resources.set(resource.uri, resource);
    this.emit('resources/list_changed');
    console.log(`📄 Resource registered: ${resource.uri}`);
  }

  /**
   * Register a prompt with the MCP server
   */
  registerPrompt(prompt: Prompt): void {
    this.prompts.set(prompt.name, prompt);
    this.emit('prompts/list_changed');
    console.log(`💬 Prompt registered: ${prompt.name}`);
  }

  /**
   * Handle MCP client connection
   */
  addClient(client: WebSocket): void {
    this.clients.add(client);
    
    client.on('message', (data) => {
      try {
        const message: MCPMessage = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (error) {
        this.sendError(client, -32700, 'Parse error');
      }
    });

    client.on('close', () => {
      this.clients.delete(client);
    });

    console.log(`🔗 MCP Client connected (${this.clients.size} total)`);
  }

  /**
   * Handle incoming MCP messages
   */
  private async handleMessage(client: WebSocket, message: MCPMessage): Promise<void> {
    try {
      switch (message.method) {
        case 'initialize':
          await this.handleInitialize(client, message);
          break;
        
        case 'tools/list':
          await this.handleToolsList(client, message);
          break;
        
        case 'tools/call':
          await this.handleToolCall(client, message);
          break;
        
        case 'resources/list':
          await this.handleResourcesList(client, message);
          break;
        
        case 'resources/read':
          await this.handleResourceRead(client, message);
          break;
        
        case 'prompts/list':
          await this.handlePromptsList(client, message);
          break;
        
        case 'prompts/get':
          await this.handlePromptGet(client, message);
          break;
        
        default:
          this.sendError(client, -32601, `Method not found: ${message.method}`, message.id);
      }
    } catch (error) {
      console.error('MCP Message handling error:', error);
      this.sendError(client, -32603, 'Internal error', message.id);
    }
  }

  /**
   * Handle initialization request
   */
  private async handleInitialize(client: WebSocket, message: MCPMessage): Promise<void> {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: 'Vision Cortex MCP Server',
          version: '2.0.0',
        },
      },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Handle tools list request
   */
  private async handleToolsList(client: WebSocket, message: MCPMessage): Promise<void> {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: Array.from(this.tools.values()),
      },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Handle tool call request
   */
  private async handleToolCall(client: WebSocket, message: MCPMessage): Promise<void> {
    const { name, arguments: args } = message.params;
    
    if (!this.tools.has(name)) {
      this.sendError(client, -32602, `Tool not found: ${name}`, message.id);
      return;
    }

    try {
      // Emit tool call event for handling by application
      const result = await this.emit('tool_call', { name, arguments: args });
      
      const response: MCPMessage = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        },
      };
      
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendError(client, -32603, `Tool execution failed: ${error}`, message.id);
    }
  }

  /**
   * Handle resources list request
   */
  private async handleResourcesList(client: WebSocket, message: MCPMessage): Promise<void> {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        resources: Array.from(this.resources.values()).map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Handle resource read request
   */
  private async handleResourceRead(client: WebSocket, message: MCPMessage): Promise<void> {
    const { uri } = message.params;
    const resource = this.resources.get(uri);
    
    if (!resource) {
      this.sendError(client, -32602, `Resource not found: ${uri}`, message.id);
      return;
    }

    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType || 'text/plain',
            text: resource.text,
            blob: resource.blob?.toString('base64'),
          },
        ],
      },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Handle prompts list request
   */
  private async handlePromptsList(client: WebSocket, message: MCPMessage): Promise<void> {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        prompts: Array.from(this.prompts.values()),
      },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Handle prompt get request
   */
  private async handlePromptGet(client: WebSocket, message: MCPMessage): Promise<void> {
    const { name, arguments: args } = message.params;
    const prompt = this.prompts.get(name);
    
    if (!prompt) {
      this.sendError(client, -32602, `Prompt not found: ${name}`, message.id);
      return;
    }

    // Emit prompt get event for handling by application
    const result = await this.emit('prompt_get', { name, arguments: args });
    
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        description: prompt.description,
        messages: result || [],
      },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Send error response
   */
  private sendError(client: WebSocket, code: number, message: string, id?: string | number): void {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
    
    client.send(JSON.stringify(response));
  }

  /**
   * Broadcast notification to all clients
   */
  broadcast(method: string, params?: any): void {
    const notification: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };
    
    const message = JSON.stringify(notification);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// ============================================================================
// MCP CLIENT IMPLEMENTATION  
// ============================================================================

export class MCPClient extends EventEmitter {
  private ws?: WebSocket;
  private nextId: number = 1;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();

  constructor(private serverUrl: string) {
    super();
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.on('open', async () => {
        try {
          await this.initialize();
          console.log(`🔗 Connected to MCP server: ${this.serverUrl}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      this.ws.on('message', (data) => {
        try {
          const message: MCPMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('MCP Client message parse error:', error);
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('MCP Client WebSocket error:', error);
        this.emit('error', error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 Disconnected from MCP server');
        this.emit('disconnect');
      });
    });
  }

  /**
   * Initialize MCP connection
   */
  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: false },
        sampling: {},
      },
      clientInfo: {
        name: 'Vision Cortex MCP Client',
        version: '2.0.0',
      },
    });
    
    console.log('MCP Server initialized:', response);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: MCPMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        reject(new Error(`MCP Error ${message.error.code}: ${message.error.message}`));
      } else {
        resolve(message.result);
      }
    } else if (message.method) {
      // Handle notifications
      this.emit('notification', message);
    }
  }

  /**
   * Send request to MCP server
   */
  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('MCP Client not connected'));
        return;
      }
      
      const id = this.nextId++;
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };
      
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(message));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Tool[]> {
    const response = await this.sendRequest('tools/list');
    return response.tools;
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    const response = await this.sendRequest('tools/call', { name, arguments: arguments_ });
    return response;
  }

  /**
   * List available resources
   */
  async listResources(): Promise<Resource[]> {
    const response = await this.sendRequest('resources/list');
    return response.resources;
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<any> {
    const response = await this.sendRequest('resources/read', { uri });
    return response.contents[0];
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<Prompt[]> {
    const response = await this.sendRequest('prompts/list');
    return response.prompts;
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, arguments_?: any): Promise<any> {
    const response = await this.sendRequest('prompts/get', { name, arguments: arguments_ });
    return response;
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a standard MCP tool definition
 */
export function createTool(
  name: string,
  description: string,
  properties: Record<string, any>,
  required?: string[]
): Tool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Create a standard MCP resource definition
 */
export function createResource(
  uri: string,
  name: string,
  content: string,
  mimeType: string = 'text/plain'
): Resource {
  return {
    uri,
    name,
    text: content,
    mimeType,
  };
}

/**
 * Create a standard MCP prompt definition
 */
export function createPrompt(
  name: string,
  description: string,
  arguments_?: Array<{ name: string; description?: string; required?: boolean }>
): Prompt {
  return {
    name,
    description,
    arguments: arguments_,
  };
}