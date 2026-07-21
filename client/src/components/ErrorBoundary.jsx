import { Component } from "react";

// Wraps <Outlet /> in AppLayout so a render error on one page (e.g. a bad
// API shape crashing a page component) shows a recoverable message instead
// of white-screening the whole app — sidebar/topbar stay usable and the
// user can navigate away or retry without a full reload.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] caught render error:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--radius)",
            padding: 24,
            maxWidth: 480,
            margin: "40px auto",
            textAlign: "center"
          }}
        >
          <div style={{ fontSize: 15, marginBottom: 8 }}>Something went wrong loading this page.</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
            {this.state.error?.message || "Unexpected error"}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
