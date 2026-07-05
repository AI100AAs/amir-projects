import React from "react";

// Catches render/runtime errors so a single bug doesn't blank the whole app.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("AI·Coach crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <div className="card" style={{ maxWidth: 640, margin: "60px auto" }}>
            <h1>Something went wrong 😵</h1>
            <p className="muted">The app hit an unexpected error. Your saved program and history are safe.</p>
            <pre style={{ whiteSpace: "pre-wrap", color: "var(--bad)", fontSize: 13 }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="primary" onClick={() => this.setState({ error: null })}>Try again</button>
              <button onClick={() => location.reload()}>Reload app</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
