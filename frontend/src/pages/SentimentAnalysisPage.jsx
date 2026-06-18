import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

export default function SentimentAnalysisPage() {
  const { setBreadcrumb, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Explore' },
      { label: 'Sentiment Analysis' },
    ]);
  }, []);

  // Mark context as unavailable so the chatbot does not answer with fake data
  useEffect(() => {
    setActiveScreenContext({
      tab: 'sentiment_analysis',
      data_status: 'not_available',
      message: 'Sentiment Analysis has no real data connected yet. Open text responses have not been processed.',
    });
  }, []);

  return (
    <div className="page-container">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <rect x="3" y="3" width="46" height="46" rx="12" stroke="#CBD5E1" strokeWidth="2"/>
          <path d="M16 26h20M26 16v20" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
          Sentiment data not available yet
        </div>
        <div style={{ fontSize: 13, maxWidth: 380, lineHeight: 1.6 }}>
          Open text responses need to be processed first. Once NLP processing is complete, this section will show live sentiment scores, topic breakdowns, and sample responses.
        </div>
      </div>
    </div>
  );
}
