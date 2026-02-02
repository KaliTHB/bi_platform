// src/components/modals/FieldViews.tsx
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Database, Table, Filter, GripVertical } from 'lucide-react';
import { FieldInfo } from './DataConfigurationModal';

interface DataSource {
  id: string;
  name: string;
  tables: {
    id: string;
    name: string;
    fields: FieldInfo[];
  }[];
}

// Field Tree View Component
interface FieldTreeViewProps {
  dataSources: DataSource[];
  expandedDataSources: Set<string>;
  onToggleDataSource: (sourceId: string) => void;
  onFieldSelect: (axisType: string, field: FieldInfo) => void;
}

export const FieldTreeView: React.FC<FieldTreeViewProps> = ({
  dataSources,
  expandedDataSources,
  onToggleDataSource,
  onFieldSelect
}) => {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const toggleTable = (tableId: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedTables(newExpanded);
  };

  return (
    <div className="field-tree-view">
      {dataSources.map(dataSource => (
        <div key={dataSource.id} className="tree-datasource">
          <button 
            className="tree-node datasource-node"
            onClick={() => onToggleDataSource(dataSource.id)}
          >
            {expandedDataSources.has(dataSource.id) ? 
              <ChevronDown size={14} /> : 
              <ChevronRight size={14} />
            }
            <Database size={16} />
            <span className="node-label">{dataSource.name}</span>
            <span className="node-count">
              ({dataSource.tables.reduce((sum, table) => sum + table.fields.length, 0)} fields)
            </span>
          </button>
          
          {expandedDataSources.has(dataSource.id) && (
            <div className="tree-children">
              {dataSource.tables.map(table => (
                <div key={table.id} className="tree-table">
                  <button 
                    className="tree-node table-node"
                    onClick={() => toggleTable(table.id)}
                  >
                    {expandedTables.has(table.id) ? 
                      <ChevronDown size={14} /> : 
                      <ChevronRight size={14} />
                    }
                    <Table size={16} />
                    <span className="node-label">{table.name}</span>
                    <span className="node-count">({table.fields.length})</span>
                  </button>
                  
                  {expandedTables.has(table.id) && (
                    <div className="tree-children">
                      <div className="tree-fields">
                        {table.fields.map(field => (
                          <FieldCard
                            key={field.id}
                            field={field}
                            onSelect={onFieldSelect}
                            compact={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Field Grid View Component
interface FieldGridViewProps {
  fields: FieldInfo[];
  searchQuery: string;
  onFieldSelect: (axisType: string, field: FieldInfo) => void;
}

export const FieldGridView: React.FC<FieldGridViewProps> = ({
  fields,
  searchQuery,
  onFieldSelect
}) => {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Group fields by type for better organization when searching
  const groupedFields = React.useMemo(() => {
    if (!searchQuery) {
      return { all: fields };
    }

    return fields.reduce((acc, field) => {
      const type = field.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(field);
      return acc;
    }, {} as Record<string, FieldInfo[]>);
  }, [fields, searchQuery]);

  return (
    <div className="field-grid-view">
      {searchQuery && (
        <div className="search-results-header">
          <span>Found {fields.length} fields matching "{searchQuery}"</span>
        </div>
      )}
      
      {Object.entries(groupedFields).map(([groupKey, groupFields]) => (
        <div key={groupKey} className="field-group">
          {searchQuery && groupKey !== 'all' && (
            <div className="group-header">
              <span className="group-title">{groupKey.toUpperCase()} Fields</span>
              <span className="group-count">({groupFields.length})</span>
            </div>
          )}
          
          <div className="field-grid">
            {groupFields.map(field => (
              <FieldCard
                key={field.id}
                field={field}
                onSelect={onFieldSelect}
                isSelected={selectedField === field.id}
                onCardClick={() => setSelectedField(field.id)}
              />
            ))}
          </div>
        </div>
      ))}
      
      {fields.length === 0 && searchQuery && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h4>No fields found</h4>
          <p>Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};

// Field Card Component
interface FieldCardProps {
  field: FieldInfo;
  onSelect: (axisType: string, field: FieldInfo) => void;
  compact?: boolean;
  isSelected?: boolean;
  onCardClick?: () => void;
  showAggregations?: boolean;
}

export const FieldCard: React.FC<FieldCardProps> = ({
  field,
  onSelect,
  compact = false,
  isSelected = false,
  onCardClick,
  showAggregations = true
}) => {
  const [showSample, setShowSample] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const getTypeIcon = (type: string) => {
    const icons = {
      'number': '📊',
      'string': '📝',
      'date': '📅',
      'boolean': '☑️'
    };
    return icons[type as keyof typeof icons] || '❓';
  };

  const getAggregationOptions = (type: string) => {
    const options = {
      'number': ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'],
      'string': ['COUNT', 'DISTINCT'],
      'date': ['COUNT', 'MIN', 'MAX'],
      'boolean': ['COUNT', 'SUM']
    };
    return options[type as keyof typeof options] || ['COUNT'];
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-preview';
    dragImage.innerHTML = `
      <div class="drag-preview-content">
        ${getTypeIcon(field.type)} ${field.displayName || field.name}
      </div>
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 20);
    
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleAggregationSelect = (aggregation: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // For now, we'll just pass the field with the selected aggregation
    // This will be enhanced when we implement the full aggregation system
    const fieldWithAggregation = { ...field, selectedAggregation: aggregation };
    onSelect('y-axis', fieldWithAggregation); // Default to y-axis for aggregations
  };

  return (
    <div 
      className={`field-card ${compact ? 'compact' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onCardClick}
      onMouseEnter={() => setShowSample(true)}
      onMouseLeave={() => setShowSample(false)}
    >
      <div className="field-card-header">
        <div className="field-info">
          <div className="field-icon">{getTypeIcon(field.type)}</div>
          <div className="field-details">
            <div className="field-name">{field.displayName || field.name}</div>
            {!compact && (
              <div className="field-type-badge">
                <span className={`type-badge ${field.type}`}>{field.type}</span>
                {field.nullable && <span className="nullable-badge">null</span>}
                {field.unique && <span className="unique-badge">unique</span>}
              </div>
            )}
          </div>
        </div>
        
        <div className="field-actions">
          <button 
            className="action-button filter-button"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open filter configuration for this field
            }}
            title="Add Filter"
          >
            <Filter size={14} />
          </button>
          <div className="drag-handle">
            <GripVertical size={14} />
          </div>
        </div>
      </div>
      
      {!compact && (
        <div className="field-metadata">
          <div className="sample-value">
            {field.sampleValue && (
              <span className="sample-text">e.g., {field.sampleValue}</span>
            )}
          </div>
          
          {showAggregations && (
            <div className="aggregation-options">
              {getAggregationOptions(field.type).slice(0, 3).map(agg => (
                <button 
                  key={agg}
                  className="aggregation-btn"
                  onClick={(e) => handleAggregationSelect(agg, e)}
                  title={`Apply ${agg} aggregation`}
                >
                  {agg}
                </button>
              ))}
              {getAggregationOptions(field.type).length > 3 && (
                <button className="aggregation-btn more">
                  +{getAggregationOptions(field.type).length - 3}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {showSample && field.sampleValues && field.sampleValues.length > 1 && (
        <div className="sample-preview">
          <div className="sample-title">Sample Values:</div>
          <div className="sample-values">
            {field.sampleValues.slice(0, 5).map((value, index) => (
              <span key={index} className="sample-item">{value}</span>
            ))}
            {field.sampleValues.length > 5 && (
              <span className="sample-more">+{field.sampleValues.length - 5} more</span>
            )}
          </div>
          
          {(field.uniqueCount !== undefined || field.nullCount !== undefined) && (
            <div className="sample-stats">
              {field.uniqueCount !== undefined && (
                <span>Unique: {field.uniqueCount}</span>
              )}
              {field.nullCount !== undefined && (
                <span>Nulls: {field.nullCount}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Custom Tab Content Placeholder (will be implemented in next phase)
interface CustomTabContentProps {
  selectedChart: any;
  config: any;
  onConfigChange: (config: any) => void;
}

export const CustomTabContent: React.FC<CustomTabContentProps> = ({
  selectedChart,
  config,
  onConfigChange
}) => {
  return (
    <div className="custom-tab-content">
      <div className="coming-soon">
        <div className="coming-soon-icon">🎨</div>
        <h3>Custom Configuration</h3>
        <p>Advanced chart customization options will be available in the next implementation phase.</p>
        
        <div className="preview-features">
          <h4>Coming Soon:</h4>
          <ul>
            <li>📊 Chart Appearance (Colors, Themes, Typography)</li>
            <li>⚡ Interactive Features (Tooltips, Legends, Zoom)</li>
            <li>⚙️ Advanced Options (Library-specific settings)</li>
            <li>🎯 Dynamic configuration forms based on Chart Factory schemas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};