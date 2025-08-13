import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-500 p-6 shadow-md">
            <h2 className="text-xl font-bold text-red-700 mb-4">Something went wrong</h2>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-red-600 mb-2">
                Click to see error details
              </summary>
              <pre className="whitespace-pre-wrap text-red-800 bg-red-100 p-4 rounded border overflow-auto">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="mt-4 px-4 py-2 bg-red-600 text-white border-2 border-red-700 hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;