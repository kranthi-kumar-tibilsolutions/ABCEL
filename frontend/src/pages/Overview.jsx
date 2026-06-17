import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import KpiCards          from '../components/overview/KpiCards';
import ExploreBy         from '../components/overview/ExploreBy';
import AiSummary         from '../components/overview/AiSummary';
import ClusterCards      from '../components/overview/ClusterCards';
import FocusAreas        from '../components/overview/FocusAreas';
import EngagementHeatmap from '../components/overview/charts/EngagementHeatmap';
import DriversTree       from '../components/overview/charts/DriversTree';

export default function Overview() {
  const { navigate, dimension, meta, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setActiveScreenContext({
      tab: 'overview',
      selected_dimension: dimension,
      group_avg: meta?.group_avg,
      total_respondents: meta?.total_respondents,
      strongest_category: meta?.strongest_category,
      weakest_category: meta?.weakest_category,
    });
  }, [dimension, meta]);

  return (
    <div className="overview-page">
      <KpiCards />
      <ExploreBy />
      <AiSummary />
      <ClusterCards />
      <div className="charts-two-col">
        <EngagementHeatmap onCellClick={(biz) => navigate('business-detail', { business: biz })} />
        <DriversTree />
      </div>
      <FocusAreas />
    </div>
  );
}
