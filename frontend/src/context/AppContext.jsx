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

  // Page breadcrumb (set by individual pages, rendered in TopBar)
  breadcrumb:    [],
  setBreadcrumb: () => {},

  // Active screen context — set by whichever page is visible; read by ChatWithData
  activeScreenContext:    null,
  setActiveScreenContext: () => {},

  // Statistical Analysis filters (TopBar-hosted)
  saFilters:      {},
  setSaFilters:   () => {},

  // Outliers & Alerts "Show top/bottom N" (TopBar-hosted)
  outliersTopN:    5,
  setOutliersTopN: () => {},

  // Employee Voice cohort/company/BU filters (TopBar-hosted)
  evFilters:    {},
  setEvFilters: () => {},

  // Sentiment Analysis filters (TopBar-hosted)
  senFilters:    {},
  setSenFilters: () => {},
});

export const useApp = () => useContext(AppContext);
