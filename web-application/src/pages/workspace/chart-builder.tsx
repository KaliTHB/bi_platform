import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Table2, 
  Type,
  Gauge,
  Plus,
  Settings,
  Play,
  Save,
  Eye,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Grid,
  Layout,
  Database,
  Palette,
  Code,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  X,
  ChevronRight,
  Zap,
  MoreHorizontal,
  ChevronDown,
  Hash,
  Calendar,
  BarChart2,
  Map
} from 'lucide-react';

// Complete CSS styles for the chart builder - matching workspace typography
const chartBuilderCSS = `
  /* Import Inter font to match dashboard-builder */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .chart-builder {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f5f5;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    font-weight: 400;
  }
  
  .chart-builder * {
    box-sizing: border-box;
  }
  
  /* Header Styles - matching MUI theme */
  .chart-header {
    background-color: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    padding: 16px 24px;
    flex-shrink: 0;
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.12);
  }
  
  .chart-nav {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #666666;
    margin-bottom: 4px;
    font-weight: 400;
  }
  
  .chart-nav-item {
    color: #666666;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .chart-nav-active {
    color: #333333;
    font-weight: 500;
  }
  
  .chart-nav-separator {
    margin: 0 8px;
  }
  
  .chart-subtitle {
    color: #666666;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.6;
  }
  
  /* Main Layout */
  .chart-main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  /* Sidebar Styles - matching MUI Paper */
  .chart-sidebar {
    width: 300px;
    background-color: #ffffff;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
  }
  
  .sidebar-section {
    border-bottom: 1px solid #e0e0e0;
    padding: 16px;
  }
  
  .sidebar-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .sidebar-section-title {
    font-weight: 600;
    color: #333333;
    font-size: 16px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .dataset-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 400;
    border: 1px solid #e0e0e0;
  }
  
  .search-input {
    width: 100%;
    padding: 10px 14px 10px 40px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #ffffff;
    transition: border-color 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }
  
  .search-container {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #666666;
  }
  
  .collapsible-section {
    border-bottom: 1px solid #e0e0e0;
  }
  
  .collapsible-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .collapsible-header:hover {
    background-color: #f5f5f5;
  }
  
  .collapsible-title {
    font-weight: 600;
    color: #333333;
    font-size: 16px;
  }
  
  .collapsible-content {
    padding: 0 16px 16px;
    border-top: 1px solid #f5f5f5;
  }
  
  .metric-item, .column-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 400;
    transition: background-color 0.2s;
    margin-bottom: 4px;
  }
  
  .metric-item:hover, .column-item:hover {
    background-color: rgba(25, 118, 210, 0.1);
  }
  
  .metric-count {
    color: #666666;
    font-size: 13px;
    font-weight: 400;
    margin-bottom: 12px;
  }
  
  .add-chart-button {
    margin: 16px;
    padding: 16px;
    border: 2px dashed #e0e0e0;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    color: #666666;
    font-weight: 500;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .add-chart-button:hover {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.08);
    color: #1976d2;
  }
  
  /* Configuration Panel - matching MUI styles */
  .config-panel {
    width: 400px;
    background-color: #ffffff;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .config-tabs {
    display: flex;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .config-tab {
    flex: 1;
    padding: 14px 16px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .config-tab.active {
    color: #1976d2;
    background-color: rgba(25, 118, 210, 0.08);
    border-bottom: 2px solid #1976d2;
  }
  
  .config-content {
    flex: 1;
    overflow-y: auto;
  }
  
  .config-form-group {
    padding: 16px;
    margin-bottom: 8px;
  }
  
  .config-label {
    display: block;
    font-weight: 600;
    color: #333333;
    margin-bottom: 6px;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .config-input, .config-select, .config-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #ffffff;
    transition: border-color 0.2s;
  }
  
  .config-input:focus, .config-select:focus, .config-textarea:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }
  
  .config-textarea {
    resize: vertical;
    min-height: 100px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.4;
  }
  
  .color-palette {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 8px;
  }
  
  .color-option {
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .color-option:hover {
    background-color: #f5f5f5;
  }
  
  .color-option.active {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.08);
  }
  
  .color-dots {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }
  
  .color-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid #e0e0e0;
  }
  
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
  
  .checkbox-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #1976d2;
  }
  
  .checkbox-group label {
    font-size: 14px;
    font-weight: 400;
    color: #333333;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .update-button {
    margin: 16px;
    padding: 12px 16px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: none;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .update-button:hover {
    background-color: #1565c0;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  
  /* Main Content Area */
  .chart-content {
    flex: 1;
    padding: 24px;
    overflow: auto;
    background-color: #f5f5f5;
  }
  
  .empty-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background-color: #ffffff;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .empty-content h3 {
    font-size: 24px;
    color: #333333;
    margin-bottom: 8px;
    font-weight: 600;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .empty-content p {
    color: #666666;
    margin-bottom: 24px;
    max-width: 400px;
    line-height: 1.6;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .primary-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    text-transform: none;
  }
  
  .primary-button:hover {
    background-color: #1565c0;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  
  /* Chart Preview - matching MUI Card */
  .chart-preview {
    height: 100%;
    background-color: #ffffff;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.2s;
  }
  
  .chart-preview:hover {
    box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.15);
  }
  
  .chart-preview-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #ffffff;
  }
  
  .chart-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .chart-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: #666666;
    font-weight: 400;
  }
  
  .stat-badge {
    padding: 4px 10px;
    background-color: #e8f5e8;
    color: #2e7d32;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .chart-visualization {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
  }
  
  .bar-chart-container {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 12px;
    padding-bottom: 40px;
    position: relative;
  }
  
  .bar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  
  .bar {
    width: 32px;
    background-color: #1976d2;
    border-radius: 2px 2px 0 0;
    transition: all 0.3s ease;
    margin-bottom: 8px;
  }
  
  .bar-label {
    font-size: 11px;
    color: #666666;
    font-weight: 400;
    writing-mode: vertical-lr;
    text-orientation: mixed;
    transform: rotate(180deg);
    white-space: nowrap;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .chart-axis-label {
    text-align: center;
    font-size: 13px;
    color: #666666;
    margin-top: 8px;
    font-weight: 500;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .y-axis-label {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: rotate(-90deg) translateX(50%);
    transform-origin: center;
    font-size: 13px;
    color: #666666;
    font-weight: 500;
    white-space: nowrap;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  /* Results Section - matching MUI Table */
  .results-section {
    border-top: 1px solid #e0e0e0;
    background-color: #ffffff;
  }
  
  .results-tabs {
    display: flex;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .results-tab {
    padding: 12px 16px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .results-tab.active {
    color: #1976d2;
    border-bottom: 2px solid #1976d2;
  }
  
  .results-content {
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .results-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .results-info {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #666666;
    font-weight: 400;
  }
  
  .data-table {
    width: 100%;
    font-size: 13px;
    border-collapse: collapse;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .data-table th {
    background-color: #f5f5f5;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #333333;
    border-bottom: 1px solid #e0e0e0;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
  }
  
  .data-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #f5f5f5;
    color: #333333;
    font-weight: 400;
  }
  
  .data-table tr:hover {
    background-color: #f5f5f5;
  }
  
  /* Modal Styles - matching MUI Dialog */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1300;
    padding: 20px;
  }
  
  .modal-content {
    background-color: #ffffff;
    border-radius: 8px;
    width: 100%;
    max-width: 1200px;
    height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  }
  
  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-title {
    font-size: 20px;
    font-weight: 600;
    color: #333333;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .modal-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .chart-categories {
    width: 240px;
    background-color: #f5f5f5;
    border-right: 1px solid #e0e0e0;
    padding: 16px 0;
  }
  
  .category-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #666666;
    transition: all 0.2s;
    font-weight: 400;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    border-radius: 0 8px 8px 0;
    margin-right: 8px;
  }
  
  .category-item:hover {
    background-color: #e0e0e0;
  }
  
  .category-item.active {
    background-color: rgba(25, 118, 210, 0.08);
    color: #1976d2;
    font-weight: 500;
  }
  
  .charts-grid {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
  
  .chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }
  
  .chart-option {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    background-color: #ffffff;
  }
  
  .chart-option:hover {
    border-color: #1976d2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  .chart-option.selected {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.08);
  }
  
  .chart-icon-container {
    width: 100%;
    height: 80px;
    background-color: #f5f5f5;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }
  
  .chart-option-title {
    font-weight: 600;
    color: #333333;
    margin-bottom: 4px;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .chart-details {
    width: 320px;
    border-left: 1px solid #e0e0e0;
    padding: 20px;
    background-color: #ffffff;
  }
  
  .chart-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 12px 0;
  }
  
  .chart-tag {
    padding: 3px 10px;
    background-color: #f5f5f5;
    color: #666666;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 500;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }
  
  .secondary-button {
    flex: 1;
    padding: 10px 16px;
    background-color: #ffffff;
    color: #666666;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    text-transform: none;
  }
  
  .secondary-button:hover {
    background-color: #f5f5f5;
    border-color: #666666;
  }
  
  /* Utility Classes */
  .icon-button {
    padding: 8px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    color: #666666;
    transition: all 0.2s;
  }
  
  .icon-button:hover {
    background-color: rgba(25, 118, 210, 0.08);
    color: #1976d2;
  }
  
  .rotate-180 {
    transform: rotate(180deg);
  }
  
  .transition-transform {
    transition: transform 0.2s;
  }
  
  /* Responsive - matching MUI breakpoints */
  @media (max-width: 960px) {
    .chart-sidebar, .config-panel {
      width: 280px;
    }
    
    .modal-content {
      margin: 10px;
      height: calc(100vh - 20px);
    }
  }
  
  @media (max-width: 600px) {
    .chart-main {
      flex-direction: column;
    }
    
    .chart-sidebar, .config-panel {
      width: 100%;
      max-height: 300px;
    }
    
    .chart-header {
      padding: 12px 16px;
    }
    
    .chart-content {
      padding: 16px;
    }
  }
`;

