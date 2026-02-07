import { io } from 'socket.io-client';

const URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
