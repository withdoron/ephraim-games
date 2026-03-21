import { useState } from "react";

export default function Grip() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Georgia', serif",
        color: "#e2e8f0",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "72px", marginBottom: "8px" }}>🧗</div>
      <h1
        style={{
          fontSize: "64px",
          fontWeight: 900,
          letterSpacing: "-3px",
          margin: "0 0 4px 0",
          background: "linear-gradient(135deg, #f59e0b, #ef4444, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        GRIP
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#94a3b8",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}
      >
        A climbing game by Ephraim
      </p>
      <p style={{ fontSize: "14px", color: "#64748b", marginTop: "20px" }}>
        Game loading soon...
      </p>
    </div>
  );
}
