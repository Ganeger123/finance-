import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    stack: string | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State;
    public props: Props;

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, stack: null };
    }

    public static getDerivedStateFromError(error: Error): Partial<State> | null {
        return { hasError: true, error, stack: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // Save component stack to state so we can show it in the UI for debugging
        (this as any).setState({ hasError: true, error, stack: errorInfo.componentStack });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
                        <div className="text-4xl mb-4">🚨</div>
                        <h1 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h1>
                        <p className="text-slate-500 text-sm mb-6">The application crashed. Here is the error details:</p>

                        <div className="bg-slate-950 text-slate-300 p-4 rounded-xl text-xs font-mono overflow-auto mb-6">
                            <div className="font-bold mb-2">{this.state.error?.message || 'Unknown Error'}</div>
                            {this.state.stack ? (
                                <pre className="whitespace-pre-wrap text-[10px]">{this.state.stack}</pre>
                            ) : null}
                            {!this.state.stack && (
                                <div className="text-[10px] text-slate-400 mt-2">Open the browser console for a full stack trace.</div>
                            )}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return (this.props as any).children;
    }
}

export default ErrorBoundary;
