# File: web-application/src/__tests__/components/webview/CategorySidebar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategorySidebar } from '../../../components/webview/CategorySidebar';
import { CategoryWithDashboards, NavigationConfig } from '../../../types/webview.types';

const mockCategories: CategoryWithDashboards[] = [
  {
    id: '1',
    name: 'sales',
    display_name: 'Sales',
    description: 'Sales dashboards',
    sort_order: 0,
    dashboard_count: 2,
    dashboards: [
      {
        id: '1',
        name: 'sales-overview',
        display_name: 'Sales Overview',
        slug: 'sales-overview',
        is_featured: true,
        sort_order: 0,
        view_count: 100,
        tags: []
      },
      {
        id: '2',
        name: 'sales-kpis',
        display_name: 'Sales KPIs',
        slug: 'sales-kpis',
        is_featured: false,
        sort_order: 1,
        view_count: 50,
        tags: []
      }
    ]
  },
  {
    id: '2',
    name: 'marketing',
    display_name: 'Marketing',
    description: 'Marketing dashboards',
    sort_order: 1,
    dashboard_count: 1,
    dashboards: [
      {
        id: '3',
        name: 'marketing-overview',
        display_name: 'Marketing Overview',
        slug: 'marketing-overview',
        is_featured: false,
        sort_order: 0,
        view_count: 75,
        tags: []
      }
    ]
  }
];

const mockConfig: NavigationConfig = {
  default_expanded_categories: [],
  show_dashboard_thumbnails: true,
  show_view_counts: true,
  show_last_accessed: true,
  enable_search: true,
  enable_favorites: true,
  sidebar_width: 280
};

describe('CategorySidebar', () => {
  const mockOnCategoryToggle = jest.fn();
  const mockOnDashboardSelect = jest.fn();
  const mockOnSearchChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders categories correctly', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={[]}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('shows dashboard count', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={[]}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // Sales category count
    expect(screen.getByText('1')).toBeInTheDocument(); // Marketing category count
  });

  it('expands category when clicked', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={[]}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    const salesCategory = screen.getByText('Sales').closest('button');
    fireEvent.click(salesCategory!);

    expect(mockOnCategoryToggle).toHaveBeenCalledWith('1');
  });

  it('shows dashboards when category is expanded', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={['1']}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    expect(screen.getByText('Sales Overview')).toBeInTheDocument();
    expect(screen.getByText('Sales KPIs')).toBeInTheDocument();
  });

  it('calls onDashboardSelect when dashboard is clicked', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={['1']}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    const dashboard = screen.getByText('Sales Overview').closest('button');
    fireEvent.click(dashboard!);

    expect(mockOnDashboardSelect).toHaveBeenCalledWith('1');
  });

  it('filters categories and dashboards based on search query', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={['1', '2']}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery="marketing"
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    // Should show Marketing category and its dashboard
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Marketing Overview')).toBeInTheDocument();

    // Should not show Sales category (doesn't match search)
    expect(screen.queryByText('Sales')).not.toBeInTheDocument();
  });

  it('shows search input when search is enabled', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={[]}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    expect(screen.getByPlaceholderText('Search dashboards...')).toBeInTheDocument();
  });

  it('hides search input when search is disabled', () => {
    const configWithoutSearch = { ...mockConfig, enable_search: false };

    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={[]}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={configWithoutSearch}
      />
    );

    expect(screen.queryByPlaceholderText('Search dashboards...')).not.toBeInTheDocument();
  });

  it('shows view counts when enabled', () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        expandedCategories={['1']}
        onCategoryToggle={mockOnCategoryToggle}
        onDashboardSelect={mockOnDashboardSelect}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        config={mockConfig}
      />
    );

    expect(screen.getByText('100 views')).toBeInTheDocument();
    expect(screen.getByText('50 views')).toBeInTheDocument();
  });
});