import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const DIMENSIONS = [
  { id: 'overall',    label: 'Business Unit' },
  { id: 'gender',     label: 'Gender' },
  { id: 'generation', label: 'Age Group' },
  { id: 'tenure',     label: 'Tenure' },
  { id: 'job_band',   label: 'Job Band' },
];

export default function ExploreBy() {
  const { dimension, setDimension } = useContext(AppContext);

  return (
    <div className="explore-by-section">
      <div className="explore-by-label">
        <div className="explore-by-title">EXPLORE BY</div>
        <div className="explore-by-sub">Choose a dimension to analyse engagement</div>
      </div>
      <div className="explore-pills">
        {DIMENSIONS.map((d) => (
          <button
            key={d.id}
            className={`explore-pill${dimension === d.id ? ' active' : ''}`}
            onClick={() => setDimension(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
