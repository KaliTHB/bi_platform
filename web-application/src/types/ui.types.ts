// File: ./src/types/ui.ts

import React from 'react';

// Table component types
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
}

export interface TablePagination {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: TablePagination | false;
  rowKey?: string | ((record: T) => string);
  rowSelection?: {
    selectedRowKeys?: React.Key[];
    onChange?: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
    type?: 'checkbox' | 'radio';
  };
  expandable?: {
    expandedRowRender?: (record: T) => React.ReactNode;
    rowExpandable?: (record: T) => boolean;
  };
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLTableRowElement>;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'date' | 'datetime' | 'file' | 'color';
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  validation?: FormValidation;
  grid?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not_equals' | 'in' | 'not_in';
  };
}

export interface FormValidation {
  min?: number;
  max?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  custom?: (value: any) => string | null;
}

export interface FormSchema {
  fields: FormField[];
  layout?: 'horizontal' | 'vertical' | 'inline';
  submitLabel?: string;
  cancelLabel?: string;
  showReset?: boolean;
}

// Filter types
export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'numberrange' | 'boolean';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  defaultValue?: any;
}

export interface ActiveFilter {
  key: string;
  value: any;
  operator?: string;
  label?: string;
}

export interface FilterProps {
  options: FilterOption[];
  value: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
  showClearAll?: boolean;
  showApplyButton?: boolean;
}

// Sort types
export interface SortOption {
  key: string;
  label: string;
  direction: 'asc' | 'desc';
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// Modal types
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  read: boolean;
  action_url?: string;
  action_text?: string;
  created_at: string;
  expires_at?: string;
}

export interface NotificationAction {
  text: string;
  action: () => void;
}

// Breadcrumb types
export interface BreadcrumbItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

// Navigation types
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  permission?: string;
  disabled?: boolean;
  external?: boolean;
}

export interface NavigationProps {
  items: MenuItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  selectedKeys?: string[];
  openKeys?: string[];
}

// Loading states
export interface LoadingState {
  loading: boolean;
  error?: string | null;
  success?: boolean;
}

export interface AsyncState<T> extends LoadingState {
  data?: T;
}

// Theme types
export interface ThemeConfig {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: string;
  divider: string;
}

// Layout types
export interface LayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
  onSidebarCollapse?: (collapsed: boolean) => void;
}

// Search types
export interface SearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  showClear?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Card types
export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  size?: 'small' | 'default' | 'large';
}