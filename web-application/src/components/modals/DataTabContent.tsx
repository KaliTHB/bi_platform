// src/components/modals/DataTabContent.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, GripVertical, X, Plus, ChevronDown } from 'lucide-react';
import { FieldInfo, ChartTypeInfo, FieldAssignments } from './DataConfigurationModal';

interface DataTabContentProps {
  selectedChart: ChartTypeInfo;
  availableFields: FieldInfo[];
  fieldAssignments: FieldAssignments;
  onFieldAssignmentChange: (assignments: FieldAssignments) => void;
  aggregations: any;
  onAggregationChange: (aggregations: any) => void;
  filters: any;
  onFilterChange: (filters: any) => void;
}

interface DataSource {
  id: string;
  name: string;
  tables: {
    id: string;
    name: string;
    fields: FieldInfo[];
  }[];
}

const DataTabContent: React.FC<DataTabContentProps> = ({
  selectedChart,
  availableFields,
  fieldAssignments,
  onFieldAssignmentChange,
  aggregations,
  onAggregationChange,
  filters,
  onFilterChange
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedDataSources, setExpandedDataSources] = useState<Set<string>>(new Set(['datasource-1']));

  // Group available fields by data source and table (mock structure for now)
  const dataSources: DataSource[] = useMemo(() => {
    // Group fields by dataSourceId and tableName (mock for now)
    const grouped = availableFields.reduce((acc, field) => {
      const sourceId = field.dataSourceId || 'default-source';
      const tableName = field.tableName || 'main-table';
      
      if (!acc[sourceId]) {
        acc[sourceId] = {
          id: sourceId,
          name: sourceId === 'default-source' ? 'Primary Dataset' : sourceId,
          tables: {}
        };
      }
      
      if (!acc[sourceId].tables[tableName]) {
        acc[sourceId].tables[tableName] = {
          id: tableName,
          name: tableName,
          fields: []
        };
      }
      
      acc[sourceId].tables[tableName].fields.push(field);
      return acc;
    }, {} as any);

    return Object.values(grouped).map((source: any) => ({
      ...source,
      tables: Object.values(source.tables)
    }));
  }, [availableFields]);

  // Filter fields based on search
  const filteredFields = useMemo(() => {
    if (!searchQuery) return availableFields;
    
    return availableFields.filter(field => 
      field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableFields, searchQuery]);

  const handleFieldAssign = useCallback((axisType: string, field: FieldInfo) => {
    const axisConfig = selectedChart.dataRequirements.axes[axisType];
    
    if (axisConfig?.multipleFields) {
      // Handle multiple fields
      const currentFields = fieldAssignments[axisType] as FieldInfo[] || [];
      const updatedFields = [...currentFields, field];
      onFieldAssignmentChange({
        ...fieldAssignments,
        [axisType]: updatedFields
      });
    } else {
      // Handle single field - check for conflicts
      const existingField = fieldAssignments[axisType];
      if (existingField && !window.confirm(`Replace existing ${axisType} field "${(existingField as FieldInfo).name}" with "${field.name}"?`)) {
        return;
      }
      
      onFieldAssignmentChange({
        ...fieldAssignments,
        [axisType]: field
      });
    }
  }, [fieldAssignments, selectedChart, onFieldAssignmentChange]);

  const handleFieldRemove = useCallback((axisType: string, fieldId?: string) => {
    if (fieldId) {
      // Remove specific field from multiple fields
      const currentFields = fieldAssignments[axisType] as FieldInfo[] || [];
      const updatedFields = currentFields.filter(f => f.id !== fieldId);
      onFieldAssignmentChange({
        ...fieldAssignments,
        [axisType]: updatedFields.length > 0 ? updatedFields : null
      });
    } else {
      // Remove single field
      onFieldAssignmentChange({
        ...fieldAssignments,
        [axisType]: null
      });
    }
  }, [fieldAssignments, onFieldAssignmentChange]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleDataSource = (sourceId: string) => {
    const newExpanded = new Set(expandedDataSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedDataSources(newExpanded);
  };

  return (
    <div className="data-tab-content">
      {/* Field Assignment Section */}
      <div className="field-assignment-section">
        <div className="section-header">
          <h3>Field Assignments</h3>
          <span className="section-description">Drag fields to assign them to chart axes</span>
        </div>
        
        <div className="assignment-zones">
          {Object.entries(selectedChart.dataRequirements.axes).map(([axisType, config]) => (
            <FieldAssignmentZone
              key={axisType}
              axisType={axisType}
              config={config}
              currentField={fieldAssignments[axisType]}
              onFieldAssign={(field) => handleFieldAssign(axisType, field)}
              onFieldRemove={(fieldId) => handleFieldRemove(axisType, fieldId)}
            />
          ))}
        </div>
      </div>

      {/* Available Fields Section */}
      <div className="available-fields-section">
        <div className="fields-header">
          <div className="header-left">
            <h3>Available Fields</h3>
            <span className="field-count">{availableFields.length} fields</span>
          </div>
          
          <div className="header-controls">
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
                onClick={() => setViewMode('tree')}
              >
                🌳 Tree
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'flat' ? 'active' : ''}`}
                onClick={() => setViewMode('flat')}
              >
                📋 List
              </button>
            </div>
          </div>
        </div>
        
        <div className="search-container">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search fields..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value && viewMode === 'tree') {
                setViewMode('flat');
              }
            }}
          />
        </div>

        <div className="fields-content">
          {viewMode === 'tree' && !searchQuery ? (
            <FieldTreeView 
              dataSources={dataSources}
              expandedDataSources={expandedDataSources}
              onToggleDataSource={toggleDataSource}
              onFieldSelect={handleFieldAssign}
            />
          ) : (
            <FieldGridView 
              fields={filteredFields}
              searchQuery={searchQuery}
              onFieldSelect={handleFieldAssign}
            />
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="collapsible-sections">
        <AccordionSection
          title="📊 Aggregations"
          expanded={expandedSections.has('aggregations')}
          onToggle={() => toggleSection('aggregations')}
        >
          <div className="aggregation-placeholder">
            <p>Aggregation configuration will be implemented in next phase</p>
            <div className="preview-config">
              <label>Default Aggregation:</label>
              <select>
                <option value="sum">SUM</option>
                <option value="avg">AVERAGE</option>
                <option value="count">COUNT</option>
              </select>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="🔍 Filters"
          expanded={expandedSections.has('filters')}
          onToggle={() => toggleSection('filters')}
        >
          <div className="filters-placeholder">
            <p>Advanced filtering will be implemented in next phase</p>
          </div>
        </AccordionSection>

        <AccordionSection
          title="🚀 Advanced Analytics"
          expanded={expandedSections.has('analytics')}
          onToggle={() => toggleSection('analytics')}
        >
          <div className="analytics-placeholder">
            <p>Advanced analytics operations will be added in future releases</p>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
};

// Field Assignment Zone Component
interface FieldAssignmentZoneProps {
  axisType: string;
  config: {
    supportedTypes: string[];
    required: boolean;
    multipleFields?: boolean;
  };
  currentField: FieldInfo | FieldInfo[] | null;
  onFieldAssign: (field: FieldInfo) => void;
  onFieldRemove: (fieldId?: string) => void;
}

const FieldAssignmentZone: React.FC<FieldAssignmentZoneProps> = ({
  axisType,
  config,
  currentField,
  onFieldAssign,
  onFieldRemove
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragValidation, setDragValidation] = useState<{valid: boolean; message?: string}>({valid: true});

  const formatAxisLabel = (axis: string) => {
    return axis.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const validateFieldType = (fieldType: string): {valid: boolean; message?: string} => {
    if (config.supportedTypes.includes(fieldType)) {
      return {valid: true};
    }
    
    // Check for possible casting
    const castingRules = {
      'string': ['number'],
      'number': ['string'],
      'date': ['string'],
      'boolean': ['number', 'string']
    };
    
    const possibleCasts = castingRules[fieldType as keyof typeof castingRules] || [];
    const canCast = config.supportedTypes.some(supportedType => 
      possibleCasts.includes(supportedType)
    );
    
    if (canCast) {
      return {
        valid: true, 
        message: `Field will be converted from ${fieldType}. Consider adding cast metrics in dataset.`
      };
    }
    
    return {
      valid: false,
      message: `${fieldType} is not compatible. Expected: ${config.supportedTypes.join(', ')}`
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const fieldData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      if (fieldData.type) {
        const validation = validateFieldType(fieldData.type);
        setDragValidation(validation);
        setIsDragOver(true);
      }
    } catch (error) {
      setDragValidation({valid: false, message: 'Invalid field data'});
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const fieldData = JSON.parse(e.dataTransfer.getData('application/json'));
      const validation = validateFieldType(fieldData.type);
      
      if (validation.valid) {
        onFieldAssign(fieldData);
      }
    } catch (error) {
      console.error('Error processing dropped field:', error);
    }
  };

  const isEmpty = !currentField || (Array.isArray(currentField) && currentField.length === 0);
  
  return (
    <div 
      className={`field-assignment-zone ${config.required ? 'required' : ''} ${isEmpty ? 'empty' : ''} ${isDragOver ? (dragValidation.valid ? 'drag-over-valid' : 'drag-over-invalid') : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => {
        setIsDragOver(false);
        setDragValidation({valid: true});
      }}
      onDrop={handleDrop}
    >
      <div className="zone-header">
        <div className="zone-label">
          {formatAxisLabel(axisType)}
          {config.required && <span className="required-indicator">*</span>}
        </div>
        <div className="zone-types">
          {config.supportedTypes.map(type => (
            <span key={type} className={`type-indicator ${type}`}>
              {type}
            </span>
          ))}
        </div>
      </div>
      
      <div className="zone-content">
        {Array.isArray(currentField) ? (
          <div className="assigned-fields multiple">
            {currentField.map(field => (
              <FieldChip
                key={field.id}
                field={field}
                onRemove={() => onFieldRemove(field.id)}
                showAggregation={axisType.includes('y-axis')}
              />
            ))}
            {currentField.length === 0 && (
              <div className="drop-placeholder">
                <Plus size={16} />
                <span>Drop multiple fields here</span>
              </div>
            )}
          </div>
        ) : currentField ? (
          <FieldChip
            field={currentField}
            onRemove={() => onFieldRemove()}
            showAggregation={axisType.includes('y-axis')}
          />
        ) : (
          <div className="drop-placeholder">
            <div className="placeholder-icon">
              {getAxisIcon(axisType)}
            </div>
            <span>Drop field here or click to select</span>
            <div className="compatibility-hint">
              Accepts: {config.supportedTypes.join(', ')}
            </div>
          </div>
        )}
      </div>
      
      {isDragOver && dragValidation.message && (
        <div className={`drag-feedback ${dragValidation.valid ? 'valid' : 'invalid'}`}>
          {dragValidation.message}
        </div>
      )}
    </div>
  );
};

// Helper function to get axis icons
const getAxisIcon = (axisType: string) => {
  const icons = {
    'x-axis': '📊',
    'y-axis': '📈',
    'series': '🏷️',
    'filters': '🔍',
    'size': '⭕',
    'color': '🎨'
  };
  return icons[axisType as keyof typeof icons] || '📌';
};

// Field Chip Component
interface FieldChipProps {
  field: FieldInfo;
  onRemove: () => void;
  showAggregation?: boolean;
}

const FieldChip: React.FC<FieldChipProps> = ({ field, onRemove, showAggregation }) => {
  const getTypeIcon = (type: string) => {
    const icons = {
      'number': '📊',
      'string': '📝',
      'date': '📅',
      'boolean': '☑️'
    };
    return icons[type as keyof typeof icons] || '❓';
  };

  return (
    <div className="field-chip">
      <div className="chip-content">
        <span className="chip-icon">{getTypeIcon(field.type)}</span>
        <span className="chip-name">{field.displayName || field.name}</span>
        <span className="chip-type">{field.type}</span>
        {showAggregation && (
          <span className="chip-aggregation">SUM</span>
        )}
      </div>
      <button className="chip-remove" onClick={onRemove}>
        <X size={12} />
      </button>
    </div>
  );
};

// Accordion Section Component
interface AccordionSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, expanded, onToggle, children }) => (
  <div className="accordion-section">
    <button className="accordion-header" onClick={onToggle}>
      <span className="accordion-title">{title}</span>
      <ChevronDown className={`accordion-icon ${expanded ? 'expanded' : ''}`} size={16} />
    </button>
    {expanded && (
      <div className="accordion-content">
        {children}
      </div>
    )}
  </div>
);

export default DataTabContent;