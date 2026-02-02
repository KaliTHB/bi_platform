// web-application/src/components/shared/NotificationCenter.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Popover, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  IconButton, 
  Typography, 
  Box,
  Divider,
  Badge,
  Chip,
  Paper
} from '@mui/material';
import { Close, Circle } from '@mui/icons-material';
import { RootState } from '../../store';
import { removeNotification } from '../../store/slices/uiSlice';
import { formatTimestamp } from '../../utils';

// Define the notification type that matches the Redux state
interface UINotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  autoHide?: boolean;
  duration?: number;
}

interface NotificationCenterProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  anchorEl,
  open,
  onClose
}) => {
  const notifications: UINotification[] = useSelector((state: RootState) => 
    state.ui?.notifications || []
  );
  const dispatch = useDispatch();

  const handleNotificationClose = (notificationId: string) => {
    dispatch(removeNotification(notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: { 
          width: 360, 
          maxHeight: 400,
          mt: 1
        }
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Badge badgeContent={unreadCount} color="error" />
          )}
        </Box>
      </Box>
      
      {notifications.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No notifications
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0, maxHeight: 320, overflow: 'auto' }}>
          {notifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <Box display="flex" alignItems="flex-start" width="100%" gap={1}>
                  {!notification.read && (
                    <Circle 
                      sx={{ 
                        fontSize: 8, 
                        color: 'primary.main',
                        mt: 1
                      }} 
                    />
                  )}
                  <Box flex={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {notification.title}
                    </Typography>
                    {notification.message && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          mt: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notification.message}
                      </Typography>
                    )}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                      <Chip
                        label={notification.type}
                        size="small"
                        color={
                          notification.type === 'error' ? 'error' :
                          notification.type === 'warning' ? 'warning' :
                          notification.type === 'success' ? 'success' : 'default'
                        }
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.disabled">
                        {formatTimestamp(notification.timestamp || Date.now())}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleNotificationClose(notification.id)}
                    sx={{ mt: 0.5 }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
              {index < notifications.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
      
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              color="primary"
              sx={{ 
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => {
                // Navigate to notifications page or clear all
                // router.replace('/notifications');
                onClose();
              }}
            >
              View All Notifications
            </Typography>
          </Box>
        </>
      )}
    </Popover>
  );
};