// Chart categories data
const chartCategories = {
  all: {
    name: 'All charts',
    icon: Grid,
    charts: []
  },
  popular: {
    name: 'Popular',
    icon: TrendingUp,
    charts: [
      { 
        id: 'bar-popular', 
        name: 'Bar Chart', 
        icon: BarChart3, 
        description: 'Compare values across categories'
      },
      { 
        id: 'line-popular', 
        name: 'Line Chart', 
        icon: LineChart, 
        description: 'Show trends over time'
      },
      { 
        id: 'pie-popular', 
        name: 'Pie Chart', 
        icon: PieChart, 
        description: 'Show proportions of a whole'
      }
    ]
  },
  echarts: {
    name: 'ECharts',
    icon: BarChart2,
    charts: [
      { 
        id: 'bar-echarts', 
        name: 'Time-series Bar Chart', 
        icon: BarChart3, 
        description: 'Visualize how a metric changes over time using bars. Add a group by column to visualize group level metrics and how they change over time.',
        tags: ['Bar', 'Time', 'Trend', 'Stacked', 'Vertical', 'Percentages']
      },
      { 
        id: 'line-echarts', 
        name: 'Time-series Line Chart', 
        icon: LineChart, 
        description: 'Visualize how a metric changes over time using a line chart',
        tags: ['Line', 'Time', 'Trend']
      },
      { 
        id: 'mixed-echarts', 
        name: 'Mixed Time-Series', 
        icon: Activity, 
        description: 'Visualize a combination of time series charts',
        tags: ['Mixed', 'Time', 'Series']
      }
    ]
  },
  advanced: {
    name: 'Advanced-Analytics',
    icon: Zap,
    charts: [
      { 
        id: 'gauge', 
        name: 'Gauge Chart', 
        icon: Gauge, 
        description: 'Display KPI values with thresholds'
      },
      { 
        id: 'heatmap', 
        name: 'Heat Map', 
        icon: Grid, 
        description: 'Show data density across dimensions'
      }
    ]
  }
};

