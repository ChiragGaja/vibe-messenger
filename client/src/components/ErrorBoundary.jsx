import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
          <div className="bg-surface/50 border border-border/50 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
            <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-text">Something went wrong</h1>
              <p className="text-text-muted">
                We've encountered an unexpected error. Please refresh the page to try again.
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 px-6 rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              <RefreshCw size={18} />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
