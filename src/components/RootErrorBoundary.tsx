import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches any render/runtime crash in the app tree so users never see a
 * silent blank white page (a common failure mode on older mobile browsers).
 */
class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The app hit an unexpected error while loading. Reloading usually fixes it.
          </p>
          <pre className="text-xs text-left whitespace-pre-wrap break-words bg-muted text-muted-foreground rounded-md p-3 max-h-40 overflow-auto">
            {error.message}
          </pre>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Reload
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="px-4 py-2 rounded-full border border-border text-sm font-medium"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
