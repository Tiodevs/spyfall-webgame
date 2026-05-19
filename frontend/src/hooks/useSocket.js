import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const useSocket = (onReconnect) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketInstance.on('connect', () => {
      console.log('Conectado ao servidor Socket.io');
      setIsConnected(true);
      setIsReconnecting(false);
      if (onReconnectRef.current) {
        onReconnectRef.current(socketInstance);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.io');
      setIsConnected(false);
      setIsReconnecting(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Erro na conexão:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected, isReconnecting };
};
