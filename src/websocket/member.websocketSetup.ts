import { Server as HTTPServer } from 'http';
import { MemberWebSocketService } from './member.websocketservice';

let memberWebSocketService: MemberWebSocketService;

/**
 * Initialize Member WebSocket server
 */
export function initializeMemberWebSocket(httpServer: HTTPServer): MemberWebSocketService {
  if (!memberWebSocketService) {
    memberWebSocketService = new MemberWebSocketService(httpServer);
    console.log('Member WebSocket server initialized');
  }
  return memberWebSocketService;
}

/**
 * Get the Member WebSocket service instance
 */
export function getMemberWebSocketService(): MemberWebSocketService {
  if (!memberWebSocketService) {
    throw new Error('Member WebSocket service not initialized. Call initializeMemberWebSocket first.');
  }
  return memberWebSocketService;
}