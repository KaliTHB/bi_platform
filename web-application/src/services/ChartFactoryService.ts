import { ChartFactory } from '@/plugins/charts';
import { ChartFactoryConfig, ChartCreationResult, ChartValidationResult } from '@/types/factory.types';
import { FieldAssignments } from '@/types/chart.types';

export class ChartFactoryService {
  private static instance: ChartFactoryService | null = null;
  private isInitialized = false;
  private availableCharts: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ChartFactoryService {
    if (!ChartFactoryService.instance) {
      ChartFactoryService.instance = new ChartFactoryService();
    }
    return ChartFactoryService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Chart Factory...');
      
      await ChartFactory.initialize();
      
      // Discover and cache available charts
      const charts = await ChartFactory.getAllCharts();
      charts.forEach(chart => {
        this.availableCharts.set(`${chart.name}-${chart.library}`, chart);
      });

      this.isInitialized = true;
      console.log(`✅ Chart Factory initialized with ${charts.length} chart types`);
    } catch (error) {
      console.error('❌ Chart Factory initialization failed:', error);
      throw new Error(`Chart Factory initialization failed: ${error.message}`);
    }
  }

  async createChart(
    chartType: string,
    library: string,
    config: ChartFactoryConfig
  ): Promise<ChartCreationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`📊 Creating ${chartType} chart using ${library}...`);

      // Validate chart type exists
      const chartKey = `${chartType}-${library}`;
      if (!this.availableCharts.has(chartKey)) {
        throw new Error(`Chart type ${chartType} with library ${library} not found`);
      }

      // Create chart using factory
      const chartElement = ChartFactory.createChart(chartType, library, {
        data: config.data || [],
        config: config.config,
        dimensions: config.dimensions || { width: 800, height: 400 },
        theme: config.theme,
        onError: config.onError,
        onInteraction: config.onInteraction
      });

      console.log('✅ Chart created successfully');
      
      return {
        success: true,
        chartElement,
        chartType,
        library,
        config: config.config
      };
    } catch (error) {
      console.error('❌ Chart creation failed:', error);
      return {
        success: false,
        error: error.message,
        chartType,
        library
      };
    }
  }

  async validateConfiguration(
    chartType: string,
    library: string,
    config: any
  ): Promise<ChartValidationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const validation = await ChartFactory.validateConfig(chartType, library, config);
      return {
        valid: validation.valid,
        errors: validation.errors || [],
        warnings: validation.warnings || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  async getAllAvailableCharts() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return Array.from(this.availableCharts.values());
  }

  async getChartsByCategory(category: string) {
    const allCharts = await this.getAllAvailableCharts();
    return allCharts.filter(chart => chart.category === category);
  }

  async getChartsByLibrary(library: string) {
    const allCharts = await this.getAllAvailableCharts();
    return allCharts.filter(chart => chart.library === library);
  }

  async getConfigSchema(chartType: string, library: string) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const chartKey = `${chartType}-${library}`;
    const chart = this.availableCharts.get(chartKey);
    return chart?.configSchema || {};
  }

  isFactoryReady(): boolean {
    return this.isInitialized;
  }
}

export default ChartFactoryService.getInstance();