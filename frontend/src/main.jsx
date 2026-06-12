import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, RadialLinearScale,
  ArcElement, Filler, Tooltip, Legend,
  LineController, BarController,
} from 'chart.js';
import App from './App';
import './styles/globals.css';
import './styles/typography.css';
import './styles/animations.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, RadialLinearScale,
  ArcElement, Filler, Tooltip, Legend,
  LineController, BarController,
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
