// web-application/src/components/templates/types.ts

export interface TemplateProps {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  showBreadcrumbs?: boolean;
  isLoading?: boolean;
  error?: string;
  children: React.ReactNode;
}

export interface OverviewTemplateProps extends TemplateProps {
  // Specific props for OverviewTemplate
}

export interface WebviewTemplateProps {
  webviewName: string;
  children?: React.ReactNode;
  selectedDashboard?: string;
}

export interface DashboardTemplateProps extends TemplateProps {
  dashboardId?: string;
  canEdit?: boolean;
  canShare?: boolean;
  canExport?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
  onExport?: (format: string) => void;
  onRefresh?: () => void;
}

export interface AdminTemplateProps extends TemplateProps {
  activeTab?: string;
}

export interface FormStep {
  id: string;
  label: string;
  optional?: boolean;
}

export interface FormTemplateProps extends TemplateProps {
  isSaving?: boolean;
  success?: string;
  info?: string;
  warning?: string;
  canSave?: boolean;
  canCancel?: boolean;
  steps?: FormStep[];
  activeStep?: number;
  onSave?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
}

// Export all template props types
export type {
  TemplateProps,
  OverviewTemplateProps,
  WebviewTemplateProps,
  DashboardTemplateProps,
  AdminTemplateProps,
  FormTemplateProps,
  FormStep
};