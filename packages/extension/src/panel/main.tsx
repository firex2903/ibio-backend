import React from 'react';
import { createRoot } from 'react-dom/client';
import { Panel } from './Panel';
import './panel.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: unknown) {
    return { error: String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', color: '#bf94ff', fontFamily: 'system-ui', fontSize: '13px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600 }}>iBioX — error al cargar</div>
          <div style={{ opacity: 0.6, wordBreak: 'break-all' }}>{this.state.error}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Panel />
    </ErrorBoundary>
  </React.StrictMode>
);
