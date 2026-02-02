// src/components/modals/DataConfigurationModal.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Hash, Search, GripVertical, HelpCircle } from 'lucide-react';
import './DataConfigurationModal.css';

// Types
export interface FieldInfo {
  id: string;
  name: string;
  displayName?: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable?: boolean;
  unique?: boolean;
  sampleValue?: string;
  sampleValues?: string[];
  uniqueCount?: number;
  nullCount?: number;
  dataSourceId?: string;
  tableName?: string;
}

export interface ChartTypeInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  library: string;
  dataRequirements: {
    requiredFields: string[];
    optionalFields: string[];
    axes: {
      [key: string]: {
        supportedTypes: string[];
        required: boolean;
        multipleFields?: boolean;
      };
    };
  };
}

export interface FieldAssignments {
  [axisType: string]: FieldInfo | FieldInfo[] | null;
}

export interface DataConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChart: ChartTypeInfo;
  availableFields: FieldInfo[];
  onConfigComplete: (config: {
    fieldAssignments: FieldAssignments;
    aggregations: any;
    filters: any;
    customConfig: any;
  }) => void;
}

const DataConfigurationModal: React.FC<DataConfigurationModalProps> = ({
  isOpen,
  onClose,
  selectedChart,
  availableFields,
  onConfigComplete
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'custom'>('data');
  const [fieldAssignments, setFieldAssignments] = useState<FieldAssignments>({});
  const [aggregations, setAggregations] = useState<any>({});
  const [filters, setFilters] = useState<any>({});
  const [customConfig, setCustomConfig] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when modal opens/closes or chart changes
  useEffect(() => {
    if (isOpen) {
      setFieldAssignments({});
      setValidationErrors([]);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, selectedChart.id]);

  const handleConfigComplete = useCallback(() => {
    // Validate required fields
    const errors = validateRequiredFields();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    onConfigComplete({
      fieldAssignments,
      aggregations,
      filters,
      customConfig
    });
    onClose();
  }, [fieldAssignments, aggregations, filters, customConfig, onConfigComplete, onClose]);

  const validateRequiredFields = () => {
    const errors: string[] = [];
    const requiredAxes = Object.entries(selectedChart.dataRequirements.axes)
      .filter(([_, config]) => config.required);

    requiredAxes.forEach(([axisType, config]) => {
      const assignment = fieldAssignments[axisType];
      if (!assignment || (Array.isArray(assignment) && assignment.length === 0)) {
        errors.push(`${axisType.replace('-', ' ')} is required for ${selectedChart.name}`);
      }
    });

    return errors;
  };

  const handleExportConfig = () => {
    const configData = {
      chartType: selectedChart.id,
      chartLibrary: selectedChart.library,
      fieldAssignments,
      aggregations,
      filters,
      customConfig,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedChart.name.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const config = JSON.parse(e.target?.result as string);
            setFieldAssignments(config.fieldAssignments || {});
            setAggregations(config.aggregations || {});
            setFilters(config.filters || {});
            setCustomConfig(config.customConfig || {});
            setHasUnsavedChanges(true);
          } catch (error) {
            alert('Error importing configuration: Invalid JSON file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="data-config-modal">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Configure {selectedChart.name}</h2>
            <span className="chart-library-badge">{selectedChart.library}</span>
          </div>
          
          <div className="modal-tabs">
            <button 
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              📊 Data
            </button>
            <button 
              className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              🎨 Custom
            </button>
          </div>
          
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            <div className="validation-header">
              <span className="error-icon">⚠️</span>
              <span className="error-title">Configuration Required</span>
            </div>
            <ul className="error-list">
              {validationErrors.map((error, index) => (
                <li key={index} className="error-item">{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-body">
          {activeTab === 'data' && (
            <DataTabContent 
              selectedChart={selectedChart}
              availableFields={availableFields}
              fieldAssignments={fieldAssignments}
              onFieldAssignmentChange={(newAssignments) => {
                setFieldAssignments(newAssignments);
                setValidationErrors([]);
                setHasUnsavedChanges(true);
              }}
              aggregations={aggregations}
              onAggregationChange={(newAggregations) => {
                setAggregations(newAggregations);
                setHasUnsavedChanges(true);
              }}
              filters={filters}
              onFilterChange={(newFilters) => {
                setFilters(newFilters);
                setHasUnsavedChanges(true);
              }}
            />
          )}
          
          {activeTab === 'custom' && (
            <CustomTabContent 
              selectedChart={selectedChart}
              config={customConfig}
              onConfigChange={(newConfig) => {
                setCustomConfig(newConfig);
                setHasUnsavedChanges(true);
              }}
            />
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            <div className="dropdown-menu">
              <button className="dropdown-trigger">
                ⋮ More Actions
              </button>
              <div className="dropdown-content">
                <button onClick={handleExportConfig} className="dropdown-item">
                  📤 Export Config
                </button>
                <button onClick={handleImportConfig} className="dropdown-item">
                  📥 Import Config
                </button>
              </div>
            </div>
          </div>
          
          <div className="footer-right">
            <button onClick={onClose} className="secondary-button">
              Cancel
            </button>
            <button 
              onClick={handleConfigComplete}
              className="primary-button"
              disabled={validationErrors.length > 0}
            >
              Apply Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataConfigurationModal;