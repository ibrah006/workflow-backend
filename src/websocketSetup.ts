import { Server as HTTPServer } from 'http';
import express from 'express';
import { TaskWebSocketService } from './websocketservice/task.websocketservice';

let taskWebSocketService: TaskWebSocketService;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): TaskWebSocketService {
  if (!taskWebSocketService) {
    taskWebSocketService = new TaskWebSocketService(httpServer);
    console.log('WebSocket server initialized for task updates');
  }
  return taskWebSocketService;
}

/**
 * Get the WebSocket service instance
 */
export function getTaskWebSocketService(): TaskWebSocketService {
  if (!taskWebSocketService) {
    throw new Error('WebSocket service not initialized. Call initializeWebSocket first.');
  }
  return taskWebSocketService;
}

/**
 * Example Express app setup
 */
export function setupWebSocketServer(app: express.Application): HTTPServer {
  const httpServer = require('http').createServer(app);
  
  // Initialize WebSocket
  initializeWebSocket(httpServer);
  
  return httpServer;
}