// File: web-application/src/types/ui.types.ts

export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
  group?: string;
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: keyof T;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number | string;
  height?: number | string;
  footer?: React.ReactNode;
  destroyOnClose?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'datetime';
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: ValidationRule[];
  disabled?: boolean;
  hidden?: boolean;
  grid?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}