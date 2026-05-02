import React from 'react';
import { createRoot } from 'react-dom/client';
import { Mobile } from './Mobile';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Mobile />
  </React.StrictMode>
);
