// web-application/src/components/shared/LoadingStates.tsx
import React from 'react';
import {
  Box,
  CircularProgress,
  Skeleton,
  Alert,
  Button,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message = 'Loading...',
  fullScreen = false,
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight={fullScreen ? '100vh' : 200}
    gap={2}
  >
    <CircularProgress size={size} />
    <Typography variant="body2" color="textSecondary">
      {message}
    </Typography>
  </Box>
);

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
}) => (
  <Box>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} display="flex" gap={2} mb={1}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="rectangular"
            height={40}
            sx={{ flex: 1 }}
          />
        ))}
      </Box>
    ))}
  </Box>
);

interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 3 }) => (
  <Box display="flex" flexWrap="wrap" gap={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} sx={{ minWidth: 300, flex: 1 }}>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="100%" height={20} />
          <Skeleton variant="text" width="80%" height={20} />
          <Box mt={2}>
            <Skeleton variant="rectangular" height={100} />
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

interface ErrorStateProps {
  message?: string;
  error?: Error;
  onRetry?: () => void;
  showDetails?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong',
  error,
  onRetry,
  showDetails = false,
}) => (
  <Alert
    severity="error"
    action={
      onRetry && (
        <Button
          color="inherit"
          size="small"
          onClick={onRetry}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      )
    }
  >
    <Typography variant="body2">{message}</Typography>
    {showDetails && error && (
      <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
        {error.message}
      </Typography>
    )}
  </Alert>
);

interface EmptyStateProps {
  message?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No data available',
  description,
  action,
  icon,
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    py={6}
    px={3}
    textAlign="center"
  >
    {icon && (
      <Box sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}>
        {icon}
      </Box>
    )}
    <Typography variant="h6" color="textSecondary" gutterBottom>
      {message}
    </Typography>
    {description && (
      <Typography variant="body2" color="textSecondary" paragraph>
        {description}
      </Typography>
    )}
    {action && (
      <Button variant="contained" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Box>
);