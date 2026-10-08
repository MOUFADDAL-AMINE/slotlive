import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/availability`, {
      autoConnect: true,
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  } else if (token) {
    socket.auth = { token };
  }

  return socket;
}
