import React, { useEffect, useState, useRef } from 'react';
import ChartErrorBoundary from '@/components/chart/ChartErrorBoundary';

interface ChartFactoryRendererProps {
  chartElement: React.ReactElement;
  chartType: string;
  library: string;
  config: any;
  dimensions: { width: number; height: number };
  onInteraction?: (event: any) => void;
  onError?: (error: Error) => void;
}

const ChartFactoryRenderer: React.FC<ChartFactoryRendererProps> = ({
  chartElement,
  chartType,
  library,
  config,
  dimensions,
  onInteraction,
  onError
}) => {
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRendering(false);
    }, 500); // Allow time for chart to render

    return () => clearTimeout(timer);
  }, [chartElement]);

  const handleChartError = (error: Error) => {
    console.error('Chart rendering error:', error);
    setRenderError(error.message);
    onError?.(error);
  };

  const handleChartInteraction = (event: any) => {
    console.log('Chart interaction:', event);
    onInteraction?.(event);
  };

  if (renderError) {
    return (
      <div className="chart-render-error">
        <div className="error-icon">❌</div>
        <h4>Chart Rendering Failed</h4>
        <p>{renderError}</p>
        <div className="chart-info">
          <span>Type: {chartType}</span>
          <span>Library: {library}</span>
        </div>
      </div>
    );
  }

  return (
    <ChartErrorBoundary onError={handleChartError}>
      <div 
        ref={containerRef}
        className="chart-factory-renderer"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          position: 'relative'
        }}
      >
        {isRendering && (
          <div className="chart-rendering-overlay">
            <div className="rendering-spinner"></div>
            <span>Rendering chart...</span>
          </div>
        )}
        
        <div 
          className={`chart-container ${isRendering ? 'rendering' : 'rendered'}`}
          onClick={handleChartInteraction}
        >
          {chartElement}
        </div>

        {/* Chart Metadata */}
        <div className="chart-metadata">
          <span className="chart-type-badge">{chartType}</span>
          <span className={`library-badge library-${library}`}>
            {library}
          </span>
        </div>
      </div>
    </ChartErrorBoundary>
  );
};

export default ChartFactoryRenderer;