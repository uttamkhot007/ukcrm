import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChunkLoadError, isOffline } from "@/lib/chunk-retry";
import { forceFreshReload } from "@/lib/cache-cleanup";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Changing this value resets the boundary — pass the active module id. */
  resetKey?: string;
  /** Retry the underlying chunk load before re-rendering the children. */
  onRetry?: () => Promise<unknown> | void;
}

interface State {
  error: Error | null;
  retrying: boolean;
  offline: boolean;
}

/**
 * Catches failures from lazily-loaded sub-modules — most often a chunk that
 * could not be fetched on a slow or dropped connection — and offers a real way
 * out instead of an empty panel: retry in place, or reload onto a fresh build.
 * It also listens for `online` so a user who reconnects recovers automatically.
 */
export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retrying: false, offline: isOffline() };

  private mounted = false;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, offline: isOffline() };
  }

  componentDidMount() {
    this.mounted = true;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, retrying: false });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Sub-module failed to load", error, info.componentStack);
  }

  private handleOnline = () => {
    if (!this.mounted) return;
    this.setState({ offline: false });
    // Connection is back: recover without making the user click anything.
    if (this.state.error) void this.retry();
  };

  private handleOffline = () => {
    if (this.mounted) this.setState({ offline: true });
  };

  private retry = async () => {
    if (!this.mounted) return;
    this.setState({ retrying: true });
    try {
      await this.props.onRetry?.();
      if (this.mounted) this.setState({ error: null, retrying: false });
    } catch {
      if (this.mounted) this.setState({ retrying: false, offline: isOffline() });
    }
  };

  render() {
    const { error, retrying, offline } = this.state;
    if (!error) return this.props.children;

    const isNetwork = error instanceof ChunkLoadError || offline;
    const Icon = offline ? WifiOff : isNetwork ? RefreshCw : AlertTriangle;

    return (
      <div className="p-6" role="alert" aria-live="assertive">
        <Card className="max-w-lg mx-auto mt-10">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
              <Icon className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                {offline
                  ? "You're offline"
                  : isNetwork
                    ? "This section didn't finish loading"
                    : "Something went wrong here"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {offline
                  ? "We'll retry automatically as soon as your connection is back."
                  : isNetwork
                    ? "The connection dropped while fetching this module. Your work elsewhere in the app is unaffected."
                    : error.message}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button onClick={this.retry} disabled={retrying || offline}>
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${retrying ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {retrying ? "Retrying…" : "Try again"}
              </Button>
              <Button variant="outline" onClick={() => void forceFreshReload()}>
                Reload latest build
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default ModuleErrorBoundary;
