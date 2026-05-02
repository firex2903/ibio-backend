import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveConfig } from './LiveConfig';
import './live-config.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiveConfig />
  </React.StrictMode>
);
