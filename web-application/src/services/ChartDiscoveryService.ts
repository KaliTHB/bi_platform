import ChartFactoryService from './ChartFactoryService';
import ChartCacheService from './ChartCacheService';
import { ChartTypeInfo, ChartCategoryStructure } from '@/types/chart.types';

export class ChartDiscoveryService {
  constructor(
    private cacheService: ChartCacheService,
    private factoryService: typeof ChartFactoryService
  ) {}

  async discoverAvailableCharts(): Promise<ChartCategoryStructure> {
    try {
      // Check cache first
      const cachedCharts = this.cacheService.getChartTypes();
      if (cachedCharts) {
        console.log('📦 Using cached chart types');
        return this.organizeChatsByCategory(cachedCharts);
      }

      console.log('🔍 Discovering chart types...');

      // Get charts from factory
      const factoryCharts = await this.factoryService.getAllAvailableCharts();
      
      // Transform to our structure
      const chartTypes: ChartTypeInfo[] = factoryCharts.map(chart => ({
        id: chart.name,
        name: chart.displayName || this.formatChartName(chart.name),
        description: chart.description || `${chart.displayName || chart.name} visualization`,
        category: chart.category || 'basic',
        library: chart.library || 'echarts',
        icon: this.getChartIcon(chart.name),
        tags: chart.tags || [],
        dataRequirements: this.transformDataRequirements(chart.dataRequirements),
        configSchema: chart.configSchema,
        version: chart.version,
        interactionSupport: chart.interactionSupport || {}
      }));

      // Cache the results
      this.cacheService.setChartTypes(chartTypes);
      
      console.log(`✅ Discovered ${chartTypes.length} chart types`);
      return this.organizeChatsByCategory(chartTypes);

    } catch (error) {
      console.error('❌ Chart discovery failed:', error);
      // Return fallback structure
      return this.getFallbackChartStructure();
    }
  }

  private organizeChatsByCategory(charts: ChartTypeInfo[]): ChartCategoryStructure {
    const libraryPreferences = this.cacheService.getLibraryPreferences();
    
    // Group by primary categories (from chart config)
    const categories = this.groupByCategory(charts);
    
    // Within each category, prioritize d3js and sort by library preference
    const organizedCategories: ChartCategoryStructure = {};
    
    Object.entries(categories).forEach(([category, categoryCharts]) => {
      organizedCategories[category] = {
        name: this.formatCategoryName(category),
        displayName: this.formatCategoryDisplayName(category),
        charts: this.sortChartsByLibraryPriority(categoryCharts, libraryPreferences),
        count: categoryCharts.length
      };
    });

    return organizedCategories;
  }

  private groupByCategory(charts: ChartTypeInfo[]): Record<string, ChartTypeInfo[]> {
    return charts.reduce((acc, chart) => {
      const category = chart.category || 'basic';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(chart);
      return acc;
    }, {} as Record<string, ChartTypeInfo[]>);
  }

  private sortChartsByLibraryPriority(
    charts: ChartTypeInfo[], 
    preferences: { primary: string[], secondary: string[] }
  ): ChartTypeInfo[] {
    return charts.sort((a, b) => {
      // d3js gets highest priority (as specified)
      if (a.library === 'd3js' && b.library !== 'd3js') return -1;
      if (b.library === 'd3js' && a.library !== 'd3js') return 1;
      
      // Then by primary preferences
      const aPrimaryIndex = preferences.primary.indexOf(a.library);
      const bPrimaryIndex = preferences.primary.indexOf(b.library);
      
      if (aPrimaryIndex !== -1 && bPrimaryIndex !== -1) {
        return aPrimaryIndex - bPrimaryIndex;
      }
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }

  private transformDataRequirements(factoryRequirements: any): any {
    // Transform factory data requirements to our format
    return {
      requiredFields: factoryRequirements?.requiredFields || [],
      optionalFields: factoryRequirements?.optionalFields || [],
      axes: this.transformAxesRequirements(factoryRequirements)
    };
  }

  private transformAxesRequirements(requirements: any): Record<string, any> {
    // Convert factory requirements to axis-based structure
    const axes: Record<string, any> = {};
    
    // Common axis mappings
    if (requirements?.minColumns >= 1) {
      axes['x-axis'] = {
        supportedTypes: ['string', 'date', 'number'],
        required: true,
        multipleFields: false
      };
    }
    
    if (requirements?.minColumns >= 2) {
      axes['y-axis'] = {
        supportedTypes: ['number'],
        required: true,
        multipleFields: requirements?.maxColumns > 2
      };
    }

    // Add optional axes
    axes['series'] = {
      supportedTypes: ['string', 'date'],
      required: false,
      multipleFields: false
    };

    axes['filters'] = {
      supportedTypes: ['string', 'number', 'date', 'boolean'],
      required: false,
      multipleFields: true
    };

    return axes;
  }

  private formatChartName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatCategoryName(category: string): string {
    return category.toLowerCase();
  }

  private formatCategoryDisplayName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  private getChartIcon(chartName: string): string {
    const iconMap: Record<string, string> = {
      'bar': '📊',
      'line': '📈',
      'pie': '🍰',
      'scatter': '⭐',
      'area': '🏔️',
      'bubble': '⭕',
      'heatmap': '🔥',
      'treemap': '🌳',
      'waterfall': '💧',
      'radar': '🎯',
      'candlestick': '🕯️',
      'gauge': '⏱️',
      'funnel': '🔻',
      'sankey': '🌊',
      'sunburst': '☀️'
    };

    const lowerName = chartName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    
    return '📊'; // Default icon
  }

  private getFallbackChartStructure(): ChartCategoryStructure {
    return {
      basic: {
        name: 'basic',
        displayName: 'Basic',
        count: 0,
        charts: []
      }
    };
  }
}

export default ChartDiscoveryService;