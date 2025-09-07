import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BarChart3, Settings, Download, Share, Save } from 'lucide-react';
import DataConfigurationModal from '@/components/modals/DataConfigurationModal';
import ChartFactoryRenderer from '@/components/chart/ChartFactoryRenderer';
import ChartErrorBoundary from '@/components/chart/ChartErrorBoundary';
import { useChartDiscovery } from '@/hooks/useChartDiscovery';
import { useChartCreation } from '@/hooks/useChartCreation';
import { ChartTypeInfo, FieldInfo, FieldAssignments } from '@/types/chart.types';


const ChartBuilder: React.FC = () => {
  // Chart Selection State
  const [selectedChart, setSelectedChart] = useState<ChartTypeInfo | null>(null);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  // Chart Configuration State
  const [fieldAssignments, setFieldAssignments] = useState<FieldAssignments>({});
  const [aggregations, setAggregations] = useState<any>({});
  const [filters, setFilters] = useState<any>({});
  const [customConfig, setCustomConfig] = useState<any>({});

  // Chart Creation State
  const [currentChart, setCurrentChart] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  // Hooks
  const { 
    chartCategories, 
    isLoading: isDiscovering, 
    error: discoveryError,
    refetch: refetchCharts 
  } = useChartDiscovery();

  const { 
    isCreating, 
    creationError, 
    creationWarnings, 
    createChart, 
    clearError 
  } = useChartCreation();

  // Mock available fields (replace with your actual data source)
  const availableFields: FieldInfo[] = useMemo(() => [
    {
      id: 'sales_amount',
      name: 'sales_amount',
      displayName: 'Sales Amount',
      type: 'number',
      nullable: false,
      unique: false,
      sampleValue: '$45,200',
      sampleValues: ['$45,200', '$32,100', '$67,890', '$23,450', '$89,230'],
      uniqueCount: 1247,
      nullCount: 0,
      dataSourceId: 'sales-db',
      tableName: 'transactions'
    },
    {
      id: 'product_name',
      name: 'product_name',
      displayName: 'Product Name',
      type: 'string',
      nullable: false,
      unique: true,
      sampleValue: 'MacBook Pro',
      sampleValues: ['MacBook Pro', 'iPhone 15', 'iPad Air', 'AirPods Pro', 'Apple Watch'],
      uniqueCount: 45,
      nullCount: 0,
      dataSourceId: 'sales-db',
      tableName: 'products'
    },
    {
      id: 'order_date',
      name: 'order_date',
      displayName: 'Order Date',
      type: 'date',
      nullable: false,
      unique: false,
      sampleValue: '2024-03-15',
      sampleValues: ['2024-03-15', '2024-03-14', '2024-03-13', '2024-03-12', '2024-03-11'],
      uniqueCount: 365,
      nullCount: 0,
      dataSourceId: 'sales-db',
      tableName: 'transactions'
    },
    {
      id: 'category',
      name: 'category',
      displayName: 'Product Category',
      type: 'string',
      nullable: false,
      unique: false,
      sampleValue: 'Electronics',
      sampleValues: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'],
      uniqueCount: 12,
      nullCount: 0,
      dataSourceId: 'sales-db',
      tableName: 'products'
    }
  ], []);

  // Mock chart data (replace with your actual data loading)
  useEffect(() => {
    // Simulate loading chart data
    setChartData([
      { category: 'Electronics', sales_amount: 45200, order_date: '2024-03-15', product_name: 'MacBook Pro' },
      { category: 'Electronics', sales_amount: 32100, order_date: '2024-03-14', product_name: 'iPhone 15' },
      { category: 'Electronics', sales_amount: 67890, order_date: '2024-03-13', product_name: 'iPad Air' },
      { category: 'Electronics', sales_amount: 23450, order_date: '2024-03-12', product_name: 'AirPods Pro' },
      { category: 'Electronics', sales_amount: 89230, order_date: '2024-03-11', product_name: 'Apple Watch' }
    ]);
  }, []);

  const handleChartSelection = (chart: ChartTypeInfo) => {
    console.log('📊 Chart selected:', chart.name, chart.library);
    setSelectedChart(chart);
    setShowChartSelector(false);
    setShowDataModal(true);
    clearError();
  };

  const handleConfigComplete = async (config: {
    fieldAssignments: FieldAssignments;
    aggregations: any;
    filters: any;
    customConfig: any;
  }) => {
    if (!selectedChart) return;

    console.log('⚙️ Configuration completed:', config);

    // Update state
    setFieldAssignments(config.fieldAssignments);
    setAggregations(config.aggregations);
    setFilters(config.filters);
    setCustomConfig(config.customConfig);

    // Create chart
    const result = await createChart({
      chartType: selectedChart,
      fieldAssignments: config.fieldAssignments,
      aggregations: config.aggregations,
      filters: config.filters,
      customConfig: config.customConfig,
      data: chartData,
      dimensions: { width: 800, height: 400 }
    });

    if (result.success) {
      setCurrentChart(result);
      setShowDataModal(false);
    }
  };

  const handleReconfigureChart = () => {
    if (selectedChart) {
      setShowDataModal(true);
    }
  };

  const renderChartSelector = () => {
    if (isDiscovering) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Discovering available chart types...</p>
        </div>
      );
    }

    if (discoveryError) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Chart Types</h3>
          <p>{discoveryError}</p>
          <button onClick={refetchCharts} className="retry-button">
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="chart-selector-grid">
        {Object.entries(chartCategories).map(([categoryKey, category]) => (
          <div key={categoryKey} className="chart-category-section">
            <h3 className="category-title">
              {category.displayName} ({category.count})
            </h3>
            <div className="chart-grid">
              {category.charts.map((chart) => (
                <div
                  key={`${chart.id}_${chart.library}`}
                  className="chart-option-card"
                  onClick={() => handleChartSelection(chart)}
                >
                  <div className="chart-icon">{chart.icon}</div>
                  <div className="chart-info">
                    <h4 className="chart-name">{chart.name}</h4>
                    <p className="chart-description">{chart.description}</p>
                    <div className="chart-badges">
                      <span className={`library-badge library-${chart.library}`}>
                        {chart.library}
                      </span>
                      {chart.library === 'd3js' && (
                        <span className="priority-badge">PRIORITY</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderChartPreview = () => {
    if (isCreating) {
      return (
        <div className="chart-creation-loading">
          <div className="loading-spinner-professional"></div>
          <div className="loading-message">Creating your chart...</div>
          <div className="loading-steps">
            <div className="loading-step active">🔍 Validating configuration</div>
            <div className="loading-step">🔄 Mapping data fields</div>
            <div className="loading-step">🏭 Initializing Chart Factory</div>
            <div className="loading-step">🎨 Rendering chart</div>
          </div>
        </div>
      );
    }

    if (creationError) {
      return (
        <div className="creation-error">
          <div className="error-icon">❌</div>
          <h3>Chart Creation Failed</h3>
          <p>{creationError}</p>
          {selectedChart && (
            <button onClick={handleReconfigureChart} className="reconfigure-button">
              🔧 Reconfigure Chart
            </button>
          )}
          <button onClick={clearError} className="dismiss-button">
            Dismiss
          </button>
        </div>
      );
    }

    if (!currentChart) {
      return (
        <div className="empty-chart-state">
          <div className="empty-icon">📊</div>
          <h3>Create Your First Chart</h3>
          <p>Select a chart type to get started with data visualization</p>
          <button 
            onClick={() => setShowChartSelector(true)}
            className="add-chart-button"
          >
            <Plus size={20} />
            Add Chart
          </button>
        </div>
      );
    }

    return (
      <ChartErrorBoundary>
        <div className="chart-preview-container">
          {creationWarnings.length > 0 && (
            <div className="chart-warnings">
              <div className="warning-header">
                <span className="warning-icon">⚠️</span>
                <span>Configuration Warnings</span>
              </div>
              <ul className="warning-list">
                {creationWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          <ChartFactoryRenderer
            chartElement={currentChart.chartElement}
            chartType={currentChart.chartType}
            library={currentChart.library}
            config={currentChart.config}
            dimensions={{ width: 800, height: 400 }}
          />
          
          <div className="chart-actions">
            <button 
              onClick={handleReconfigureChart}
              className="action-button"
            >
              <Settings size={16} />
              Reconfigure
            </button>
            <button className="action-button">
              <Download size={16} />
              Export
            </button>
            <button className="action-button">
              <Share size={16} />
              Share
            </button>
            <button className="action-button primary">
              <Save size={16} />
              Save Chart
            </button>
          </div>
        </div>
      </ChartErrorBoundary>
    );
  };

  return (
    <div className="chart-builder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Chart Builder</h1>
          <p className="page-description">
            Create interactive charts with Chart Factory integration
          </p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowChartSelector(true)}
            className="primary-button"
          >
            <Plus size={16} />
            New Chart
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        {!selectedChart ? (
          <div className="chart-selection-section">
            <div className="section-header">
              <h2>Select Chart Type</h2>
              <p>Choose from our collection of chart plugins</p>
            </div>
            {renderChartSelector()}
          </div>
        ) : (
          <div className="chart-workspace">
            <div className="workspace-header">
              <div className="selected-chart-info">
                <span className="chart-icon">{selectedChart.icon}</span>
                <div className="chart-details">
                  <h3>{selectedChart.name}</h3>
                  <span className={`library-badge library-${selectedChart.library}`}>
                    {selectedChart.library}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowChartSelector(true)}
                className="change-chart-button"
              >
                Change Chart Type
              </button>
            </div>
            
            <div className="chart-preview-section">
              {renderChartPreview()}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showChartSelector && (
        <div className="modal-overlay" onClick={() => setShowChartSelector(false)}>
          <div className="chart-selector-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Chart Type</h2>
              <button 
                onClick={() => setShowChartSelector(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              {renderChartSelector()}
            </div>
          </div>
        </div>
      )}

      {selectedChart && (
        <DataConfigurationModal
          isOpen={showDataModal}
          onClose={() => setShowDataModal(false)}
          selectedChart={selectedChart}
          availableFields={availableFields}
          onConfigComplete={handleConfigComplete}
        />
      )}
    </div>
  );
};

export default ChartBuilder;