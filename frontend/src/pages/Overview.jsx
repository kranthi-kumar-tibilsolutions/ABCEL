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
  const { navigate, setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([{ label: 'Overview' }]);
  }, []);

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
