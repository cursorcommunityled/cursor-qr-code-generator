'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
          <div className="max-w-md mx-auto px-6">
            <div className="text-center space-y-6">
              <div className="text-6xl">⚠️</div>
              <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
              <p className="text-gray-400">
                We encountered an unexpected error. This might be due to:
              </p>
              <ul className="text-sm text-gray-500 text-left space-y-2">
                <li>• Malformed or corrupted file data</li>
                <li>• Browser compatibility issues</li>
                <li>• Unexpected input format</li>
              </ul>
              {this.state.error && (
                <details className="text-left text-xs text-gray-600 bg-gray-900 p-4 rounded-lg">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    Technical details
                  </summary>
                  <pre className="mt-2 overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleReset}
                className="btn-primary px-8 py-3 rounded-lg font-medium"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

