// frontend/src/components/ErrorBoundary.jsx
import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "16px", border: "1px solid var(--red2)",
          borderRadius: "var(--radius2)", fontFamily: "var(--mono)",
          fontSize: 12, color: "var(--red)", background: "rgba(255,68,85,0.07)"
        }}>
          ⚠ Dashboard error: {this.state.message}
          <button onClick={() => this.setState({ hasError: false })}
            style={{ marginLeft: 12, color: "var(--text2)", background: "transparent",
              border: "1px solid var(--border2)", borderRadius: "var(--radius)",
              padding: "2px 8px", cursor: "pointer" }}>
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}