import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import KpiCards         from '../components/overview/KpiCards';
import ExploreBy        from '../components/overview/ExploreBy';
import AiSummary        from '../components/overview/AiSummary';
import ClusterCards     from '../components/overview/ClusterCards';
import FocusAreas       from '../components/overview/FocusAreas';
import EngagementBarChart   from '../components/overview/charts/EngagementBarChart';
import EngagementHeatmap    from '../components/overview/charts/EngagementHeatmap';
import DecompositionTree    from '../components/overview/charts/DecompositionTree';

export default function Overview() {
  const { meta, navigate } = useContext(AppContext);

  const handleBarClick = (bizName) => {
    if (bizName) navigate('business-detail', { business: bizName });
  };

  return (
    <div className="overview-page">
      {/* Hero header */}
      <div className="overview-hero">
        <div>
          <h1 className="overview-title">Employee Engagement Intelligence</h1>
          <p className="overview-tagline">
            <em>Listen.</em> <em>Understand.</em> <em>Lead.</em>
          </p>
        </div>
        {meta?.survey_name && (
          <span className="overview-wave-badge">{meta.survey_name}</span>
        )}
      </div>

      {/* KPI row */}
      <KpiCards />

      {/* Explore By dimension selector */}
      <ExploreBy />

      {/* AI Executive Summary — full width */}
      <AiSummary />

      {/* BU Health by Cluster — 4 columns */}
      <ClusterCards />

      {/* Bottom 3-column: bar chart | heatmap | decomposition */}
      <div className="charts-three-col">
        <EngagementBarChart onBarClick={handleBarClick} />
        <EngagementHeatmap onCellClick={(biz) => navigate('business-detail', { business: biz })} />
        <DecompositionTree />
      </div>

      {/* AI Recommended Focus Areas */}
      <FocusAreas />
    </div>
  );
}
