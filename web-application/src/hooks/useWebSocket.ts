// File: src/hooks/useWebSocket.ts

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
  | 'custom'
  // System/heartbeat messages
  | 'ping'
  | 'pong'
  | 'join_channel'
  | 'leave_channel'
  | 'error';

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
  // Merge with default config
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // State management
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [messagesSent, setMessagesSent] = useState(0);
  const [uptime, setUptime] = useState(0);

  // Redux selectors
  const auth = useSelector((state: RootState) => state.auth);
  const currentWorkspace = useSelector((state: RootState) => state.workspace.currentWorkspace);

  // Refs for persistent data
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Map<string, WebSocketSubscription>>(new Map());
  const activeChannelsRef = useRef<Set<string>>(new Set());
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uptimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(0);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const log = useCallback((message: string, data?: any) => {
    if (finalConfig.enableLogging) {
      console.log(`[WebSocket] ${message}`, data ? data : '');
    }
  }, [finalConfig.enableLogging]);

  const generateSubscriptionId = useCallback(() => {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const buildWebSocketUrl = useCallback((baseUrl: string): string => {
    const url = new URL(baseUrl);
    
    if (finalConfig.enableAuthentication && auth.token) {
      url.searchParams.set('token', auth.token);
    }
    
    if (currentWorkspace?.id) {
      url.searchParams.set('workspace', currentWorkspace.id);
    }
    
    return url.toString();
  }, [finalConfig.enableAuthentication, auth.token, currentWorkspace?.id]);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const startHeartbeat = useCallback(() => {
    if (!finalConfig.enableHeartbeat) return;

    stopHeartbeat();
    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.enableHeartbeat, finalConfig.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startUptimeTracking = useCallback(() => {
    connectionStartTimeRef.current = Date.now();
    uptimeIntervalRef.current = setInterval(() => {
      setUptime(Date.now() - connectionStartTimeRef.current);
    }, 1000);
  }, []);

  const stopUptimeTracking = useCallback(() => {
    if (uptimeIntervalRef.current) {
      clearInterval(uptimeIntervalRef.current);
      uptimeIntervalRef.current = null;
    }
    setUptime(0);
  }, []);

  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (message && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        setMessagesSent(prev => prev + 1);
        log('Queued message sent', message);
      }
    }
  }, [log]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketEvent = JSON.parse(event.data);
      setMessagesReceived(prev => prev + 1);
      
      // Handle system messages
      if (message.type === 'pong') {
        // Heartbeat response - no action needed
        return;
      }

      // Process subscriptions
      subscriptionsRef.current.forEach((subscription) => {
        // Check if message is for this channel (simple channel matching)
        const messageChannel = message.data?.channel || 'global';
        if (subscription.channel === messageChannel || subscription.channel === 'global') {
          // Apply filter if provided
          if (!subscription.filter || subscription.filter(message)) {
            try {
              subscription.callback(message);
            } catch (error) {
              console.error('[WebSocket] Error in subscription callback:', error);
            }
          }
        }
      });

      log('Message received', message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
      log('Invalid message received', event.data);
    }
  }, [log]);

  const scheduleReconnect = useCallback(() => {
    if (connectionAttempts >= finalConfig.reconnectAttempts) {
      log('Max reconnection attempts reached');
      setStatus('error');
      setLastError('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      finalConfig.reconnectInterval * Math.pow(finalConfig.reconnectMultiplier, connectionAttempts),
      finalConfig.maxReconnectInterval
    );

    log(`Scheduling reconnection in ${delay}ms (attempt ${connectionAttempts + 1}/${finalConfig.reconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionAttempts(prev => prev + 1);
      connect();
    }, delay);
  }, [connectionAttempts, finalConfig, log]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket already connecting or connected');
      return;
    }

    try {
      const url = buildWebSocketUrl(finalConfig.url);
      log('Connecting to WebSocket', { url: finalConfig.url, attempts: connectionAttempts });
      
      setStatus('connecting');
      setLastError(null);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        log('WebSocket connected');
        setStatus('connected');
        setConnectionAttempts(0);
        setLastError(null);
        
        // Re-join active channels
        activeChannelsRef.current.forEach(channel => {
          wsRef.current?.send(JSON.stringify({
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

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onerror = (error) => {
        log('WebSocket error', error);
        setLastError('Connection error occurred');
      };

      wsRef.current.onclose = (event) => {
        log('WebSocket closed', { code: event.code, reason: event.reason });
        setStatus('disconnected');
        stopHeartbeat();
        stopUptimeTracking();
        
        if (event.code !== 1000 && connectionAttempts < finalConfig.reconnectAttempts) {
          setStatus('reconnecting');
          scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
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
    scheduleReconnect,
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
    // FIXED: Return a no-op cleanup function to ensure consistent return behavior
    return () => {
      // No cleanup needed when dashboardId is empty
    };
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
    // FIXED: Return a no-op cleanup function to ensure consistent return behavior
    return () => {
      // No cleanup needed when workspaceId is empty
    };
  }, [workspaceId, webSocket]);
  
  return webSocket;
};

export default useWebSocket;