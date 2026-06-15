import { createContext, useContext } from 'react';

export const AppContext = createContext({
  // Navigation
  page:               'overview',
  navigate:           () => {},
  goBack:             () => {},
  navHistory:         [],

  // Dimension
  dimension:          'Business Unit',
  setDimension:       () => {},

  // Selected entities for detail pages
  selectedBusiness:   null,
  setSelectedBusiness:() => {},
  selectedBU:         null,
  setSelectedBU:      () => {},
  selectedCluster:    null,
  setSelectedCluster: () => {},

  // Global data (fetched in App.jsx)
  businesses:          [],
  filteredBusinesses:  [],
  units:       [],
  clusters:    {},
  cohorts:     {},
  meta:        {},

  // Filter state
  isFiltersOpen:    false,
  setIsFiltersOpen: () => {},
  activeFilters:    { bands: [], clusters: [], minRespondents: 0, business: 'all' },
  setActiveFilters: () => {},

  // Cached LLM results
  summaryData:      null,
  setSummaryData:   () => {},
  insightsData:     null,
  setInsightsData:  () => {},
  focusAreasData:   null,
  setFocusAreasData:() => {},

  // Auth
  user:   null,
  logout: () => {},

  // Right panel
  rightPanelCollapsed:    false,
  setRightPanelCollapsed: () => {},
});

export const useApp = () => useContext(AppContext);
