import { useState } from "react";

export default function Ringstorm() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #0a1628 0%, #1a3a5c 50%, #4a8ab5 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Georgia', serif",
        color: "#e2e8f0",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "72px", marginBottom: "8px" }}>✈️</div>
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 900,
          letterSpacing: "-2px",
          margin: "0 0 4px 0",
          background: "linear-gradient(135deg, #fbbf24, #ef4444, #f97316)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        RINGSTORM
      </h1>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 400,
          letterSpacing: "8px",
          textTransform: "uppercase",
          color: "#94a3b8",
          margin: "0",
        }}
      >
        RACERS
      </h2>
      <p style={{ fontSize: "14px", color: "#64748b", marginTop: "20px" }}>
        Game loading soon...
      </p>
    </div>
  );
}