const mockDatasets = [
  { 
    id: '1', 
    name: 'public.cleaned_sales_data', 
    icon: Database
  }
];

const colorPalettes = [
  { name: 'Default', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] },
  { name: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#10b981', '#84cc16', '#eab308'] },
  { name: 'Sunset', colors: ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1'] },
  { name: 'Monochrome', colors: ['#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'] }
];

const ChartBuilder = () => {
  // Inject styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = chartBuilderCSS;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const [selectedChart, setSelectedChart] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState('dataset');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    metrics: true,
    columns: true
  });
  
  const [chartConfig, setChartConfig] = useState({
    name: '',
    dataset: '1',
    query: 'SELECT DATE_TRUNC(\'quarter\', order_date) as quarter, SUM(sales) as total_sales\nFROM public.cleaned_sales_data\nGROUP BY quarter\nORDER BY quarter',
    title: '',
    colors: colorPalettes[0].colors,
    showLegend: true,
    showGrid: true
  });

  const chartData = [
    { quarter: '04/01/2003', sales: 500000 },
    { quarter: '07/01/2003', sales: 600000 },
    { quarter: '10/01/2003', sales: 700000 },
    { quarter: '01/01/2004', sales: 1800000 },
    { quarter: '04/01/2004', sales: 800000 },
    { quarter: '07/01/2004', sales: 750000 },
    { quarter: '10/01/2004', sales: 1100000 },
    { quarter: '01/01/2005', sales: 1900000 },
    { quarter: '04/01/2005', sales: 1100000 },
    { quarter: '07/01/2005', sales: 700000 }
  ];

  const handleChartTypeSelect = (chartType) => {
    setSelectedChart(chartType);
    setChartConfig(prev => ({
      ...prev,
      name: `New ${chartType.name}`,
      title: chartType.name
    }));
    setShowChartSelector(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getCategoryCharts = () => {
    if (selectedCategory === 'all') {
      return Object.values(chartCategories).flatMap(category => category.charts);
    }
    return chartCategories[selectedCategory]?.charts || [];
  };

  const filteredCharts = getCategoryCharts().filter(chart =>
    chart.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chart.tags && chart.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const ChartSelectorModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Select a visualization type</h2>
          </div>
          <button className="icon-button" onClick={() => setShowChartSelector(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="chart-categories">
            <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                Recommended tags ⌄
              </div>
            </div>
            
            {Object.entries(chartCategories).map(([key, category]) => (
              <div
                key={key}
                className={`category-item ${selectedCategory === key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(key)}
              >
                <Hash size={14} />
                <span>{category.name}</span>
              </div>
            ))}
          </div>

          <div className="charts-grid">
            <div style={{ padding: '0 0 16px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="search-container">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  placeholder="Search all charts"
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="chart-grid" style={{ marginTop: '16px' }}>
              {filteredCharts.map((chart) => (
                <div
                  key={chart.id}
                  className={`chart-option ${selectedChart?.id === chart.id ? 'selected' : ''}`}
                  onClick={() => setSelectedChart(chart)}
                >
                  <div className="chart-icon-container">
                    <chart.icon size={24} color="#64748b" />
                  </div>
                  <div className="chart-option-title">{chart.name}</div>
                </div>
              ))}
            </div>
          </div>

          {selectedChart && (
            <div className="chart-details">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                {selectedChart.name}
              </h3>
              
              {selectedChart.tags && (
                <div className="chart-tags">
                  {selectedChart.tags.slice(0, 8).map((tag, index) => (
                    <span key={index} className="chart-tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginBottom: '16px' }}>
                {selectedChart.description}
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Examples</h4>
                <div style={{ height: '120px', backgroundColor: '#f8fafc', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <selectedChart.icon size={32} color="#cbd5e1" />
                </div>
              </div>

              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setShowChartSelector(false)}>
                  CANCEL
                </button>
                <button className="primary-button" onClick={() => handleChartTypeSelect(selectedChart)}>
                  SELECT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderChartPreview = () => {
    if (!selectedChart) return null;

    const maxValue = Math.max(...chartData.map(item => item.sales));

    return (
      <div className="chart-preview">
        <div className="chart-preview-header">
          <div className="chart-actions">
            <button className="primary-button">SAVE</button>
            <button className="icon-button">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="chart-stats">
            <span>10 rows</span>
            <span className="stat-badge">00:00:00.55</span>
          </div>
        </div>

        <div className="chart-visualization">
          {(selectedChart.id.includes('bar')) && (
            <div style={{ flex: 1, position: 'relative' }}>
              <div className="y-axis-label">Total Sales</div>
              <div className="bar-chart-container">
                {chartData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div 
                      className="bar"
                      style={{ 
                        height: `${(item.sales / maxValue) * 200}px`,
                        backgroundColor: '#60a5fa'
                      }}
                    />
                    <span className="bar-label">{item.quarter}</span>
                  </div>
                ))}
              </div>
              <div className="chart-axis-label">Quarter starting</div>
            </div>
          )}
        </div>

        <div className="results-section">
          <div className="results-tabs">
            <button className="results-tab active">RESULTS</button>
            <button className="results-tab">SAMPLES</button>
          </div>
          
          <div className="results-content">
            <div className="results-controls">
              <div className="search-container" style={{ width: '200px' }}>
                <Search className="search-icon" size={14} />
                <input type="text" placeholder="Search" className="search-input" />
              </div>
              <div className="results-info">
                <span>10 rows</span>
                <button className="icon-button">
                  <Grid size={14} />
                </button>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>__timestamp</th>
                  <th>SUM(Sales)</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice(0, 6).map((item, index) => (
                  <tr key={index}>
                    <td>2004-01-01 00:00:00</td>
                    <td>{item.sales.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="chart-builder">
        <div className="chart-header">
          <nav className="chart-nav">
            <span className="chart-nav-item">Workspace</span>
            <span className="chart-nav-separator"><ChevronRight size={14} /></span>
            <span className="chart-nav-item">Charts</span>
            <span className="chart-nav-separator"><ChevronRight size={14} /></span>
            <span className="chart-nav-active">Chart Builder</span>
          </nav>
          <p className="chart-subtitle">Create interactive charts with dynamic configurations</p>
        </div>

        <div className="chart-main">

          {selectedChart && (
            <div className="config-panel">
              <div className="config-tabs">
                <button 
                  className={`config-tab ${activeConfigTab === 'dataset' ? 'active' : ''}`}
                  onClick={() => setActiveConfigTab('dataset')}
                >
                  DATASET
                </button>
                <button 
                  className={`config-tab ${activeConfigTab === 'data' ? 'active' : ''}`}
                  onClick={() => setActiveConfigTab('data')}
                >
                  DATA
                </button>
                <button 
                  className={`config-tab ${activeConfigTab === 'customize' ? 'active' : ''}`}
                  onClick={() => setActiveConfigTab('customize')}
                >
                  CUSTOMIZE
                </button>
              </div>

              <div className="config-content">

                {activeConfigTab === 'dataset' && (
                  <div>
            <div >
              <div className="sidebar-section">
                <div className="sidebar-section-header">
                  <h3 className="sidebar-section-title">Dataset</h3>
                </div>
                <div className="dataset-item">
                  <Database size={16} />
                  <span>{mockDatasets[0].name}</span>
                  <button className="icon-button" style={{ marginLeft: 'auto' }}>
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="search-container">
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    placeholder="Search Metrics & Columns"
                    className="search-input"
                  />
                </div>
              </div>

              <div className="collapsible-section">
                <button className="collapsible-header" onClick={() => toggleSection('metrics')}>
                  <span className="collapsible-title">Metrics</span>
                  <ChevronDown size={16} className={`transition-transform ${expandedSections.metrics ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.metrics && (
                  <div className="collapsible-content">
                    <div className="metric-count">Showing 1 of 1</div>
                    <div className="metric-item">
                      <Hash size={14} />
                      <span>COUNT(*)</span>
                      <button className="icon-button" style={{ marginLeft: 'auto' }}>
                        <MoreHorizontal size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="collapsible-section">
                <button className="collapsible-header" onClick={() => toggleSection('columns')}>
                  <span className="collapsible-title">Columns</span>
                  <ChevronDown size={16} className={`transition-transform ${expandedSections.columns ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.columns && (
                  <div className="collapsible-content">
                    <div className="metric-count">Showing 25 of 25</div>
                    <div className="column-item">
                      <Calendar size={14} />
                      <span>order_date</span>
                      <button className="icon-button" style={{ marginLeft: 'auto' }}>
                        <MoreHorizontal size={12} />
                      </button>
                    </div>
                    <div className="column-item">
                      <Hash size={14} />
                      <span>price_each</span>
                      <button className="icon-button" style={{ marginLeft: 'auto' }}>
                        <MoreHorizontal size={12} />
                      </button>
                    </div>
                    <div className="column-item">
                      <Hash size={14} />
                      <span>sales</span>
                      <button className="icon-button" style={{ marginLeft: 'auto' }}>
                        <MoreHorizontal size={12} />
                      </button>
                    </div>
                    <div className="column-item">
                      <Type size={14} />
                      <span>address_line1</span>
                      <button className="icon-button" style={{ marginLeft: 'auto' }}>
                        <MoreHorizontal size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
                )}

                {activeConfigTab === 'data' && (
                  <div>
                    <div className="config-form-group">
                      <label className="config-label">Visualization type</label>
                      <select className="config-select">
                        <option>{selectedChart.name}</option>
                      </select>
                    </div>

                    <div className="config-form-group">
                      <label className="config-label">Time</label>
                      <select className="config-select">
                        <option>order_date</option>
                      </select>
                    </div>

                    <div className="config-form-group">
                      <label className="config-label">Query</label>
                      <textarea
                        className="config-textarea"
                        value={chartConfig.query}
                        onChange={(e) => setChartConfig(prev => ({...prev, query: e.target.value}))}
                        rows={6}
                      />
                      <button className="primary-button" style={{ marginTop: '8px', padding: '6px 12px', fontSize: '11px' }}>
                        <Play size={12} />
                        Run Query
                      </button>
                    </div>
                  </div>
                )}

                {activeConfigTab === 'customize' && (
                  <div>
                    <div className="config-form-group">
                      <label className="config-label">Chart Title</label>
                      <input
                        type="text"
                        className="config-input"
                        value={chartConfig.title}
                        onChange={(e) => setChartConfig(prev => ({...prev, title: e.target.value}))}
                      />
                    </div>

                    <div className="config-form-group">
                      <label className="config-label">Color Palette</label>
                      <div className="color-palette">
                        {colorPalettes.map((palette, index) => (
                          <div
                            key={index}
                            className={`color-option ${JSON.stringify(palette.colors) === JSON.stringify(chartConfig.colors) ? 'active' : ''}`}
                            onClick={() => setChartConfig(prev => ({...prev, colors: palette.colors}))}
                          >
                            <div style={{ fontWeight: '500', fontSize: '12px' }}>{palette.name}</div>
                            <div className="color-dots">
                              {palette.colors.slice(0, 4).map((color, colorIndex) => (
                                <div key={colorIndex} className="color-dot" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="config-form-group">
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="showLegend"
                          checked={chartConfig.showLegend}
                          onChange={(e) => setChartConfig(prev => ({...prev, showLegend: e.target.checked}))}
                        />
                        <label htmlFor="showLegend" style={{ fontSize: '13px' }}>Show Legend</label>
                      </div>
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="showGrid"
                          checked={chartConfig.showGrid}
                          onChange={(e) => setChartConfig(prev => ({...prev, showGrid: e.target.checked}))}
                        />
                        <label htmlFor="showGrid" style={{ fontSize: '13px' }}>Show Grid Lines</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button className="update-button">
                UPDATE CHART
              </button>
            </div>
          )}

          <div className="chart-content">
            {selectedChart ? (
              renderChartPreview()
            ) : (
              <div className="empty-state">
                <div className="empty-content">
                  <BarChart3 size={48} color="#cbd5e1" />
                  <h3>Create Your Chart</h3>
                  <p>Click "Add Chart" to select from our collection of chart plugins and start building your visualization</p>
                  <button className="primary-button" onClick={() => setShowChartSelector(true)}>
                    <Plus size={16} />
                    Add Chart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showChartSelector && <ChartSelectorModal />}
    </>
  );
};

export default ChartBuilder;