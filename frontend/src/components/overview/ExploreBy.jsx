import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const DIMENSIONS = [
  { id: 'overall',    label: 'Business Unit' },
  { id: 'business',   label: 'Business' },
  { id: 'function',   label: 'Function' },
  { id: 'location',   label: 'Location' },
  { id: 'gender',     label: 'Gender' },
  { id: 'generation', label: 'Age Group' },
  { id: 'tenure',     label: 'Tenure' },
  { id: 'job_band',   label: 'Manager' },
];

export default function ExploreBy() {
  const { dimension, setDimension } = useContext(AppContext);

  return (
    <div className="explore-by-section">
      <div className="explore-by-label">
        <span className="explore-label-title">Explore by</span>
        <span className="explore-label-sub">Choose a dimension to analyse engagement</span>
      </div>
      <div className="explore-pills">
        {DIMENSIONS.map((d) => (
          <button
            key={d.id}
            className={`explore-pill ${dimension === d.id ? 'active' : ''}`}
            onClick={() => setDimension(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
