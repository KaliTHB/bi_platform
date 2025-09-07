// src/hooks/useChartCreation.ts
import { useState, useCallback, useMemo } from 'react';
import { ChartValidationService } from '@/services/ChartValidationService';
// OR if using default export:
// import ChartValidationService from '@/services/ChartValidationService';

import type { 
  Chart, 
  ChartData, 
  ChartValidationResult,
  ChartConfiguration 
} from '@/types/chart.types';

interface UseChartCreationOptions {
  autoValidate?: boolean;
  strictValidation?: boolean;
}

interface UseChartCreationReturn {
  // Chart state
  chartConfig: Partial<Chart> | null;
  chartData: ChartData | null;
  validationResult: ChartValidationResult | null;
  
  // Loading states
  isValidating: boolean;
  isSaving: boolean;
  
  // Actions
  updateChartConfig: (config: Partial<Chart>) => void;
  setChartData: (data: ChartData) => void;
  validateChart: () => Promise<ChartValidationResult>;
  saveChart: () => Promise<Chart | null>;
  resetChart: () => void;
  
  // Computed values
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
}

export function useChartCreation(
  initialChart?: Partial<Chart>,
  options: UseChartCreationOptions = {}
): UseChartCreationReturn {
  const { autoValidate = true, strictValidation = false } = options;

  // State
  const [chartConfig, setChartConfig] = useState<Partial<Chart> | null>(initialChart || null);
  const [chartData, setChartDataState] = useState<ChartData | null>(null);
  const [validationResult, setValidationResult] = useState<ChartValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ Create validation service instance properly
  const validationService = useMemo(() => new ChartValidationService(), []);

  // Update chart configuration
  const updateChartConfig = useCallback(async (config: Partial<Chart>) => {
    const updatedConfig = { ...chartConfig, ...config };
    setChartConfig(updatedConfig);

    // Auto-validate if enabled
    if (autoValidate) {
      setIsValidating(true);
      try {
        const result = validationService.validateChart(updatedConfig, chartData || undefined, {
          strict: strictValidation
        });
        setValidationResult(result);
      } catch (error) {
        console.error('Validation error:', error);
        setValidationResult({
          valid: false,
          errors: [{
            field: 'general',
            message: 'Validation failed',
            severity: 'error'
          }]
        });
      } finally {
        setIsValidating(false);
      }
    }
  }, [chartConfig, chartData, autoValidate, strictValidation, validationService]);

  // Set chart data
  const setChartData = useCallback(async (data: ChartData) => {
    setChartDataState(data);

    // Auto-validate if enabled and chart config exists
    if (autoValidate && chartConfig) {
      setIsValidating(true);
      try {
        const result = validationService.validateChart(chartConfig, data, {
          strict: strictValidation
        });
        setValidationResult(result);
      } catch (error) {
        console.error('Validation error:', error);
        setValidationResult({
          valid: false,
          errors: [{
            field: 'general',
            message: 'Data validation failed',
            severity: 'error'
          }]
        });
      } finally {
        setIsValidating(false);
      }
    }
  }, [chartConfig, autoValidate, strictValidation, validationService]);

  // Manual validation
  const validateChart = useCallback(async (): Promise<ChartValidationResult> => {
    if (!chartConfig) {
      const result: ChartValidationResult = {
        valid: false,
        errors: [{
          field: 'general',
          message: 'No chart configuration to validate',
          severity: 'error'
        }]
      };
      setValidationResult(result);
      return result;
    }

    setIsValidating(true);
    try {
      const result = validationService.validateChart(chartConfig, chartData || undefined, {
        strict: strictValidation
      });
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      const result: ChartValidationResult = {
        valid: false,
        errors: [{
          field: 'general',
          message: 'Validation process failed',
          severity: 'error'
        }]
      };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [chartConfig, chartData, strictValidation, validationService]);

  // Save chart
  const saveChart = useCallback(async (): Promise<Chart | null> => {
    if (!chartConfig) {
      throw new Error('No chart configuration to save');
    }

    // Quick validation before save
    const quickValidation = validationService.quickValidate(chartConfig);
    if (!quickValidation.valid) {
      throw new Error(quickValidation.message || 'Chart validation failed');
    }

    setIsSaving(true);
    try {
      // Here you would call your API to save the chart
      // const savedChart = await chartService.createChart(chartConfig);
      
      // For now, return a mock chart
      const savedChart: Chart = {
        id: `chart_${Date.now()}`,
        workspace_id: chartConfig.workspace_id || '',
        name: chartConfig.name || 'Untitled Chart',
        display_name: chartConfig.display_name || chartConfig.name || 'Untitled Chart',
        description: chartConfig.description,
        type: chartConfig.type || 'bar',
        dataset_id: chartConfig.dataset_id || '',
        query_config: chartConfig.query_config || { dimensions: [], measures: [], aggregations: {}, sorts: [] },
        visualization_config: chartConfig.visualization_config || {},
        filters: chartConfig.filters || [],
        tags: chartConfig.tags || [],
        is_public: chartConfig.is_public || false,
        created_by: chartConfig.created_by || 'current_user',
        created_at: new Date(),
        updated_at: new Date(),
        execution_count: 0,
        cache_ttl_minutes: 30,
        status: 'active'
      };

      return savedChart;
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [chartConfig, validationService]);

  // Reset chart
  const resetChart = useCallback(() => {
    setChartConfig(null);
    setChartDataState(null);
    setValidationResult(null);
  }, []);

  // Computed values
  const isValid = validationResult?.valid ?? false;
  const hasErrors = (validationResult?.errors?.length ?? 0) > 0;
  const hasWarnings = (validationResult?.warnings?.length ?? 0) > 0;
  const errorCount = validationResult?.errors?.length ?? 0;
  const warningCount = validationResult?.warnings?.length ?? 0;

  return {
    // State
    chartConfig,
    chartData,
    validationResult,
    
    // Loading states
    isValidating,
    isSaving,
    
    // Actions
    updateChartConfig,
    setChartData,
    validateChart,
    saveChart,
    resetChart,
    
    // Computed values
    isValid,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount
  };
}