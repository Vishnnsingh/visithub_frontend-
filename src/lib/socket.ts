import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function socketOrigin() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  return String(base).replace(/\/api\/v1\/?$/, '');
}

export function getSocket() {
  if (!socket) {
    socket = io(socketOrigin(), { transports: ['websocket', 'polling'], withCredentials: true });
  }
  return socket;
}
