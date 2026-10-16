import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('DocSwift render error:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return <main style={{fontFamily:'system-ui,sans-serif',maxWidth:720,margin:'12vh auto',padding:24,color:'#202833'}}>
        <h1 style={{fontSize:28}}>DocSwift couldn't load</h1>
        <p>The page opened, but a component failed while rendering. This diagnostic message can help identify the cause.</p>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',background:'#f4f6f8',padding:16,borderRadius:10}}>{String(this.state.error?.message || this.state.error)}</pre>
        <p>Please share this exact error message so the issue can be fixed.</p>
      </main>;
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </React.StrictMode>
  );
}
