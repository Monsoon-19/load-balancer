// frontend/src/components/ErrorBoundary.jsx
// Catches render errors so one broken component can't blank the whole dashboard.
// Usage: <ErrorBoundary label="stats-bar"><Component /></ErrorBoundary>
import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError:false, message:"" };
  }
  static getDerivedStateFromError(e) { return { hasError:true, message:e.message }; }
  componentDidCatch(e, info) {
    console.error(`[ErrorBoundary:${this.props.label}]`, e, info.componentStack);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{padding:"12px 16px",border:"1px solid var(--red2)",borderRadius:"var(--radius2)",
        fontFamily:"var(--mono)",fontSize:12,color:"var(--red)",background:"rgba(255,68,85,0.07)",
        display:"flex",alignItems:"center",gap:12}}>
        <span>⚠ [{this.props.label||"component"}] {this.state.message}</span>
        <button onClick={()=>this.setState({hasError:false})}
          style={{marginLeft:"auto",color:"var(--text2)",background:"transparent",
            border:"1px solid var(--border2)",borderRadius:"var(--radius)",
            padding:"2px 10px",cursor:"pointer",fontFamily:"var(--mono)",fontSize:11}}>
          retry
        </button>
      </div>
    );
  }
}
