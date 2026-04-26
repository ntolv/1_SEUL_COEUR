"use client";

import { APP_VERSION_NAME, APP_VERSION_CODE } from "@/lib/appVersion";

export default function AppVersionBadge() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "8px",
        right: "10px",
        fontSize: "11px",
        color: "#6b7280",
        background: "rgba(255,255,255,0.8)",
        padding: "4px 8px",
        borderRadius: "8px",
        zIndex: 9999,
      }}
    >
      v{APP_VERSION_NAME} ({APP_VERSION_CODE})
    </div>
  );
}
