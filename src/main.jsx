// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { NetworkProvider } from './contexts/NetworkContext.jsx';
import { ConfigProvider } from './contexts/ConfigContext.jsx'; // Import ConfigProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider> {/* ConfigProvider wraps everything */}
      <NetworkProvider> {/* NetworkProvider is needed by components within App */}
        <App />
      </NetworkProvider>
    </ConfigProvider>
  </React.StrictMode>
);