import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SlotEventPayload } from '@slotlive/shared';

@WebSocketGateway({
  namespace: 'availability',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        });
        client.data.user = payload;
        this.logger.debug(`Socket connected & authenticated: ${client.id} (User: ${payload.sub})`);
      } else {
        this.logger.debug(`Socket connected anonymously: ${client.id}`);
      }
    } catch {
      this.logger.warn(`Socket connection auth failed: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:resource')
  handleSubscribeResource(
    @ConnectedSocket() client: Socket,
    @MessageBody() resourceId: string,
  ) {
    const room = `resource:${resourceId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
    return { status: 'subscribed', room };
  }

  @SubscribeMessage('unsubscribe:resource')
  handleUnsubscribeResource(
    @ConnectedSocket() client: Socket,
    @MessageBody() resourceId: string,
  ) {
    const room = `resource:${resourceId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
    return { status: 'unsubscribed', room };
  }

  // Broadcasters called by BookingsService & Stripe webhook
  emitSlotHeld(resourceId: string, payload: SlotEventPayload) {
    this.server.to(`resource:${resourceId}`).emit('slot.held', payload);
  }

  emitSlotReleased(resourceId: string, payload: SlotEventPayload) {
    this.server.to(`resource:${resourceId}`).emit('slot.released', payload);
  }

  emitSlotConfirmed(resourceId: string, payload: SlotEventPayload) {
    this.server.to(`resource:${resourceId}`).emit('slot.confirmed', payload);
  }

  emitSlotCancelled(resourceId: string, payload: SlotEventPayload) {
    this.server.to(`resource:${resourceId}`).emit('slot.cancelled', payload);
  }
}
