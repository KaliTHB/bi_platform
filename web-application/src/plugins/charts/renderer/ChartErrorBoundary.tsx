import React from 'react';

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to analytics if available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Chart Error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="chart-error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Chart Rendering Error</h3>
            <p>Something went wrong while rendering the chart.</p>
            
            <details className="error-details">
              <summary>Error Details</summary>
              <div className="error-stack">
                <strong>Error:</strong> {this.state.error?.message}
              </div>
              {this.state.error?.stack && (
                <div className="error-stack">
                  <strong>Stack Trace:</strong>
                  <pre>{this.state.error.stack}</pre>
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div className="component-stack">
                  <strong>Component Stack:</strong>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </details>
            
            <div className="error-actions">
              <button 
                onClick={this.resetError}
                className="retry-button"
              >
                🔄 Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                🔃 Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
export {ChartErrorBoundary};