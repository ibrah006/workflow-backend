import { Server as HTTPServer } from 'http';
import { CompanyWebSocketService } from './company.websocketservice';

let companyWebSocketService: CompanyWebSocketService;

/**
 * Initialize Company WebSocket server
 */
export function initializeCompanyWebSocket(httpServer: HTTPServer): CompanyWebSocketService {
  if (!companyWebSocketService) {
    companyWebSocketService = new CompanyWebSocketService(httpServer);
    console.log('Company WebSocket server initialized');
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