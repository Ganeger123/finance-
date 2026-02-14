import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    stack: string | null;
    showDetails: boolean;
    resourceErrors: string[];
    imageFailed: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State;

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, stack: null, showDetails: false, resourceErrors: [], imageFailed: false };
    }

    public static getDerivedStateFromError(error: Error): Partial<State> | null {
        return { hasError: true, error, stack: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // Save component stack to state so we can show it in the UI for debugging
        this.setState({ hasError: true, error, stack: errorInfo.componentStack });
    }

    // New helper to reset the error boundary so the app can continue
    private resetError = () => {
        this.setState({ hasError: false, error: null, stack: null, showDetails: false });
    };

    // Toggle stack trace visibility
    private toggleDetails = () => {
        this.setState((s) => ({ showDetails: !s.showDetails }));
    };

    // Minimal, robust fallback that doesn't rely on Tailwind
    private renderPlainFallback() {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 16 }}>
                <div style={{ maxWidth: 720, width: '100%', background: '#fff', padding: 18, borderRadius: 12, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', border: '1px solid #fee2e2' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🚨 Something went wrong</div>
                    <div style={{ color: '#374151', fontSize: 14, marginBottom: 12 }}>{this.state.error?.message || 'Unknown Error'}</div>
                    {this.state.resourceErrors.length > 0 && (
                        <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                            Failed to load:
                            <ul style={{ marginTop: 6 }}>
                                {this.state.resourceErrors.map((r, idx) => <li key={`${r}-${idx}`}>{r}</li>)}
                            </ul>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={this.resetError} style={{ flex: 1, padding: '10px 12px', background: '#16a34a', color: '#fff', borderRadius: 10, border: 'none' }}>
                            Continue to site
                        </button>
                        <button onClick={() => window.location.reload()} style={{ padding: '10px 12px', background: '#2563eb', color: '#fff', borderRadius: 10, border: 'none' }}>
                            Reload
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render the styled fallback inside a try/catch so we never return a blank page
    public render(): React.ReactNode {
        if (this.state.hasError) {
            console.error('ErrorBoundary caught:', this.state.error);

            try {
                // ...existing styled fallback UI...
                return (
                    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                        <div className="max-w-3xl w-full bg-white p-6 rounded-2xl shadow-xl border border-red-100">
                            <div className="flex gap-6 items-center">
                                {!this.state.imageFailed && (
                                    <div className="flex-shrink-0">
                                        <img
                                            src="/pwa_icon_512.png"
                                            alt="Panacée Logo"
                                            className="w-28 h-28 object-contain"
                                            onError={this.handleImageError}
                                        />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="text-4xl mb-2">🚨</div>
                                    <h1 className="text-xl font-black text-slate-900 mb-1">Something went wrong</h1>
                                    <p className="text-slate-500 text-sm mb-4">The application encountered an error. You can continue to the site or reload.</p>

                                    <div className="bg-slate-950 text-slate-300 p-3 rounded-xl text-xs font-mono overflow-auto mb-4">
                                        <div className="font-bold mb-1">{this.state.error?.message || 'Unknown Error'}</div>

                                        {this.state.stack && this.state.showDetails ? (
                                            <pre className="whitespace-pre-wrap text-[10px]">{this.state.stack}</pre>
                                        ) : null}

                                        {!this.state.stack && (
                                            <div className="text-[10px] text-slate-400 mt-2">Open the browser console for a full stack trace.</div>
                                        )}
                                    </div>

                                    {this.state.resourceErrors.length > 0 && (
                                        <div className="mb-4 text-sm text-red-500">
                                            Failed to load resource(s):
                                            <ul className="list-disc list-inside text-xs text-red-400">
                                                {this.state.resourceErrors.map((r, idx) => (
                                                    <li key={`${r}-${idx}`}>{r}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-3 items-center mb-3">
                                        <button
                                            onClick={this.toggleDetails}
                                            className="py-1 px-3 bg-gray-200 hover:bg-gray-300 text-slate-800 rounded-md text-sm"
                                        >
                                            {this.state.showDetails ? 'Hide details' : 'Show details'}
                                        </button>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={this.resetError}
                                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
                                        >
                                            Continue to site
                                        </button>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                                        >
                                            Reload
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            } catch (fallbackErr) {
                // If the styled fallback crashes (e.g. Tailwind/CSS/runtime issue), show a simple inline fallback
                console.error('ErrorBoundary fallback failed:', fallbackErr);
                return this.renderPlainFallback();
            }
        }

        return this.props.children;
    }

    public componentDidMount() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', this.handleWindowError, true);
        }
    }

    public componentWillUnmount() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('error', this.handleWindowError, true);
        }
    }

    private handleWindowError = (e: Event) => {
        try {
            const ev: any = e;
            const src = ev?.target?.src || ev?.target?.href;
            if (src) {
                this.setState((s) => ({ resourceErrors: Array.from(new Set([...s.resourceErrors, src])) }));
            }
        } catch {
            // ignore
        }
    };

    private handleImageError = () => {
        this.setState((s) => ({ imageFailed: true, resourceErrors: Array.from(new Set([...s.resourceErrors, '/panacee-logo.png'])) }));
    };
}

export default ErrorBoundary;
