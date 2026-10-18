"use client";

/**
 * CampusMap.tsx — Sentinel Campus Resource Intelligence Map
 *
 * Standalone component. Loaded dynamically (ssr:false) from page.tsx.
 * Fetches /api/explorer/map/location-summary once on mount.
 * Renders 8 interactive markers with hover popups + click detail panel.
 * All data is real — no hardcoded resource counts.
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// ── Leaflet dynamic imports (must be ssr:false) ───────────────────────────────
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import("react-leaflet").then((m) => m.ZoomControl),
  { ssr: false }
);

// ── Types ────────────────────────────────────────────────────────────────────
interface AttentionItem {
  name: string;
  current_stock: number;
  reorder_level: number;
  unit: string;
  critical: boolean;
}

interface LocationSummary {
  location_id: string;
  location_name: string;
  dept_name: string;
  marker_state: "NORMAL" | "ATTENTION" | "CRITICAL" | "UNMAPPED";
  items: {
    total_skus: number;
    total_stock_units: number;
    low_stock_count: number;
    inventory_value: number;
    category_breakdown: Record<string, number>;
    attention_items: AttentionItem[];
  };
  assets: {
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    total_value: number;
    categories: Record<string, number>;
  };
  movements: {
    recent_in: { item: string; qty: number; timestamp: string }[];
    total_dispatched: number;
    last_movement_at: string | null;
  };
  procurement: { pending_prs: number };
  data_note: string | null;
  data_available: boolean;
}

interface CampusLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  dept: string;
}

// ── Campus locations (verified AGC coordinates) ───────────────────────────────
const CAMPUS_LOCATIONS: CampusLocation[] = [
  { id: "main",     name: "Main Academic Block", lat: 31.5628, lng: 74.9518, icon: "🏛️", dept: "Academic Affairs"     },
  { id: "hostel_b", name: "Boys' Hostel",        lat: 31.5615, lng: 74.9530, icon: "🏠", dept: "Hostel Administration" },
  { id: "hostel_g", name: "Girls' Hostel",       lat: 31.5618, lng: 74.9510, icon: "🏠", dept: "Hostel Administration" },
  { id: "sports",   name: "Sports Complex",      lat: 31.5608, lng: 74.9525, icon: "⚽", dept: "Sports Department"     },
  { id: "medical",  name: "Medical Centre",      lat: 31.5625, lng: 74.9535, icon: "🏥", dept: "Medical Center"        },
  { id: "mess",     name: "Central Mess",        lat: 31.5612, lng: 74.9515, icon: "🍽️", dept: "Mess & Catering"       },
  { id: "maint",    name: "Maintenance Store",   lat: 31.5635, lng: 74.9522, icon: "🔧", dept: "Maintenance & Works"   },
  { id: "library",  name: "Central Library",     lat: 31.5630, lng: 74.9512, icon: "📚", dept: "Academic Affairs"     },
];

// ── Filter categories ─────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { label: "All Locations",        value: "ALL"       },
  { label: "Academic & Library",   value: "ACADEMIC"  },
  { label: "Hostels",              value: "HOSTEL"    },
  { label: "Sports & Rec",        value: "SPORTS"    },
  { label: "Medical & Mess",       value: "SERVICES"  },
  { label: "Maintenance",          value: "MAINT"     },
  { label: "Needs Attention",      value: "ATTENTION" },
];

const FILTER_DEPT_MAP: Record<string, string[]> = {
  ACADEMIC:  ["Academic Affairs"],
  HOSTEL:    ["Hostel Administration"],
  SPORTS:    ["Sports Department"],
  SERVICES:  ["Medical Center", "Mess & Catering"],
  MAINT:     ["Maintenance & Works"],
};

// ── Theme tokens (warm ivory/amber — matches T in page.tsx) ──────────────────
const T = {
  bg:          "#FAF9F6",
  surface:     "#FFFFFF",
  ivory:       "#F3EFE7",
  border:      "#E9E3D8",
  borderHi:    "#D9CEBC",
  text:        "#252525",
  muted:       "#77736B",
  dim:         "#A49E95",
  amber:       "#D9A441",
  amberDeep:   "#B8862B",
  amberLight:  "#FDF3DC",
  amberBorder: "#F0D9A0",
  success:     "#3A7D44",
  successBg:   "#EBF5EE",
  danger:      "#C0392B",
  dangerBg:    "#FBEAEA",
  warn:        "#D9A441",
  warnBg:      "#FDF3DC",
};

// ── Marker state colours ──────────────────────────────────────────────────────
const STATE_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  NORMAL:    { bg: T.success,   border: "#2A6035", label: "Tracked"   },
  ATTENTION: { bg: T.amber,     border: T.amberDeep, label: "Attention" },
  CRITICAL:  { bg: T.danger,    border: "#922B21", label: "Critical"  },
  UNMAPPED:  { bg: T.muted,     border: "#5A5550", label: "Unmapped"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function fmtRs(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Div icon factory (called only on client) ──────────────────────────────────
function makeIcon(loc: CampusLocation, state: string, selected: boolean) {
  // Must import L lazily — Leaflet uses window
  const L = require("leaflet");
  const { bg, border } = STATE_STYLE[state] ?? STATE_STYLE.NORMAL;
  const size = selected ? 48 : 40;
  const ring = selected ? `box-shadow:0 0 0 3px ${T.amber},0 4px 16px rgba(0,0,0,0.25);` : `box-shadow:0 2px 8px rgba(0,0,0,0.18);`;

  return L.divIcon({
    className: "",
    iconSize:  [size, size],
    iconAnchor:[size / 2, size / 2],
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${bg};
        border:2px solid ${border};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${selected ? 20 : 17}px;
        ${ring}
        transition:all 0.2s ease;
        cursor:pointer;
      ">${loc.icon}</div>
    `,
  });
}

// ── Hover tooltip (pure DOM — avoids Popup re-render on every mouse move) ────
function HoverCard({
  loc,
  summary,
}: {
  loc: CampusLocation;
  summary: LocationSummary | undefined;
}) {
  const state = summary?.marker_state ?? "UNMAPPED";
  const { bg, label } = STATE_STYLE[state];

  return (
    <div
      style={{
        background:   T.surface,
        border:       `1px solid ${T.border}`,
        borderRadius: 10,
        padding:      "12px 14px",
        minWidth:     200,
        maxWidth:     260,
        boxShadow:    "0 8px 24px rgba(0,0,0,0.10)",
        pointerEvents:"none",
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:20 }}>{loc.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{loc.name}</div>
          <div style={{ fontSize:11, color:T.muted }}>{loc.dept}</div>
        </div>
        <span
          style={{
            fontSize:10, fontWeight:600,
            background: bg + "22", color: bg,
            border:`1px solid ${bg}55`,
            borderRadius:99, padding:"2px 7px",
          }}
        >
          {label}
        </span>
      </div>

      {!summary ? (
        <div style={{ fontSize:12, color:T.muted }}>Loading…</div>
      ) : !summary.data_available ? (
        <div style={{ fontSize:12, color:T.muted }}>
          No resource records mapped to this location yet.
        </div>
      ) : (
        <>
          {/* Inventory row */}
          <div
            style={{
              display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:6, marginBottom:8,
            }}
          >
            <MiniStat
              label="Consumables" icon="📦"
              value={`${fmt(summary.items.total_skus)} SKUs`}
              sub={`${fmt(summary.items.total_stock_units)} units`}
            />
            <MiniStat
              label="Fixed Assets" icon="🖥️"
              value={fmt(summary.assets.total)}
              sub={`${summary.assets.available} available`}
            />
          </div>

          {/* Value */}
          {(summary.items.inventory_value + summary.assets.total_value) > 0 && (
            <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>
              Total value:{" "}
              <span style={{ color:T.amberDeep, fontWeight:600 }}>
                {fmtRs(summary.items.inventory_value + summary.assets.total_value)}
              </span>
            </div>
          )}

          {/* Alerts */}
          {summary.items.low_stock_count > 0 && (
            <div
              style={{
                fontSize:11, color:T.danger,
                background:T.dangerBg,
                border:`1px solid #E8A5A0`,
                borderRadius:6, padding:"4px 8px",
                marginBottom:6,
              }}
            >
              ⚠ {summary.items.low_stock_count} low-stock item
              {summary.items.low_stock_count > 1 ? "s" : ""}
            </div>
          )}
          {summary.procurement.pending_prs > 0 && (
            <div
              style={{
                fontSize:11, color:T.warn,
                background:T.warnBg,
                border:`1px solid ${T.amberBorder}`,
                borderRadius:6, padding:"4px 8px",
                marginBottom:6,
              }}
            >
              🕐 {summary.procurement.pending_prs} pending PR
              {summary.procurement.pending_prs > 1 ? "s" : ""}
            </div>
          )}

          {/* Last movement */}
          {summary.movements.last_movement_at && (
            <div style={{ fontSize:10, color:T.dim }}>
              Last activity: {timeAgo(summary.movements.last_movement_at)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniStat({
  label, icon, value, sub,
}: {
  label: string; icon: string; value: string; sub?: string;
}) {
  return (
    <div
      style={{
        background:   T.ivory,
        border:       `1px solid ${T.border}`,
        borderRadius: 7,
        padding:      "6px 8px",
      }}
    >
      <div style={{ fontSize:10, color:T.muted, marginBottom:2 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{value}</div>
      {sub && (
        <div style={{ fontSize:10, color:T.dim }}>{sub}</div>
      )}
    </div>
  );
}

// ── Detail Panel (click) ──────────────────────────────────────────────────────
function DetailPanel({
  loc,
  summary,
  onClose,
  onNavigate,
}: {
  loc: CampusLocation;
  summary: LocationSummary | undefined;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}) {
  const state = summary?.marker_state ?? "UNMAPPED";
  const { bg, label } = STATE_STYLE[state];

  return (
    <div
      style={{
        position:     "absolute",
        top:          0, right:0,
        width:        320,
        height:       "100%",
        background:   T.surface,
        borderLeft:   `1px solid ${T.border}`,
        zIndex:       1000,
        display:      "flex",
        flexDirection:"column",
        overflow:     "hidden",
        boxShadow:    "-8px 0 32px rgba(0,0,0,0.08)",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding:    "14px 16px",
          borderBottom:`1px solid ${T.border}`,
          background: T.ivory,
          display:    "flex",
          alignItems: "center",
          gap:        10,
        }}
      >
        <span style={{ fontSize:24 }}>{loc.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{loc.name}</div>
          <div style={{ fontSize:11, color:T.muted }}>{loc.dept}</div>
        </div>
        <span
          style={{
            fontSize:10, fontWeight:700,
            background:`${bg}22`, color:bg,
            border:`1px solid ${bg}55`,
            borderRadius:99, padding:"3px 8px",
          }}
        >
          {label}
        </span>
        <button
          onClick={onClose}
          style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:16, color:T.muted, padding:"2px 4px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
        {!summary ? (
          <div style={{ color:T.muted, fontSize:13 }}>Loading data…</div>
        ) : !summary.data_available ? (
          <div
            style={{
              background:T.ivory, border:`1px solid ${T.border}`,
              borderRadius:8, padding:"14px",
              fontSize:13, color:T.muted, lineHeight:1.6,
            }}
          >
            <strong style={{ color:T.text }}>Location not mapped</strong>
            <br />
            No inventory items or assets are currently assigned to{" "}
            <em>{loc.dept}</em>. Add items to this domain or assign assets
            to this department to see live data here.
          </div>
        ) : (
          <>
            {/* Note for shared depts */}
            {summary.data_note && (
              <div
                style={{
                  fontSize:11, color:T.muted,
                  background:T.amberLight, border:`1px solid ${T.amberBorder}`,
                  borderRadius:6, padding:"6px 10px", marginBottom:12,
                }}
              >
                ℹ {summary.data_note}
              </div>
            )}

            {/* KPI row */}
            <div
              style={{
                display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                gap:8, marginBottom:14,
              }}
            >
              <PanelKPI icon="📦" label="Item SKUs" value={fmt(summary.items.total_skus)} />
              <PanelKPI icon="📊" label="Stock Units" value={fmt(summary.items.total_stock_units)} />
              <PanelKPI icon="🖥️" label="Assets" value={fmt(summary.assets.total)} />
            </div>

            {/* Inventory value */}
            {(summary.items.inventory_value + summary.assets.total_value) > 0 && (
              <SectionCard title="Resource Value">
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ color:T.muted }}>Inventory</span>
                  <span style={{ color:T.text, fontWeight:600 }}>
                    {fmtRs(summary.items.inventory_value)}
                  </span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4 }}>
                  <span style={{ color:T.muted }}>Fixed Assets</span>
                  <span style={{ color:T.text, fontWeight:600 }}>
                    {fmtRs(summary.assets.total_value)}
                  </span>
                </div>
                <div
                  style={{
                    display:"flex", justifyContent:"space-between",
                    fontSize:13, fontWeight:700, marginTop:8,
                    paddingTop:8, borderTop:`1px solid ${T.border}`,
                    color:T.amberDeep,
                  }}
                >
                  <span>Total</span>
                  <span>{fmtRs(summary.items.inventory_value + summary.assets.total_value)}</span>
                </div>
              </SectionCard>
            )}

            {/* Category breakdown */}
            {Object.keys(summary.items.category_breakdown).length > 0 && (
              <SectionCard title="Inventory by Category">
                {Object.entries(summary.items.category_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, qty]) => (
                    <div
                      key={cat}
                      style={{
                        display:"flex", justifyContent:"space-between",
                        fontSize:12, marginBottom:4,
                      }}
                    >
                      <span style={{ color:T.muted }}>{cat}</span>
                      <span style={{ fontWeight:600, color:T.text }}>{fmt(qty)} units</span>
                    </div>
                  ))}
              </SectionCard>
            )}

            {/* Asset breakdown */}
            {summary.assets.total > 0 && (
              <SectionCard title="Asset Status">
                <div style={{ display:"flex", gap:8 }}>
                  {summary.assets.available > 0 && (
                    <Chip color={T.success} label={`${summary.assets.available} Available`} />
                  )}
                  {summary.assets.assigned > 0 && (
                    <Chip color={T.amber} label={`${summary.assets.assigned} Assigned`} />
                  )}
                  {summary.assets.maintenance > 0 && (
                    <Chip color={T.danger} label={`${summary.assets.maintenance} Maintenance`} />
                  )}
                </div>
                {Object.entries(summary.assets.categories).map(([cat, count]) => (
                  <div
                    key={cat}
                    style={{
                      display:"flex", justifyContent:"space-between",
                      fontSize:12, marginTop:6, color:T.muted,
                    }}
                  >
                    <span>{cat}</span>
                    <span style={{ color:T.text, fontWeight:600 }}>{count}</span>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Alerts */}
            {summary.items.attention_items.length > 0 && (
              <SectionCard title="⚠ Low Stock Alerts">
                {summary.items.attention_items.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      display:"flex", justifyContent:"space-between",
                      alignItems:"center", fontSize:12,
                      padding:"5px 0",
                      borderBottom: i < summary.items.attention_items.length - 1
                        ? `1px solid ${T.border}` : "none",
                    }}
                  >
                    <div>
                      <div style={{ color:T.text, fontWeight:500 }}>{it.name}</div>
                      <div style={{ color:T.muted, fontSize:10 }}>
                        Reorder level: {it.reorder_level} {it.unit}
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight:700,
                        color: it.critical ? T.danger : T.warn,
                        fontSize:13,
                      }}
                    >
                      {it.current_stock} {it.unit}
                    </span>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Recent movements */}
            {summary.movements.recent_in.length > 0 && (
              <SectionCard title="Recent Dispatches">
                {summary.movements.recent_in.map((mv, i) => (
                  <div key={i} style={{ fontSize:12, marginBottom:6 }}>
                    <div style={{ color:T.text, fontWeight:500 }}>
                      {mv.item}{" "}
                      <span style={{ color:T.amberDeep }}>×{mv.qty}</span>
                    </div>
                    <div style={{ color:T.dim, fontSize:10 }}>
                      {timeAgo(mv.timestamp)}
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Pending PRs */}
            {summary.procurement.pending_prs > 0 && (
              <SectionCard title="Procurement">
                <div style={{ fontSize:12, color:T.warn }}>
                  🕐 {summary.procurement.pending_prs} purchase request
                  {summary.procurement.pending_prs > 1 ? "s" : ""} awaiting approval
                </div>
              </SectionCard>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding:"12px 16px",
          borderTop:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", gap:8,
        }}
      >
        <ActionBtn
          label="📦 View Inventory"
          onClick={() => onNavigate("inventory")}
        />
        <ActionBtn
          label="📋 View Purchase Requests"
          onClick={() => onNavigate("requisitions")}
          secondary
        />
        <ActionBtn
          label="📊 Movement History"
          onClick={() => onNavigate("txnhistory")}
          secondary
        />
      </div>
    </div>
  );
}

function PanelKPI({ icon, label, value }: { icon:string; label:string; value:string }) {
  return (
    <div
      style={{
        background:   T.ivory,
        border:       `1px solid ${T.border}`,
        borderRadius: 8,
        padding:      "8px 10px",
        textAlign:    "center",
      }}
    >
      <div style={{ fontSize:16 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{value}</div>
      <div style={{ fontSize:10, color:T.muted }}>{label}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div
      style={{
        background:   T.surface,
        border:       `1px solid ${T.border}`,
        borderRadius: 8,
        padding:      "10px 12px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize:10, fontWeight:700, letterSpacing:"0.06em",
          color:T.amberDeep, textTransform:"uppercase", marginBottom:8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Chip({ color, label }: { color:string; label:string }) {
  return (
    <span
      style={{
        fontSize:10, fontWeight:600,
        background:`${color}18`, color,
        border:`1px solid ${color}44`,
        borderRadius:99, padding:"2px 8px",
      }}
    >
      {label}
    </span>
  );
}

function ActionBtn({
  label, onClick, secondary,
}: {
  label:string; onClick:()=>void; secondary?:boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width:"100%",
        padding:"9px 14px",
        borderRadius:8,
        border: secondary ? `1px solid ${T.border}` : `1px solid ${T.amberBorder}`,
        background: secondary ? T.ivory : T.amberLight,
        color: secondary ? T.text : T.amberDeep,
        fontWeight:600, fontSize:12,
        cursor:"pointer",
        textAlign:"left",
        transition:"background 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function MapLegend() {
  return (
    <div
      style={{
        position:"absolute", bottom:36, left:10, zIndex:800,
        background:T.surface, border:`1px solid ${T.border}`,
        borderRadius:8, padding:"8px 12px",
        boxShadow:"0 2px 10px rgba(0,0,0,0.08)",
        pointerEvents:"none",
      }}
    >
      <div
        style={{
          fontSize:9, fontWeight:700, letterSpacing:"0.06em",
          color:T.amberDeep, textTransform:"uppercase", marginBottom:6,
        }}
      >
        Status
      </div>
      {Object.entries(STATE_STYLE).map(([key, val]) => (
        <div key={key} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
          <div
            style={{
              width:10, height:10, borderRadius:"50%",
              background:val.bg, border:`1.5px solid ${val.border}`,
              flexShrink:0,
            }}
          />
          <span style={{ fontSize:10, color:T.muted }}>{val.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CampusMap({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
}) {
  const [summaries, setSummaries] = useState<Record<string, LocationSummary>>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [hovered,   setHovered]   = useState<string | null>(null);
  const [filter,    setFilter]    = useState("ALL");
  const mapRef = useRef<any>(null);

  // ── Fetch location summaries once ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/explorer/map/location-summary`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSummaries(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load map data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const visibleLocations = CAMPUS_LOCATIONS.filter((loc) => {
    if (filter === "ALL") return true;
    if (filter === "ATTENTION") {
      const s = summaries[loc.id];
      return s?.marker_state === "ATTENTION" || s?.marker_state === "CRITICAL";
    }
    const allowed = FILTER_DEPT_MAP[filter] ?? [];
    return allowed.includes(loc.dept);
  });

  // ── Navigate to tab in parent ─────────────────────────────────────────────
  const handleNavigate = useCallback((tab: string) => {
    if (onNavigateTab) onNavigateTab(tab);
    setSelected(null);
  }, [onNavigateTab]);

  // ── Reset map view ────────────────────────────────────────────────────────
  const handleReset = () => {
    setFilter("ALL");
    setSelected(null);
    if (mapRef.current) {
      mapRef.current.setView([31.5621, 74.952], 17);
    }
  };

  const selectedLoc     = CAMPUS_LOCATIONS.find((l) => l.id === selected);
  const selectedSummary = selected ? summaries[selected] : undefined;

  return (
    <div
      style={{
        background:   T.surface,
        border:       `1px solid ${T.border}`,
        borderRadius: 12,
        overflow:     "hidden",
      }}
    >
      {/* ── Card header ───────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      "14px 18px",
          borderBottom: `1px solid ${T.border}`,
          background:   T.ivory,
          display:      "flex",
          alignItems:   "center",
          justifyContent:"space-between",
          flexWrap:     "wrap",
          gap:          10,
        }}
      >
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:T.text }}>
            🗺 Campus Resource Map
          </div>
          <div style={{ fontSize:11, color:T.muted }}>
            {loading
              ? "Loading resource data…"
              : error
              ? `⚠ ${error}`
              : `${Object.values(summaries).filter((s) => s.data_available).length} / ${CAMPUS_LOCATIONS.length} locations tracked`}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding:      "4px 11px",
                borderRadius: 99,
                fontSize:     11,
                fontWeight:   filter === opt.value ? 700 : 400,
                border:       `1px solid ${filter === opt.value ? T.amber : T.border}`,
                background:   filter === opt.value ? T.amberLight : T.surface,
                color:        filter === opt.value ? T.amberDeep : T.muted,
                cursor:       "pointer",
                transition:   "all 0.15s ease",
              }}
            >
              {opt.label}
              {opt.value === "ATTENTION" && (() => {
                const cnt = Object.values(summaries).filter(
                  (s) => s.marker_state === "ATTENTION" || s.marker_state === "CRITICAL"
                ).length;
                return cnt > 0 ? (
                  <span
                    style={{
                      marginLeft:4, background:T.danger, color:"#fff",
                      borderRadius:99, padding:"0 5px", fontSize:9, fontWeight:700,
                    }}
                  >
                    {cnt}
                  </span>
                ) : null;
              })()}
            </button>
          ))}
          <button
            onClick={handleReset}
            style={{
              padding:"4px 11px", borderRadius:99, fontSize:11,
              border:`1px solid ${T.border}`, background:T.surface,
              color:T.muted, cursor:"pointer",
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* ── Map + detail panel wrapper ─────────────────────────────────────── */}
      <div style={{ position:"relative", height:420, display:"flex" }}>

        {/* Leaflet map */}
        <div style={{ flex:1, position:"relative" }}>
          <MapContainer
            center={[31.5621, 74.952]}
            zoom={17}
            style={{ height:"100%", width:"100%", background:T.bg }}
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <ZoomControl position="topright" />

            {visibleLocations.map((loc) => {
              const summary = summaries[loc.id];
              const state   = summary?.marker_state ?? (loading ? "NORMAL" : "UNMAPPED");
              const isSel   = selected === loc.id;

              return (
                <Marker
                  key={loc.id}
                  position={[loc.lat, loc.lng]}
                  icon={makeIcon(loc, state, isSel)}
                  eventHandlers={{
                    click:      () => setSelected(isSel ? null : loc.id),
                    mouseover:  () => setHovered(loc.id),
                    mouseout:   () => setHovered(null),
                  }}
                >
                  {/* Hover tooltip — lightweight Popup */}
                  {hovered === loc.id && !selected && (
                    <Popup
                      closeButton={false}
                      offset={[0, -22]}
                      autoPan={false}
                    >
                      <HoverCard loc={loc} summary={summaries[loc.id]} />
                    </Popup>
                  )}
                </Marker>
              );
            })}
          </MapContainer>

          <MapLegend />
        </div>

        {/* Detail panel slides in on marker click */}
        {selectedLoc && (
          <DetailPanel
            loc={selectedLoc}
            summary={selectedSummary}
            onClose={() => setSelected(null)}
            onNavigate={handleNavigate}
          />
        )}
      </div>

      {/* ── Summary strip below map ───────────────────────────────────────── */}
      {!loading && !error && (
        <div
          style={{
            display:      "flex",
            gap:          0,
            borderTop:    `1px solid ${T.border}`,
            overflowX:    "auto",
          }}
        >
          {(["NORMAL","ATTENTION","CRITICAL","UNMAPPED"] as const).map((st, i) => {
            const cnt = Object.values(summaries).filter((s) => s.marker_state === st).length;
            const { bg, label } = STATE_STYLE[st];
            return (
              <div
                key={st}
                style={{
                  flex:1, minWidth:80, textAlign:"center",
                  padding:"8px 4px",
                  borderRight: i < 3 ? `1px solid ${T.border}` : "none",
                }}
              >
                <div style={{ fontSize:16, fontWeight:700, color:bg }}>{cnt}</div>
                <div style={{ fontSize:10, color:T.muted }}>{label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}