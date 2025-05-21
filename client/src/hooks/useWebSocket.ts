import { useState, useEffect, useCallback } from 'react';
import { WsMessage } from '@/lib/types';

type WebSocketCallback = (data: any) => void;

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const { 
    onMessage, 
    reconnectInterval = 5000, 
    reconnectAttempts = 10 
  } = options;
  
  // Map to store callbacks for specific message types
  const [messageHandlers] = useState<Map<string, WebSocketCallback[]>>(new Map());
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        
        // Attempt to reconnect if not max attempts
        if (reconnectCount < reconnectAttempts) {
          setTimeout(() => {
            setReconnectCount(prevCount => prevCount + 1);
            connect();
          }, reconnectInterval);
        }
      };
      
      ws.onerror = (event) => {
        setError(new Error('WebSocket error'));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsMessage;
          setLastMessage(message);
          
          // Call the general onMessage callback if provided
          if (onMessage) {
            onMessage(message);
          }
          
          // Call specific message type handlers if registered
          if (message.type && messageHandlers.has(message.type)) {
            const handlers = messageHandlers.get(message.type) || [];
            handlers.forEach(handler => handler(message.data));
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      setSocket(ws);
      
      return () => {
        ws.close();
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return () => {};
    }
  }, [onMessage, reconnectCount, reconnectAttempts, reconnectInterval, messageHandlers]);
  
  // Connect on initial render
  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);
  
  // Function to send messages
  const sendMessage = useCallback((type: string, data: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }, [socket, isConnected]);
  
  // Register a callback for a specific message type
  const addMessageHandler = useCallback((type: string, callback: WebSocketCallback) => {
    if (!messageHandlers.has(type)) {
      messageHandlers.set(type, []);
    }
    const handlers = messageHandlers.get(type) || [];
    handlers.push(callback);
    messageHandlers.set(type, handlers);
    
    // Return function to remove the handler
    return () => {
      const updatedHandlers = (messageHandlers.get(type) || [])
        .filter(handler => handler !== callback);
      
      if (updatedHandlers.length > 0) {
        messageHandlers.set(type, updatedHandlers);
      } else {
        messageHandlers.delete(type);
      }
    };
  }, [messageHandlers]);
  
  return {
    socket,
    isConnected,
    error,
    reconnectCount,
    lastMessage,
    sendMessage,
    addMessageHandler,
    connect
  };
}
