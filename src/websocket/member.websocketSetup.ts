import { Server as HTTPServer } from 'http';
import { MemberWebSocketService } from './member.websocketservice';
import { Server as SocketIOServer } from 'socket.io';

let memberWebSocketService: MemberWebSocketService;

/**
 * Initialize Member WebSocket server
 */
export function initializeMemberWebSocket(
  // httpServer: HTTPServer
  io: SocketIOServer
): MemberWebSocketService {
  if (!memberWebSocketService) {
    memberWebSocketService = new MemberWebSocketService(io);
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