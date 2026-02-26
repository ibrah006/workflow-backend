import { Server as HTTPServer } from 'http';
import { CompanyWebSocketService } from './company.websocketservice';
import { Server as SocketIOServer } from 'socket.io';

let companyWebSocketService: CompanyWebSocketService;

/**
 * Initialize Company WebSocket server
 */
export function initializeCompanyWebSocket(
  // httpServer: HTTPServer
  io: SocketIOServer
): CompanyWebSocketService {
  if (!companyWebSocketService) {
    companyWebSocketService = new CompanyWebSocketService(io);
  }
  return companyWebSocketService;
}

/**
 * Get the Company WebSocket service instance
 */
export function getCompanyWebSocketService(): CompanyWebSocketService {
  if (!companyWebSocketService) {
    throw new Error('Company WebSocket service not initialized. Call initializeCompanyWebSocket first.');
  }
  return companyWebSocketService;
}