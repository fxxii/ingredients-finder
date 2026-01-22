//import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-red-50 text-red-900 rounded-lg m-4 border border-red-200">
          <h2 className="font-bold text-lg mb-2">Something went wrong.</h2>
          <p className="text-sm font-mono bg-red-100 p-2 rounded overflow-x-auto">
            {this.state.error?.toString()}
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded shadow-sm font-bold text-sm"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
