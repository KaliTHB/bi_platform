// File: web-application/src/hooks/useWebSocket.ts

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type WebSocketStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

export interface WebSocketEvent {
  type: WebSocketEventType;
  data?: any;
  error?: string;
  timestamp: number;
}

export type WebSocketEventType = 
  | 'dashboard_updated'
  | 'chart_data_changed'
  | 'dataset_refreshed'
  | 'user_joined'
  | 'user_left'
  | 'notification'
  | 'system_status'
  | 'permission_changed'
  | 'workspace_updated'
  | 'category_updated'
  | 'plugin_status_changed'
  | 'audit_event'
  | 'custom';

export interface WebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  reconnectMultiplier?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  enableAuthentication?: boolean;
  enableLogging?: boolean;
}

export interface WebSocketSubscription {
  id: string;
  channel: string;
  callback: (event: WebSocketEvent) => void;
  filter?: (event: WebSocketEvent) => boolean;
}

export interface UseWebSocketResult {
  // Connection status
  status: WebSocketStatus;
  isConnected: boolean;
  isConnecting: boolean;
  lastError: string | null;
  connectionAttempts: number;
  
  // Message handling
  send: (message: WebSocketMessage) => boolean;
  subscribe: (channel: string, callback: (event: WebSocketEvent) => void, filter?: (event: WebSocketEvent) => boolean) => string;
  unsubscribe: (subscriptionId: string) => void;
  
  // Channel management
  joinChannel: (channel: string) => void;
  leaveChannel: (channel: string) => void;
  getActiveChannels: () => string[];
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Statistics
  messagesReceived: number;
  messagesSent: number;
  uptime: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectMultiplier: 1.5,
  enableHeartbeat: true,
  heartbeatInterval: 30000,
  enableAuthentication: true,
  enableLogging: true,
};

// ============================================================================
// Main Hook Implementation
// ============================================================================

