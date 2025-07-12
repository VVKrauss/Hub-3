// src/components/ErrorBoundary.tsx - Компонент для обработки ошибок lazy loading
import React, { Component, ErrorInfo, ReactNode } from 'react';
import CustomLoader from './ui/CustomLoader';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-500 dark:bg-dark-600 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-dark-800 rounded-lg shadow-lg">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ошибка загрузки компонента
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Произошла ошибка при загрузке страницы. Пожалуйста, попробуйте еще раз.
            </p>
            
            {this.state.error && (
              <details className="text-left mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                <summary className="cursor-pointer font-medium">Детали ошибки</summary>
                <pre className="mt-2 text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="btn-primary text-sm"
              >
                Попробовать снова
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="btn-outline text-sm"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;