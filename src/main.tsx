import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { MiniAppProvider } from './components/MiniAppProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniAppProvider>
    <App />
    </MiniAppProvider>
  </React.StrictMode>
);
