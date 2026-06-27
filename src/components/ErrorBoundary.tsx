import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // @ts-expect-error React 19 typings issue
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // @ts-expect-error React 19 typings issue
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-[#f3f4f6] flex flex-col items-center justify-center p-4 text-center" dir="rtl">
          <div className="bg-white p-8 rounded-sm shadow-lg max-w-md w-full">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-gray-600 mb-6">
              نعتذر عن هذا الخلل. يرجى تحديث الصفحة للمحاولة مرة أخرى.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 px-4 rounded-sm transition-colors"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    // @ts-expect-error React 19 typings issue
    return this.props.children;
  }
}

export default ErrorBoundary;
