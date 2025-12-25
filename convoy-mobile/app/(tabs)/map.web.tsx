import React from "react";

export default function MapWeb() {
  const lat = 19.0760;
  const lng = 72.8777;
  const iframeUrl = `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`;

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#020617" }}>
      <div style={{ padding: 12, color: "#F9FAFB", fontFamily: "system-ui" }}>
        <h2 style={{ margin: 0 }}>Convoy Map (Web)</h2>
        <p style={{ marginTop: 8, color: "#9CA3AF" }}>
          Map is rendered using Google Maps embed.
        </p>
      </div>
      <iframe
        title="Convoy Map"
        src={iframeUrl}
        style={{ border: 0, width: "100%", height: "calc(100vh - 92px)" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
