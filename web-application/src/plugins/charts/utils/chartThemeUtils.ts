import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  BarChart,
  PieChart,
  ShowChart,
  Timeline,
  BubbleChart,
  DonutLarge,
  ScatterPlot,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Refresh,
  FileCopy,
} from '@mui/icons-material';


export const getChartIcon = (type: string, library: string) => {
    const key = `${library}-${type}`;
    switch (key) {
      case 'echarts-bar': return <BarChart />;
      case 'echarts-pie': return <PieChart />;
      case 'echarts-line': return <ShowChart />;
      case 'echarts-scatter': return <BubbleChart />;
      case 'echarts-area': return <Timeline />;
      case 'd3js-network': return <ScatterPlot />;
      case 'drilldown-pie': return <DonutLarge />;
      default: return <BarChart />;
    }
  };

export const getLibraryColor = (library: string) => {
    switch (library) {
      case 'echarts': return 'primary';
      case 'd3js': return 'secondary';
      case 'plotly': return 'info';
      case 'chartjs': return 'success';
      case 'drilldown': return 'warning';
      default: return 'default';
    }
  };