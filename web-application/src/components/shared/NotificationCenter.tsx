import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { RootState } from '../../store';

export const NotificationCenter: React.FC = () => {
  const notifications = useSelector((state: RootState) => 
    state.ui?.notifications || []
  );
  const dispatch = useDispatch();

  // If no notifications or no UI state, render nothing
  if (!notifications.length) {
    return null;
  }

  const latestNotification = notifications[0];

  const handleClose = () => {
    // Remove notification from state if you have the action
    // dispatch(removeNotification(latestNotification.id));
  };

  return (
    <Snackbar
      open={true}
      autoHideDuration={latestNotification.autoHide !== false ? 6000 : null}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={handleClose}
        severity={latestNotification.type || 'info'}
        variant="filled"
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      >
        <strong>{latestNotification.title}</strong>
        {latestNotification.message && (
          <div>{latestNotification.message}</div>
        )}
      </Alert>
    </Snackbar>
  );
};