export const useWebSocket = (config: WebSocketConfig = {}): UseWebSocketResult => {
  // ============================================================================
  // Configuration
  // ============================================================================
  
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // ============================================================================
  // Redux State
  // ============================================================================
  
  const auth = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // ============================================================================
  // Local State
  // ============================================================================
  
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [messagesSent, setMessagesSent] = useState(0);
  const [uptime, setUptime] = useState(0);

  // ============================================================================
  // Refs for Managing Connection State
  // ============================================================================
  
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Map<string, WebSocketSubscription>>(new Map());
  const activeChannelsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeRef = useRef<number | null>(null);
  const uptimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const log = useCallback((message: string, data?: any) => {
    if (finalConfig.enableLogging) {
      console.log(`[WebSocket] ${message}`, data || '');
    }
  }, [finalConfig.enableLogging]);

  const getAuthHeaders = useCallback(() => {
    if (!finalConfig.enableAuthentication) return {};
    
    const token = auth.token || localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [auth.token, finalConfig.enableAuthentication]);

  const buildWebSocketUrl = useCallback(() => {
    const baseUrl = finalConfig.url.replace(/^http/, 'ws');
    const workspaceParam = currentWorkspace?.id ? `?workspace=${currentWorkspace.id}` : '';
    return `${baseUrl}/ws${workspaceParam}`;
  }, [finalConfig.url, currentWorkspace?.id]);

  const generateSubscriptionId = useCallback(() => {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const startHeartbeat = useCallback(() => {
    if (!finalConfig.enableHeartbeat) return;

    const sendHeartbeat = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          payload: { timestamp: Date.now() },
          timestamp: Date.now()
        }));
      }
    };

    sendHeartbeat();
    heartbeatTimeoutRef.current = setInterval(sendHeartbeat, finalConfig.heartbeatInterval);
  }, [finalConfig.enableHeartbeat, finalConfig.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startUptimeTracking = useCallback(() => {
    connectTimeRef.current = Date.now();
    uptimeIntervalRef.current = setInterval(() => {
      if (connectTimeRef.current) {
        setUptime(Math.floor((Date.now() - connectTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopUptimeTracking = useCallback(() => {
    if (uptimeIntervalRef.current) {
      clearInterval(uptimeIntervalRef.current);
      uptimeIntervalRef.current = null;
    }
    connectTimeRef.current = null;
    setUptime(0);
  }, []);

  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      if (message) {
        wsRef.current.send(JSON.stringify(message));
        setMessagesSent(prev => prev + 1);
      }
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketEvent = JSON.parse(event.data);
      setMessagesReceived(prev => prev + 1);
      
      log('Message received:', message);

      // Notify all relevant subscriptions
      subscriptionsRef.current.forEach((subscription) => {
        try {
          // Check if message matches subscription filter
          if (subscription.filter && !subscription.filter(message)) {
            return;
          }

          // Call subscription callback
          subscription.callback(message);
        } catch (error) {
          console.error(`[WebSocket] Error in subscription callback:`, error);
        }
      });
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', event.data, error);
    }
  }, [log]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus('connecting');
      setLastError(null);
      log('Connecting to WebSocket...', { url: buildWebSocketUrl() });

      const ws = new WebSocket(buildWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        log('WebSocket connected successfully');
        setStatus('connected');
        setConnectionAttempts(0);
        setLastError(null);

        // Send authentication if enabled
        if (finalConfig.enableAuthentication && auth.token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: auth.token },
            timestamp: Date.now()
          }));
        }

        // Rejoin all active channels
        activeChannelsRef.current.forEach(channel => {
          ws.send(JSON.stringify({
            type: 'join_channel',
            payload: { channel },
            timestamp: Date.now()
          }));
        });

        // Process queued messages
        processMessageQueue();

        // Start heartbeat and uptime tracking
        startHeartbeat();
        startUptimeTracking();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        log('WebSocket disconnected', { code: event.code, reason: event.reason });
        setStatus('disconnected');
        stopHeartbeat();
        stopUptimeTracking();

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && connectionAttempts < finalConfig.reconnectAttempts) {
          const delay = Math.min(
            finalConfig.reconnectInterval * Math.pow(finalConfig.reconnectMultiplier, connectionAttempts),
            finalConfig.maxReconnectInterval
          );

          log(`Attempting reconnection in ${delay}ms (attempt ${connectionAttempts + 1}/${finalConfig.reconnectAttempts})`);
          setStatus('reconnecting');
          setConnectionAttempts(prev => prev + 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (connectionAttempts >= finalConfig.reconnectAttempts) {
          setLastError('Max reconnection attempts reached');
          setStatus('error');
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        setLastError('Connection error occurred');
        setStatus('error');
      };

    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setStatus('error');
      setLastError(error instanceof Error ? error.message : 'Unknown connection error');
    }
  }, [
    auth.token, 
    buildWebSocketUrl, 
    connectionAttempts, 
    finalConfig, 
    handleMessage, 
    log, 
    processMessageQueue, 
    startHeartbeat, 
    startUptimeTracking, 
    stopHeartbeat, 
    stopUptimeTracking
  ]);

  const disconnect = useCallback(() => {
    log('Manually disconnecting WebSocket');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    // Reset state
    setStatus('disconnected');
    setConnectionAttempts(0);
    setLastError(null);
    stopHeartbeat();
    stopUptimeTracking();
  }, [log, stopHeartbeat, stopUptimeTracking]);

  const reconnect = useCallback(() => {
    log('Manual reconnection requested');
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect, log]);

  // ============================================================================
  // Message Handling
  // ============================================================================

  const send = useCallback((message: WebSocketMessage): boolean => {
    if (!wsRef.current) {
      log('Cannot send message: WebSocket not initialized');
      return false;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      // Queue message for later delivery
      messageQueueRef.current.push({
        ...message,
        timestamp: Date.now()
      });
      log('Message queued (WebSocket not ready)', message);
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      setMessagesSent(prev => prev + 1);
      log('Message sent', message);
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to send message');
      return false;
    }
  }, [log]);

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const subscribe = useCallback((
    channel: string, 
    callback: (event: WebSocketEvent) => void, 
    filter?: (event: WebSocketEvent) => boolean
  ): string => {
    const id = generateSubscriptionId();
    
    const subscription: WebSocketSubscription = {
      id,
      channel,
      callback,
      filter
    };

    subscriptionsRef.current.set(id, subscription);
    log('Subscription created', { id, channel });

    return id;
  }, [generateSubscriptionId, log]);

  const unsubscribe = useCallback((subscriptionId: string) => {
    if (subscriptionsRef.current.has(subscriptionId)) {
      subscriptionsRef.current.delete(subscriptionId);
      log('Subscription removed', { id: subscriptionId });
    }
  }, [log]);

  // ============================================================================
  // Channel Management
  // ============================================================================

  const joinChannel = useCallback((channel: string) => {
    activeChannelsRef.current.add(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({
        type: 'join_channel',
        payload: { channel },
        timestamp: Date.now()
      });
    }
    
    log('Joined channel', { channel });
  }, [send, log]);

  const leaveChannel = useCallback((channel: string) => {
    activeChannelsRef.current.delete(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({
        type: 'leave_channel',
        payload: { channel },
        timestamp: Date.now()
      });
    }
    
    log('Left channel', { channel });
  }, [send, log]);

  const getActiveChannels = useCallback((): string[] => {
    return Array.from(activeChannelsRef.current);
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-connect on mount and auth/workspace changes
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearInterval(heartbeatTimeoutRef.current);
      }
      if (uptimeIntervalRef.current) {
        clearInterval(uptimeIntervalRef.current);
      }

      // Close connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Clear subscriptions
      subscriptionsRef.current.clear();
      activeChannelsRef.current.clear();
    };
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // Connection status
    status,
    isConnected,
    isConnecting,
    lastError,
    connectionAttempts,
    
    // Message handling
    send,
    subscribe,
    unsubscribe,
    
    // Channel management
    joinChannel,
    leaveChannel,
    getActiveChannels,
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    
    // Statistics
    messagesReceived,
    messagesSent,
    uptime,
  };
};

// ============================================================================
// Convenience Hooks for Specific Use Cases
// ============================================================================

/**
 * Hook for dashboard-specific real-time updates
 */
export const useDashboardWebSocket = (dashboardId: string) => {
  const webSocket = useWebSocket();
  
  useEffect(() => {
    if (dashboardId) {
      webSocket.joinChannel(`dashboard:${dashboardId}`);
      return () => webSocket.leaveChannel(`dashboard:${dashboardId}`);
    }
  }, [dashboardId, webSocket]);
  
  return webSocket;
};

/**
 * Hook for workspace-wide notifications
 */
export const useWorkspaceWebSocket = (workspaceId: string) => {
  const webSocket = useWebSocket();
  
  useEffect(() => {
    if (workspaceId) {
      webSocket.joinChannel(`workspace:${workspaceId}`);
      return () => webSocket.leaveChannel(`workspace:${workspaceId}`);
    }
  }, [workspaceId, webSocket]);
  
  return webSocket;
};

export default useWebSocket;