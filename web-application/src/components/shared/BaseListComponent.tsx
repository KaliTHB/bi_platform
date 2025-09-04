// components/shared/DataTable.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ChevronDown, MoreVertical } from 'lucide-react';

export interface Column {
  key: string;
  title: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

export interface Action {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  className?: string;
  show?: (row: any) => boolean;
}

export interface DataTableProps {
  data: any[];
  columns: Column[];
  actions?: Action[];
  searchable?: boolean;
  filterable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  onSearch?: (query: string) => void;
  onFilter?: (filters: any) => void;
  className?: string;
  rowClassName?: (row: any, index: number) => string;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  actions = [],
  searchable = true,
  filterable = false,
  searchPlaceholder = "Search...",
  pageSize = 7,
  loading = false,
  emptyMessage = "No data available",
  onSearch,
  onFilter,
  className = "",
  rowClassName
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value && 
            value.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortConfig, columns]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    onSearch?.(query);
  };

  // Handle sort
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    const direction = 
      sortConfig?.key === columnKey && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    
    setSortConfig({ key: columnKey, direction });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className={`card ${className}`}>
      <div className="card-body p-0">
        {/* Table wrapper with DataTables styling */}
        <div className="dataTables_wrapper dt-bootstrap4 no-footer">
          
          {/* Search and Filter Row */}
          {(searchable || filterable) && (
            <div className="row mb-3 p-3">
              <div className="col-sm-12 col-md-6">
                {searchable && (
                  <div className="search-field">
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text border-0 bg-transparent">
                          <Search size={16} className="text-muted" />
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control border-0"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="col-sm-12 col-md-6">
                {filterable && (
                  <div className="text-right">
                    <button 
                      className="btn btn-outline-secondary btn-rounded dropdown-toggle"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter size={16} className="mr-2" />
                      Filter
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Table */}
          <div className="dataTables_scroll">
            <div className="dataTables_scrollBody">
              <table className="table dataTable no-footer">
                <thead className="thead-light">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`${column.sortable ? 'sorting' : ''} ${column.className || ''}`}
                        style={{ width: column.width }}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        {column.title}
                        {column.sortable && sortConfig?.key === column.key && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    ))}
                    {actions.length > 0 && (
                      <th className="text-center" style={{ width: '80px' }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="sr-only">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center py-4 text-muted">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, index) => (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'even' : 'odd'} ${rowClassName?.(row, index) || ''}`}
                      >
                        {columns.map((column) => (
                          <td key={column.key} className={column.className}>
                            {column.render 
                              ? column.render(row[column.key], row, startIndex + index)
                              : row[column.key]
                            }
                          </td>
                        ))}
                        
                        {actions.length > 0 && (
                          <td className="text-center">
                            <div className="dropdown">
                              <button
                                className="btn btn-inverse-dark btn-icon btn-rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === index ? null : index);
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              
                              {openDropdown === index && (
                                <div className="dropdown-menu show" style={{ 
                                  position: 'absolute',
                                  right: 0,
                                  zIndex: 1000,
                                  minWidth: '160px'
                                }}>
                                  {actions
                                    .filter(action => !action.show || action.show(row))
                                    .map((action) => (
                                    <button
                                      key={action.key}
                                      className={`dropdown-item ${action.className || ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick(row);
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      {action.icon && (
                                        <span className="mr-2">{action.icon}</span>
                                      )}
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="row mt-3 px-3 pb-3">
              <div className="col-sm-12 col-md-7">
                <div className="dataTables_paginate paging_simple_numbers">
                  <ul className="pagination">
                    <li className={`paginate_button page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {getPageNumbers().map(page => (
                      <li key={page} className={`paginate_button page-item ${currentPage === page ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`paginate_button page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTable;