"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { toast as sonnerToast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Activity, Download, Loader2,
  Send, Clock, Package, Play, FileText, Users, LogOut,
  LayoutDashboard, Briefcase, FileSignature, Receipt, UserPlus, Plus,
  Monitor, RotateCcw, Bell, ScrollText, Warehouse as WarehouseIcon, X,
  MapPin, FolderTree, ChevronRight, History, Layers, Building,
  IndianRupee, RefreshCw, ShoppingCart, AlertTriangle, BarChart3,
  Search, Zap, TrendingUp, ArrowUpRight, Package2, Truck,
  CheckCircle2, CircleDot, Clock3, ChevronDown, Eye, Filter,
  Navigation, Map, AlertCircle, MoreHorizontal, ArrowLeftRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

/* ─── Leaflet loaded client-side only ─── */
/* ─── Leaflet loaded client-side only ─── */
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false });
const ZoomControl  = dynamic(() => import("react-leaflet").then(m => m.ZoomControl),  { ssr: false });

/* ─── WARM IVORY / AMBER token set ─── */
const T = {
  /* backgrounds */
  bg:       "#FAF9F6",   /* warm white page bg */
  surface:  "#FFFFFF",   /* cards */
  ivory:    "#F3EFE7",   /* secondary bg / row stripes */
  elevated: "#FFFDF9",   /* inputs, raised panels */

  /* borders */
  border:   "#E9E3D8",
  borderHi: "#D9CEBC",

  /* text */
  text:     "#252525",   /* primary */
  muted:    "#77736B",   /* secondary */
  dim:      "#A49E95",   /* tertiary / labels */

  /* accents */
  amber:       "#D9A441",
  amberDeep:   "#B8862B",
  amberLight:  "#FDF3DC",
  amberBorder: "#F0D9A0",
  gold:        "#B8862B",

  /* semantic */
  success:     "#3A7D44",
  successBg:   "#EBF5EE",
  successBdr:  "#A3CFAA",
  danger:      "#C0392B",
  dangerBg:    "#FBEAEA",
  dangerBdr:   "#E8A5A0",
  warn:        "#D9A441",
  warnBg:      "#FDF3DC",
  warnBdr:     "#F0D9A0",
  info:        "#2563EB",
  infoBg:      "#EFF6FF",
  infoBdr:     "#BFDBFE",

  /* chart palette */
  chart: ["#D9A441","#3A7D44","#2563EB","#9333EA","#E11D48","#0891B2"],
};

const DOMAIN_CFG = [
  { key: "ACADEMIC",    label: "Academic",    icon: "🎓", color: "#D9A441" },
  { key: "HOSTEL",      label: "Hostel",      icon: "🏠", color: "#9333EA" },
  { key: "SPORTS",      label: "Sports",      icon: "⚽", color: "#3A7D44" },
  { key: "MEDICAL",     label: "Medical",     icon: "🏥", color: "#E11D48" },
  { key: "MESS",        label: "Mess",        icon: "🍽️", color: "#D97706" },
  { key: "MAINTENANCE", label: "Maintenance", icon: "🔧", color: "#2563EB" },
];

/* Verified campus coordinates: AGC, 12km Stone NH-3, Meharbanpur, Amritsar */
const AGC_CENTER: [number, number] = [31.5621, 74.9520];

const CAMPUS_LOCATIONS = [
  { id: "main",     name: "Main Academic Block",    lat: 31.5628, lng: 74.9518, icon: "🏛️", dept: "Academic Affairs"     },
  { id: "hostel_b", name: "Boys' Hostel",           lat: 31.5615, lng: 74.9530, icon: "🏠", dept: "Hostel Administration" },
  { id: "hostel_g", name: "Girls' Hostel",          lat: 31.5618, lng: 74.9510, icon: "🏠", dept: "Hostel Administration" },
  { id: "sports",   name: "Sports Complex",         lat: 31.5608, lng: 74.9525, icon: "⚽", dept: "Sports Department"     },
  { id: "medical",  name: "Medical Centre",         lat: 31.5625, lng: 74.9535, icon: "🏥", dept: "Medical Center"        },
  { id: "mess",     name: "Central Mess",           lat: 31.5612, lng: 74.9515, icon: "🍽️", dept: "Mess & Catering"       },
  { id: "maint",    name: "Maintenance Store",      lat: 31.5635, lng: 74.9522, icon: "🔧", dept: "Maintenance & Works"   },
  { id: "library",  name: "Central Library",        lat: 31.5630, lng: 74.9512, icon: "📚", dept: "Academic Affairs"     },
];

/* ─── Types ─── */
interface User { id: number; username: string; full_name: string; role: string; department_id: number | null; department_name?: string; }
interface Evidence { tool_name: string; description: string; data_snapshot: string; }
interface Item {
  id: number;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  reorder_level: number;
  unit: string;
  unit_price: number;
  domain?: string;
  sub_category?: string;
  campus_location?: string;
  sub_location?: string;
}
interface Dept { id: number; name: string; code?: string; budget_total: number; budget_remaining: number; }
interface Transaction { id: number; type: string; item_id: number; quantity: number; total_value: number; timestamp: string; notes: string; }
interface Case { id: number; case_number: string; title: string; status: string; risk_class?: string; ai_narrative: string; recommended_action: string; evidence: Evidence[]; }
interface OldPO { id: number; po_number: string; status: string; quantity: number; unit_price: number; total_amount: number; item_name?: string; vendor_name?: string; department_name?: string; }
interface OldBill { id: number; bill_number: string; vendor_name?: string; po_number?: string; billed_quantity: number; billed_amount: number; is_reconciled: boolean; }
interface NewBill { id: number; po_id: number; status: string; is_reconciled?: boolean; billed_amount?: number; invoice_number?: string; payment_txn_id?: string; payment_state?: string; }
interface PrefVendor { id: number; name: string; contact_email?: string; phone?: string; avg_lead_time_days: number; on_time_delivery_rate: number; preferred: boolean; }
interface Asset { id: number; asset_tag: string; name: string; category: string; status: string; purchase_cost: number; assigned_user?: string | null; assigned_department?: string | null; }
interface Notification { id: number; title: string; message: string; is_read: boolean; created_at: string; }
interface AuditEntry { id: number; entity_type: string; entity_id: number; action: string; actor: string; details: string; timestamp: string; }
interface Warehouse { id: number; name: string; location: string; }
interface PR { id: number; title: string; department_id: number; department_name?: string; status: string; justification?: string; total_estimated?: number; }
interface DomainCard { domain: string; total_items: number; low_stock: number; total_value: number; }
interface LocationNode { id: number; name: string; type: string; children: LocationNode[]; }
interface LocationResource { resource_type: string; id: number; name: string; tag: string; category: string; quantity: number; status: string; custodian?: string | null; }
interface MovementStep { id: number; action: string; quantity: number; from_loc: string; to_loc: string; actor: string; timestamp: string; notes?: string; reference?: string; }

type AppView = "landing" | "login" | "register" | "app";
type SidebarTab = "dashboard" | "explorer" | "sentinel" | "inventory" | "assets" | "dispatch" | "requisitions" | "orders" | "bills" | "vendors" | "warehouses" | "users" | "history" | "analytics" | "audit";

const fmt_inr  = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
const fmt_time = (ts: string) => { try { return new Date(ts).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }); } catch { return ts; } };

/* ─── Shared inline styles ─── */
const card   = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" } as const;
const cardSm = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.75rem",  boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } as const;
const inp    = { background: T.elevated, border: `1px solid ${T.border}`, color: T.text, borderRadius: "0.625rem", fontSize: "0.875rem", padding: "0.625rem 0.875rem", outline: "none", width: "100%" } as const;
const amberBtn = { background: `linear-gradient(135deg, ${T.amber} 0%, ${T.amberDeep} 100%)`, color: "#fff", borderRadius: "0.625rem", fontWeight: 600, fontSize: "0.875rem", border: "none", boxShadow: "0 2px 8px rgba(217,164,65,0.35)", cursor: "pointer" } as const;
const ghostBtn = { background: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: "0.625rem", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" } as const;

/* ─── TX type color helper ─── */
const txColor = (type: string) => {
  if (type === "ISSUE" || type === "DISPATCH") return { bg: T.warnBg, text: T.amber, bdr: T.warnBdr };
  if (type === "RECEIPT" || type === "RECEIVE") return { bg: T.successBg, text: T.success, bdr: T.successBdr };
  if (type === "TRANSFER") return { bg: T.infoBg, text: T.info, bdr: T.infoBdr };
  if (type === "RETURN") return { bg: "#F3F0FF", text: "#7C3AED", bdr: "#C4B5FD" };
  return { bg: T.ivory, text: T.muted, bdr: T.border };
};

export default function SentinelApp() {
  const [view, setView]     = useState<AppView>("landing");
  const [user, setUser]     = useState<User | null>(null);
  const [userList, setUserList] = useState<User[]>([]);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm]     = useState({ username: "", password: "", full_name: "", role: "DEPT_HEAD", department_id: "" });
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [activeTab, setActiveTab]   = useState<SidebarTab>("dashboard");
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isApproving,  setIsApproving]  = useState(false);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [searchQ, setSearchQ]           = useState("");

  /* data */
  const [items, setItems]               = useState<Item[]>([]);
  const [departments, setDepartments]   = useState<Dept[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics]       = useState<any>(null);
  const [oldPOs, setOldPOs]             = useState<OldPO[]>([]);
  const [oldBills, setOldBills]         = useState<OldBill[]>([]);
  const [preferredVendors, setPreferredVendors] = useState<PrefVendor[]>([]);
  const [assets, setAssets]             = useState<Asset[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs]       = useState<AuditEntry[]>([]);
  const [warehouses, setWarehouses]     = useState<Warehouse[]>([]);
  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
  const [locationResources, setLocationResources] = useState<LocationResource[]>([]);
  const [selectedResource, setSelectedResource]   = useState<{ type: string; id: number; name: string } | null>(null);
  const [movementTimeline, setMovementTimeline]   = useState<MovementStep[]>([]);
  const [loadingExplorer, setLoadingExplorer]     = useState(false);

  /* purchase management */
  const [prs, setPRs]           = useState<PR[]>([]);
  const [newBills, setNewBills] = useState<NewBill[]>([]);
  const [domainCards, setDomainCards] = useState<DomainCard[]>([]);
  const [payLoading, setPayLoading]   = useState<number | null>(null);
  const [prModal, setPRModal]   = useState(false);
  const [poModal, setPOModal]   = useState(false);
  const [vendorRecs, setVendorRecs]       = useState<any[]>([]);
const [vendorRecsLoading, setVendorRecsLoading] = useState(false);
const [dupWarning, setDupWarning]       = useState<any>(null);
  const [activePR, setActivePR] = useState<PR | null>(null);
  const [prForm, setPRForm]     = useState({ title: "", justification: "", department_id: "", items: [{ item_id: "", quantity: "", unit_price: "" }] });
  const [poForm, setPOForm]     = useState({ vendor_id: "", expected_delivery: "" });
  const [dashSummary, setDashSummary] = useState<any>(null);

  /* campus map */
  const [selectedMapLoc, setSelectedMapLoc] = useState<typeof CAMPUS_LOCATIONS[0] | null>(null);
  const [mapReady, setMapReady]             = useState(false);
  const mapRef = useRef<any>(null);
  const [locSummaries, setLocSummaries]     = useState<Record<string, any>>({});
  const [mapKey, setMapKey] = useState(0);
const [locSummLoading, setLocSummLoading] = useState(true);

  /* forms */
 const [itemForm, setItemForm] = useState({
  name: "", sku: "",
  domain: "ACADEMIC",
  category: "Electronics",
  sub_category: "",
  campus_location: "Science Block",
  sub_location: "Computer Lab 401",
  unit: "pcs",
  current_stock: "10",
  reorder_level: "10",
  unit_price: "1000",
});
const [invDomainFilter,    setInvDomainFilter]    = useState("ALL");
const [invCategoryFilter,  setInvCategoryFilter]  = useState("ALL");
const [invLocationFilter,  setInvLocationFilter]  = useState("ALL");
const [invView,            setInvView]            = useState<"card"|"table">("card");
const [showAddItem,        setShowAddItem]        = useState(false);
const [invSearch,          setInvSearch]          = useState("");
  const [assetForm,     setAssetForm]     = useState({ asset_tag: "", name: "", category: "IT Equipment", purchase_cost: "50000" });
  const [assignForm,    setAssignForm]    = useState({ asset_id: "", user_id: "", department_id: "", notes: "" });
  const [vendorForm,    setVendorForm]    = useState({ name: "", contact_email: "", avg_lead_time_days: "5", on_time_delivery_rate: "0.95" });
  const [warehouseForm, setWarehouseForm] = useState({ name: "", location: "" });
  const [dispatchForm,  setDispatchForm]  = useState({ item_id: "", department_id: "", quantity: "", notes: "" });
  const [reqForm,       setReqForm]       = useState({ item_id: "", department_id: "", vendor_id: "", quantity: "", justification: "" });
  const [receiveQty,    setReceiveQty]    = useState<Record<number, string>>({});
  const [billForm,      setBillForm]      = useState({ po_id: "", bill_number: "", billed_quantity: "", billed_amount: "" });
    const [txSearch,    setTxSearch]    = useState("");
  const [txType,      setTxType]      = useState("");
  const [txDateFrom,  setTxDateFrom]  = useState("");
  const [txDateTo,    setTxDateTo]    = useState("");
  const [stockoutMap, setStockoutMap] = useState<Record<number, number | null>>({});
const [burnModal, setBurnModal] = useState(false);
const [burnPR, setBurnPR] = useState<PR | null>(null);
const [burnData, setBurnData] = useState<any>(null);
const [burnLoading, setBurnLoading] = useState(false);
const [burnErr, setBurnErr] = useState("");

  const API_BASE    = "http://127.0.0.1:8000/api";
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const crisis      = !!(activeCase && activeCase.status !== "RESOLVED");
  const lowStock    = items.filter(i => i.current_stock <= i.reorder_level).length;
  const invValue    = items.reduce((s, i) => s + i.current_stock * i.unit_price, 0);
  const assetValue  = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
  const totalValue  = invValue + assetValue;

  const showToast = (msg: string, type: "success" | "error") =>
    type === "success" ? sonnerToast.success(msg) : sonnerToast.error(msg);

  /* ─── Domain card computation ─── */
  const computeDomainCards = useCallback((allItems: Item[]) => {
    const map: Record<string, DomainCard> = {};
    DOMAIN_CFG.forEach(d => { map[d.key] = { domain: d.key, total_items: 0, low_stock: 0, total_value: 0 }; });
    allItems.forEach(it => {
      const dom = (it.domain || "ACADEMIC").toUpperCase();
      if (!map[dom]) return;
      map[dom].total_items++;
      map[dom].total_value += (it.current_stock || 0) * (it.unit_price || 0);
      if (it.current_stock <= it.reorder_level) map[dom].low_stock++;
    });
    setDomainCards(Object.values(map));
  }, []);

  /* ─── Fetch all system data ─── */
 const fetchSystemData = async () => {
  try {
    const results = await Promise.allSettled([
      fetch(`${API_BASE}/cases`),
      fetch(`${API_BASE}/items`),
      fetch(`${API_BASE}/departments`),
      fetch(`${API_BASE}/transactions`),
      fetch(`${API_BASE}/analytics/expenditure`),
      fetch(`${API_BASE}/procurement/purchase-orders`),
      fetch(`${API_BASE}/procurement/bills`),
      fetch(`${API_BASE}/procurement/vendors/preferred`),
      fetch(`${API_BASE}/auth/users`),
      fetch(`${API_BASE}/assets`),
      fetch(`${API_BASE}/operations/notifications`),
      fetch(`${API_BASE}/operations/audit`),
      fetch(`${API_BASE}/operations/warehouses`),
      fetch(`${API_BASE}/explorer/locations/tree`),
    ]);

    const json = async (i: number) => {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.ok) return r.value.json();
      return null;
    };

    const cases = await json(0);  if (cases) setActiveCase(cases.length > 0 ? cases[0] : null);
    const it    = await json(1);  if (it) { setItems(it); computeDomainCards(it); }
    const dep   = await json(2);  if (dep) setDepartments(dep);
    const tx    = await json(3);  if (tx) setTransactions(tx);
    const an    = await json(4);  if (an) setAnalytics(an);
    const po    = await json(5);  if (po) setOldPOs(po);
    const bi    = await json(6);  if (bi) setOldBills(bi);
    const ve    = await json(7);  if (ve) setPreferredVendors(ve);
    const us    = await json(8);  if (us) setUserList(us);
    const as    = await json(9);  if (as) setAssets(as);
    const no    = await json(10); if (no) setNotifications(no);
    const au    = await json(11); if (au) setAuditLogs(au);
    const wh    = await json(12); if (wh) setWarehouses(wh);
    const tree  = await json(13);
    if (tree) {
      setLocationTree(tree);
      if (tree.length > 0 && !selectedLocation) selectLocationNode(tree[0]);
    }

    // === SMART REORDER — Stockout Predictions ===
    fetch(`${API_BASE}/items/stockout-predictions`)
      .then(r => r.ok ? r.json() : [])
      .then((preds: any[]) => {
        const map: Record<number, number | null> = {};
        preds.forEach(p => { map[p.item_id] = p.days_until_stockout; });
        setStockoutMap(map);
      })
      .catch(() => {});

  } catch (e) { console.error(e); }
};

  const loadPRs = useCallback(async () => {
    if (!user) return;
    try { const r = await fetch(`${API_BASE}/procurement/purchase-requests?user_id=${user.id}`); if (r.ok) setPRs(await r.json()); } catch {}
  }, [user]);

  const loadNewBills = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`${API_BASE}/procurement/bills?user_id=${user.id}`);
      if (r.ok) {
        const raw = await r.json();
        setNewBills(raw.map((b: any) => ({ ...b, status: b.status ?? (b.is_reconciled === true ? "MATCHED" : b.is_reconciled === false ? "MISMATCH" : "PENDING") })));
      }
    } catch {}
  }, [user]);

  const loadDashSummary = useCallback(async () => {
    if (!user) return;
    try { const r = await fetch(`${API_BASE}/procurement/dashboard-summary?user_id=${user.id}`); if (r.ok) setDashSummary(await r.json()); } catch {}
  }, [user]);

  useEffect(() => { fetchSystemData(); setMapReady(true); }, []);
 useEffect(() => {
  const url = `http://localhost:8000/api/explorer/map/location-summary`;
  console.log("🗺 Fetching map summaries from:", url);
  fetch(url)
    .then(r => {
      console.log("🗺 Response status:", r.status);
      return r.json();
    })
    .then(d => {
      console.log("🗺 Summaries received:", Object.keys(d));
      setLocSummaries(d);
      setLocSummLoading(false);
    })
    .catch(err => {
      console.error("🗺 Fetch failed:", err);
      setLocSummLoading(false);
    });
}, []);
  useEffect(() => { if (user) { loadPRs(); loadNewBills(); loadDashSummary(); } }, [user]);
  useEffect(() => {
    if (!user) return;
    if (activeTab === "requisitions") loadPRs();
    if (activeTab === "bills") loadNewBills();
    if (activeTab === "dashboard") { loadDashSummary(); fetchSystemData(); }
  }, [activeTab, user]);

  const selectLocationNode = async (node: LocationNode) => {
    setSelectedLocation(node);
    setLoadingExplorer(true);
    try { const r = await fetch(`${API_BASE}/explorer/locations/${node.id}/resources`); if (r.ok) setLocationResources(await r.json()); } catch {}
    setLoadingExplorer(false);
  };

  const inspectResourceTimeline = async (type: string, id: number, name: string) => {
    setSelectedResource({ type, id, name });
    try { const r = await fetch(`${API_BASE}/explorer/movements/${type}/${id}`); if (r.ok) setMovementTimeline(await r.json()); } catch {}
  };

  /* ─── Auth ─── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
      if (!res.ok) throw new Error("Invalid username or password");
      const ud = await res.json(); setUser(ud); setView("app");
      showToast(`Signed in as ${ud.full_name}`, "success"); fetchSystemData();
    } catch (err: any) { setAuthError(err.message); } finally { setIsAuthLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError("");
    try {
      const deptId = regForm.department_id && parseInt(regForm.department_id) > 0 ? parseInt(regForm.department_id) : null;
      const res = await fetch(`${API_BASE}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: regForm.username, password: regForm.password, full_name: regForm.full_name, role: regForm.role, department_id: deptId }) });
      if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
      const nu = await res.json(); showToast(`Account "${nu.username}" created!`, "success");
      setLoginForm({ username: regForm.username, password: regForm.password }); setView("login");
    } catch (err: any) { setAuthError(err.message); } finally { setIsAuthLoading(false); }
  };

  const markRead = async (id: number) => { await fetch(`${API_BASE}/operations/notifications/${id}/read`, { method: "POST" }); await fetchSystemData(); };

  /* ─── Existing handlers (all preserved exactly) ─── */
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await fetch(`${API_BASE}/operations/warehouses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(warehouseForm) }); if (!r.ok) throw new Error((await r.json()).detail || "Failed"); showToast(`Warehouse "${warehouseForm.name}" created`, "success"); setWarehouseForm({ name: "", location: "" }); await fetchSystemData(); } catch (err: any) { showToast(err.message, "error"); }
  };
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
       try {
      const r = await fetch(`${API_BASE}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemForm.name,
          sku: itemForm.sku,
          domain: itemForm.domain,
          category: itemForm.category,
          sub_category: itemForm.sub_category,
          campus_location: itemForm.campus_location,
          sub_location: itemForm.sub_location,
          unit: itemForm.unit,
          current_stock: parseInt(itemForm.current_stock),
          reorder_level: parseInt(itemForm.reorder_level),
          unit_price: parseFloat(itemForm.unit_price),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Failed");
      showToast("Item saved", "success");
      setShowAddItem(false);
      setItemForm({ name: "", sku: "", domain: "ACADEMIC", category: "Electronics", sub_category: "", campus_location: "Science Block", sub_location: "Computer Lab 401", unit: "pcs", current_stock: "10", reorder_level: "10", unit_price: "1000" });
      await fetchSystemData();
    } catch (err: any) { showToast(err.message, "error"); }};
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await fetch(`${API_BASE}/assets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asset_tag: assetForm.asset_tag, name: assetForm.name, category: assetForm.category, purchase_cost: parseFloat(assetForm.purchase_cost) }) }); if (!r.ok) throw new Error((await r.json()).detail || "Failed"); showToast(`Asset ${assetForm.asset_tag} registered`, "success"); setAssetForm({ asset_tag: "", name: "", category: "IT Equipment", purchase_cost: "50000" }); await fetchSystemData(); } catch (err: any) { showToast(err.message, "error"); }
  };
  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await fetch(`${API_BASE}/assets/${assignForm.asset_id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: assignForm.user_id ? parseInt(assignForm.user_id) : null, department_id: assignForm.department_id ? parseInt(assignForm.department_id) : null, notes: assignForm.notes || "Assigned via console" }) }); if (!r.ok) throw new Error((await r.json()).detail || "Assign failed"); showToast("Asset assigned", "success"); setAssignForm({ asset_id: "", user_id: "", department_id: "", notes: "" }); await fetchSystemData(); } catch (err: any) { showToast(err.message, "error"); }
  };
  const handleReturnAsset   = async (id: number) => { try { const r = await fetch(`${API_BASE}/assets/${id}/return`, { method: "POST" }); if (!r.ok) throw new Error("Return failed"); showToast("Asset returned", "success"); await fetchSystemData(); } catch (err: any) { showToast(err.message, "error"); } };
  const handleCreateVendor  = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await fetch(`${API_BASE}/vendors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: vendorForm.name, contact_email: vendorForm.contact_email, avg_lead_time_days: parseInt(vendorForm.avg_lead_time_days), on_time_delivery_rate: parseFloat(vendorForm.on_time_delivery_rate) }) }); if (!r.ok) throw new Error("Failed"); showToast("Vendor registered", "success"); setVendorForm({ name: "", contact_email: "", avg_lead_time_days: "5", on_time_delivery_rate: "0.95" }); await fetchSystemData(); } catch (err: any) { showToast(err.message, "error"); }
  };
  const handleManualDispatch = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const r = await fetch(`${API_BASE}/transactions/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id:       parseInt(dispatchForm.item_id),
        department_id: parseInt(dispatchForm.department_id),
        type:          "ISSUE",
        quantity:      parseInt(dispatchForm.quantity),
        notes:         dispatchForm.notes || "Manual dispatch",
      }),
    });
    if (!r.ok) throw new Error((await r.json()).detail || "Dispatch failed");
    const data = await r.json();

    showToast("Stock issued successfully", "success");

    if (data.reorder_triggered) {
      setTimeout(() => {
        sonnerToast("🤖 Smart Reorder Agent triggered — PR-" + data.reorder_pr_id + " auto-drafted & HOD notified", {
          duration: 6000,
          style: {
            background: "#FDF3DC",
            color: "#B8862B",
            border: "1px solid #F0D9A0",
          },
        });
      }, 800);
    }

    setDispatchForm({ item_id: "", department_id: "", quantity: "", notes: "" });
    await fetchSystemData();
  } catch (e: any) {
    showToast(e.message, "error");
  }
};
  const createOldRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await fetch(`${API_BASE}/procurement/requisitions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_id: parseInt(reqForm.item_id), department_id: parseInt(reqForm.department_id), vendor_id: reqForm.vendor_id ? parseInt(reqForm.vendor_id) : null, quantity: parseInt(reqForm.quantity), justification: reqForm.justification }) }); if (!r.ok) throw new Error((await r.json()).detail || "Failed"); showToast("Requisition submitted", "success"); setReqForm({ item_id: "", department_id: "", vendor_id: "", quantity: "", justification: "" }); await fetchSystemData(); setActiveTab("orders"); } catch (err: any) { showToast(err.message, "error"); }
  };
  const approvePO = async (id: number) => { const r = await fetch(`${API_BASE}/procurement/purchase-orders/${id}/approve`, { method: "POST" }); if (!r.ok) { showToast("Approve failed", "error"); return; } showToast("PO approved", "success"); await fetchSystemData(); };
  const receivePO = async (id: number) => { const qty = parseInt(receiveQty[id] || "0"); if (!qty) { showToast("Enter qty", "error"); return; } const r = await fetch(`${API_BASE}/procurement/purchase-orders/${id}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ received_quantity: qty }) }); if (!r.ok) { showToast("Receive failed", "error"); return; } showToast("Goods received", "success"); setReceiveQty({ ...receiveQty, [id]: "" }); await fetchSystemData(); };
  const submitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`${API_BASE}/procurement/bills`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ po_id: parseInt(billForm.po_id), bill_number: billForm.bill_number, billed_quantity: parseInt(billForm.billed_quantity), billed_amount: parseFloat(billForm.billed_amount) }) });
    if (!r.ok) { showToast("Bill failed", "error"); return; }
    const d = await r.json(); showToast(d.mismatch_flag ? "⚠ MISMATCH — Case opened, vendor emailed" : "Bill reconciled ✓", d.mismatch_flag ? "error" : "success");
    setBillForm({ po_id: "", bill_number: "", billed_quantity: "", billed_amount: "" }); await fetchSystemData(); loadNewBills();
  };
 const injectIncident = async () => {
  setIsSimulating(true);
  try {
    const res = await fetch(`${API_BASE}/demo/inject-cs-shock`, { method: "POST" });
    const data = await res.json();
    console.log("Simulate result:", data);
    await fetchSystemData();
    showToast("Crisis opened — check Sentinel desk", "success");
    setActiveTab("sentinel");
  } catch(err) {
    console.error("Simulate error:", err);
    showToast("Simulation failed", "error");
  } finally {
    setIsSimulating(false);
  }
};
  const approveAction = async () => {
    if (!activeCase) return; setIsApproving(true);
    try { await fetch(`${API_BASE}/cases/${activeCase.id}/approve`, { method: "POST" }); await fetchSystemData(); showToast("Agent PO authorized", "success"); } catch { showToast("Approval failed", "error"); } finally { setIsApproving(false); }
  };
  const submitPR = async () => {
    const payload = { title: prForm.title, justification: prForm.justification, department_id: parseInt(prForm.department_id), requested_by_id: user!.id, items: prForm.items.map(i => ({ item_id: parseInt(i.item_id), quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) })) };
    const r = await fetch(`${API_BASE}/procurement/purchase-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { showToast("Requisition submitted — HOD notified ✉", "success"); setPRModal(false); setPRForm({ title: "", justification: "", department_id: "", items: [{ item_id: "", quantity: "", unit_price: "" }] }); loadPRs(); }
    else { const err = await r.json(); showToast(err.detail || "Failed", "error"); }
  };
   const doApprovePR = async (pr: PR) => {
    const r = await fetch(`${API_BASE}/procurement/purchase-requests/${pr.id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user!.id })
    });
    const d = await r.json();
    if (r.ok) {
      showToast("Approved — Storekeeper notified ✓", "success");
      setBurnModal(false); setBurnData(null); setBurnPR(null);
      loadPRs();
    } else showToast(d.detail || "Failed", "error");
  };

  const approvePR = async (pr: PR) => {
    setBurnPR(pr); setBurnModal(true); setBurnLoading(true); setBurnErr(""); setBurnData(null);
    try {
      const r = await fetch(`${API_BASE}/procurement/budget-burn-rate/${pr.department_id}`);
      const d = await r.json();
      if (r.ok) setBurnData(d);
      else setBurnErr(d.detail || "Could not load burn rate data");
    } catch { setBurnErr("Network error — could not load burn rate"); }
    finally { setBurnLoading(false); }
  };
  const rejectPR  = async (pr: PR) => { const r = await fetch(`${API_BASE}/procurement/purchase-requests/${pr.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user!.id, reason: "Rejected by HOD" }) }); if (r.ok) { showToast("Rejected", "success"); loadPRs(); } else showToast("Rejection failed", "error"); };
    const openPOModal = async (pr: PR) => {
    setActivePR(pr);
    setPOModal(true);
    setVendorRecs([]);
    setDupWarning(null);
    setVendorRecsLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/procurement/vendors/preferred`),
        fetch(`${API_BASE}/procurement/duplicate-check/${pr.id}`)
      ]);
      const vData = await vRes.json();
      const dData = await dRes.json();
      if (vRes.ok) setVendorRecs(vData);
      if (dRes.ok && dData.duplicate) setDupWarning(dData);
    } catch { /* non-fatal */ }
    finally { setVendorRecsLoading(false); }
  };
  const createPOFromPR = async () => { if (!activePR) return; const r = await fetch(`${API_BASE}/procurement/purchase-orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pr_id: activePR.id, vendor_id: parseInt(poForm.vendor_id), expected_delivery: poForm.expected_delivery || null, user_id: user!.id }) }); if (r.ok) { showToast("Purchase Order created!", "success"); setPOModal(false); setActivePR(null); loadPRs(); fetchSystemData(); } else { const err = await r.json(); showToast(err.detail || "PO creation failed", "error"); } };
  const initiatePayment = async (bill: NewBill) => {
    setPayLoading(bill.id);
    try { const r = await fetch(`${API_BASE}/payments/initiate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bill_id: bill.id, user_id: user!.id }) }); const d = await r.json(); if (r.ok && d.redirect_url) { showToast("PhonePe session created…", "success"); window.open(d.redirect_url, "_blank"); } else showToast(d.detail || "Payment failed", "error"); } finally { setPayLoading(null); }
  };
  const checkPayStatus = async (txn_id: string) => { const r = await fetch(`${API_BASE}/payments/status/${txn_id}`); const d = await r.json(); showToast(`Status: ${d.state}`, d.state === "COMPLETED" ? "success" : "error"); loadNewBills(); };

  /* ─── derived alerts ─── */
  const alerts = [
    ...items.filter(i => i.current_stock <= i.reorder_level).map(i => ({ kind: "Low Stock" as const, text: `${i.name} — only ${i.current_stock} ${i.unit} left`, sev: "warn" as const, action: () => setActiveTab("inventory") })),
    ...prs.filter(p => p.status === "PENDING").map(p => ({ kind: "Pending Approval" as const, text: `PR-${p.id}: ${p.title}`, sev: "info" as const, action: () => setActiveTab("requisitions") })),
    ...newBills.filter(b => b.status === "MISMATCH").map(b => ({ kind: "Bill Mismatch" as const, text: `BILL-${b.id} — quantity / amount mismatch`, sev: "crit" as const, action: () => setActiveTab("bills") })),
    ...(crisis ? [{ kind: "Open Case" as const, text: `${activeCase!.case_number}: ${activeCase!.title}`, sev: "crit" as const, action: () => setActiveTab("sentinel") }] : []),
  ];
  const txList = transactions as any[];
  const filteredTx = txList.filter((t: any) => {
    if (txSearch && ![(t.item_name ?? ""), (t.department_name ?? ""), (t.notes ?? "")].some((s: string) => s.toLowerCase().includes(txSearch.toLowerCase()))) return false;
    if (txType && t.type !== txType) return false;
    if (txDateFrom && t.timestamp < txDateFrom) return false;
    if (txDateTo   && t.timestamp > txDateTo + "T23:59:59") return false;
    return true;
  });
  /* ─── recent movements derived from transactions ─── */
  const recentMovements = transactions.slice(0, 6).map(t => {
    const item = items.find(i => i.id === t.item_id);
    const dept = departments.find(d => d.id === (t as any).department_id);
    return { id: t.id, type: t.type, resource: item?.name ?? `Item #${t.item_id}`, from: t.type === "ISSUE" ? "Central Store" : "Vendor", to: dept?.name ?? "Department", qty: t.quantity, timestamp: t.timestamp, status: "Completed" };
  });

  /* ─── recent activity derived ─── */
  const recentActivity = [
    ...transactions.slice(0, 3).map((t, i) => ({ id: `tx-${i}`, icon: t.type === "ISSUE" ? "📤" : "📦", text: `${t.type} — ${items.find(x => x.id === t.item_id)?.name ?? `Item #${t.item_id}`}`, sub: `Qty: ${t.quantity}`, ts: t.timestamp, status: "success" as const })),
    ...prs.filter(p => p.status !== "DRAFT").slice(0, 2).map((p, i) => ({ id: `pr-${i}`, icon: "📋", text: `PR-${p.id}: ${p.title}`, sub: p.department_name ?? "", ts: "", status: p.status === "APPROVED" ? "success" as const : p.status === "REJECTED" ? "error" as const : "warn" as const })),
    ...newBills.filter(b => b.status === "MISMATCH").slice(0, 1).map((b, i) => ({ id: `bill-${i}`, icon: "⚠️", text: `Bill BILL-${b.id} mismatched`, sub: "Vendor complaint sent", ts: "", status: "error" as const })),
  ].sort((a, b) => (b.ts > a.ts ? 1 : -1)).slice(0, 8);

  /* ─── timeline stages ─── */
  const LIFECYCLE = ["Requested", "Approved", "Ordered", "Received", "Stored", "Dispatched", "Delivered"];

  /* ─── search filtered items ─── */
  const searchResults = searchQ.length > 1
    ? [...items.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase())).map(i => ({ label: i.name, sub: i.sku, go: () => setActiveTab("inventory") })),
       ...assets.filter(a => a.name.toLowerCase().includes(searchQ.toLowerCase())).map(a => ({ label: a.name, sub: a.asset_tag, go: () => setActiveTab("assets") })),
       ...preferredVendors.filter(v => v.name.toLowerCase().includes(searchQ.toLowerCase())).map(v => ({ label: v.name, sub: "Vendor", go: () => setActiveTab("vendors") }))]
    : [];

  /* ═══════════════ LANDING ═══════════════ */
  if (view === "landing") return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <nav style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.amber }}><Activity className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-base" style={{ color: T.text }}>Sentinel</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.amberLight, color: T.amberDeep, border: `1px solid ${T.amberBorder}` }}>AGC Amritsar</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView("login")} style={ghostBtn} className="px-4 py-2">Sign in</button>
            <button onClick={() => setView("login")} style={{ ...amberBtn, padding: "0.5rem 1.25rem" }}>Enter System →</button>
          </div>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-8 font-medium" style={{ background: T.amberLight, color: T.amberDeep, border: `1px solid ${T.amberBorder}` }}>
          <MapPin className="w-3.5 h-3.5" /> Amritsar Group of Colleges, Punjab
        </div>
        <h1 className="text-5xl font-light leading-tight mb-5 max-w-3xl mx-auto" style={{ color: T.text }}>
          Ledgers track what was spent.<br />
          <span style={{ color: T.amber, fontWeight: 600 }}>Sentinel tracks what will break.</span>
        </h1>
        <p className="text-xl mb-12 max-w-2xl mx-auto" style={{ color: T.muted }}>Every resource. Every movement. Every decision. Connected.</p>
        <div className="flex justify-center gap-4 mb-20">
          <button onClick={() => setView("login")} style={{ ...amberBtn, padding: "0.875rem 2rem", fontSize: "1rem" }}>Enter System</button>
          <button onClick={() => setView("register")} style={{ ...ghostBtn, padding: "0.875rem 2rem", fontSize: "1rem", borderRadius: "0.625rem" }}>Create Account</button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {DOMAIN_CFG.map(d => (
            <div key={d.key} style={{ ...cardSm, padding: "1.25rem", textAlign: "center" }}>
              <div className="text-2xl mb-1">{d.icon}</div>
              <div className="text-xs font-medium" style={{ color: T.muted }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ═══════════════ AUTH ═══════════════ */
  if (view === "register" || view === "login") {
    const isReg = view === "register";
    return (
      <div style={{ background: T.bg, color: T.text, minHeight: "100vh" }} className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, width: "100%", maxWidth: "400px", padding: "2rem" }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.amber }}><Activity className="w-4 h-4 text-white" /></div>
            <span className="font-bold" style={{ color: T.text }}>Sentinel</span>
          </div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: T.text }}>{isReg ? "Create account" : "Welcome back"}</h2>
          <p className="text-sm mb-6" style={{ color: T.muted }}>{isReg ? "Register as an operator" : "Sign in to your workspace"}</p>
          {authError && <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: T.dangerBg, color: T.danger, border: `1px solid ${T.dangerBdr}` }}><AlertTriangle className="w-4 h-4 shrink-0" />{authError}</div>}
          {!isReg && (
            <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: T.amberLight, border: `1px solid ${T.amberBorder}`, color: T.amberDeep }}>
              <div className="font-semibold mb-1">Quick sign in:</div>
              admin/admin · hod_acad/password · finance/password · procurement/password
            </div>
          )}
          <form onSubmit={isReg ? handleRegister : handleLogin} className="space-y-3">
            {isReg && <input required placeholder="Full name" style={inp} value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} />}
            <input required placeholder="Username" style={inp} value={isReg ? regForm.username : loginForm.username} onChange={e => isReg ? setRegForm({ ...regForm, username: e.target.value }) : setLoginForm({ ...loginForm, username: e.target.value })} />
            <input required type="password" placeholder="Password" style={inp} value={isReg ? regForm.password : loginForm.password} onChange={e => isReg ? setRegForm({ ...regForm, password: e.target.value }) : setLoginForm({ ...loginForm, password: e.target.value })} />
            {isReg && <>
              <select style={inp} value={regForm.role} onChange={e => setRegForm({ ...regForm, role: e.target.value })}>
                <option value="SUPER_ADMIN">Super Administrator</option><option value="DEPT_HEAD">Department Head</option>
                <option value="PROCUREMENT_OFFICER">Procurement Officer</option><option value="STOREKEEPER">Storekeeper</option>
                <option value="FINANCE_OFFICER">Finance Officer</option><option value="AUDITOR">Auditor</option>
              </select>
              <select style={inp} value={regForm.department_id} onChange={e => setRegForm({ ...regForm, department_id: e.target.value })}>
                <option value="">No department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </>}
            <button type="submit" disabled={isAuthLoading} style={{ ...amberBtn, width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {isAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isReg ? "Create account" : "Sign in"}
            </button>
          </form>
          <div className="flex justify-between mt-5 text-sm">
            <button onClick={() => setView("landing")} style={{ color: T.muted }}>← Home</button>
            <button onClick={() => setView(isReg ? "login" : "register")} style={{ color: T.amber, fontWeight: 500 }}>{isReg ? "Sign in" : "Register"}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════ APP SHELL ═══════════════ */
  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="flex">

      {/* ── SIDEBAR ── */}
      <aside className="w-58 h-screen sticky top-0 flex flex-col shrink-0 overflow-y-auto" style={{ width: "228px", background: T.surface, borderRight: `1px solid ${T.border}` }}>
        <div className="h-14 flex items-center gap-2.5 px-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.amber }}>
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: T.text }}>Sentinel</div>
            <div className="text-[10px]" style={{ color: T.muted }}>AGC Amritsar</div>
          </div>
          {crisis && <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: T.danger }} />}
        </div>
        <div className="flex-1 p-3 space-y-0.5 text-xs overflow-y-auto">
          <SidebarSection label="Intelligence" />
          <NavBtn active={activeTab==="dashboard"}    onClick={()=>setActiveTab("dashboard")}    Icon={LayoutDashboard} label="Overview" />
          <NavBtn active={activeTab==="explorer"}     onClick={()=>setActiveTab("explorer")}     Icon={FolderTree}      label="Resource Explorer" />
          <NavBtn active={activeTab==="sentinel"}     onClick={()=>setActiveTab("sentinel")}     Icon={Activity}        label="Sentinel Desk" badge={crisis} />
          <SidebarSection label="Physical Assets" />
          <NavBtn active={activeTab==="inventory"}    onClick={()=>setActiveTab("inventory")}    Icon={Package}         label="Stock (Consumables)" />
          <NavBtn active={activeTab==="assets"}       onClick={()=>setActiveTab("assets")}       Icon={Monitor}         label="Fixed Assets" />
          <NavBtn active={activeTab==="warehouses"}   onClick={()=>setActiveTab("warehouses")}   Icon={WarehouseIcon}   label="Warehouses" />
          <NavBtn active={activeTab==="dispatch"}     onClick={()=>setActiveTab("dispatch")}     Icon={Send}            label="Dispatch" />
          <SidebarSection label="Procure-to-Pay" />
          <NavBtn active={activeTab==="requisitions"} onClick={()=>setActiveTab("requisitions")} Icon={FileText}        label="Requisitions" />
          <NavBtn active={activeTab==="orders"}       onClick={()=>setActiveTab("orders")}       Icon={FileSignature}   label="Purchase Orders" />
          <NavBtn active={activeTab==="bills"}        onClick={()=>setActiveTab("bills")}        Icon={Receipt}         label="Bills & Match" />
          <NavBtn active={activeTab==="vendors"}      onClick={()=>setActiveTab("vendors")}      Icon={Briefcase}       label="Vendors" />
          <SidebarSection label="Administration" />
          <NavBtn active={activeTab==="users"}        onClick={()=>setActiveTab("users")}        Icon={Users}           label="Users" />
          <NavBtn active={activeTab==="audit"}        onClick={()=>setActiveTab("audit")}        Icon={ScrollText}      label="Audit Log" />
          <NavBtn active={activeTab==="history"}      onClick={()=>setActiveTab("history")}      Icon={Clock}           label="Txn History" />
          <NavBtn active={activeTab==="analytics"}    onClick={()=>setActiveTab("analytics")}    Icon={BarChart3}       label="Analytics" />
        </div>
        <div className="p-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: T.ivory }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: T.amber }}>
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: T.text }}>{user?.full_name}</div>
              <div className="text-[10px] truncate" style={{ color: T.muted }}>{user?.role?.replaceAll("_"," ")}</div>
            </div>
            <button onClick={() => { setUser(null); setView("landing"); }} style={{ color: T.muted }}><LogOut className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* ── TOPBAR ── */}
        <header className="h-14 flex items-center gap-4 px-6 shrink-0 sticky top-0 z-40" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          {/* Breadcrumb */}
          <div className="text-sm font-medium" style={{ color: T.text }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replaceAll("-"," ")}</div>
          <span style={{ color: T.dim }}>/</span>
          <div className="text-sm" style={{ color: T.muted }}>Amritsar Group of Colleges</div>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.dim }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search resources, vendors, assets…" style={{ ...inp, paddingLeft: "2.25rem", paddingTop: "0.4rem", paddingBottom: "0.4rem" }} />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 rounded-lg shadow-xl z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                {searchResults.slice(0, 5).map((r, i) => (
                  <div key={i} onClick={() => { r.go(); setSearchQ(""); }} className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Package className="w-4 h-4" style={{ color: T.amber }} />
                    <div><div className="text-sm font-medium" style={{ color: T.text }}>{r.label}</div><div className="text-xs" style={{ color: T.muted }}>{r.sub}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg" style={{ border: `1px solid ${T.border}`, background: showNotifs ? T.ivory : "transparent" }}>
              <Bell className="w-4 h-4" style={{ color: unreadCount ? T.amber : T.muted }} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: T.amber }}>{unreadCount}</span>}
            </button>

            {/* User */}
            <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: T.ivory, color: T.muted, border: `1px solid ${T.border}` }}>
              {user?.role?.replaceAll("_"," ")}
            </div>

            {/* Simulate anomaly */}
            {user?.role !== "FINANCE_OFFICER" && user?.role !== "AUDITOR" && (
              <button onClick={injectIncident} disabled={isSimulating}
                style={{ ...amberBtn, padding: "0.4rem 1rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-xs">{crisis ? "Crisis active" : "Simulate"}</span>
              </button>
            )}
          </div>
        </header>

        {/* Notifications panel */}
        <AnimatePresence>
          {showNotifs && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed top-16 right-6 z-50 w-88" style={{ width: "360px" }}>
              <div style={{ ...card, overflow: "hidden" }}>
                <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <span className="font-semibold text-sm" style={{ color: T.text }}>Notifications</span>
                  <button onClick={() => setShowNotifs(false)}><X className="w-4 h-4" style={{ color: T.muted }} /></button>
                </div>
                <div className="overflow-y-auto max-h-80">
                  {notifications.length === 0
                    ? <div className="p-8 text-center text-sm" style={{ color: T.muted }}>No new notifications</div>
                    : notifications.map(n => (
                      <div key={n.id} className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: n.is_read ? "transparent" : T.amberLight }}>
                        <div className="flex justify-between gap-2">
                          <span className="text-sm font-medium" style={{ color: T.text }}>{n.title}</span>
                          {!n.is_read && <button onClick={() => markRead(n.id)} className="text-xs whitespace-nowrap" style={{ color: T.amber }}>Mark read</button>}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: T.muted }}>{n.message}</div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ════════════════════════════ DASHBOARD ════════════════════════════ */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-6 max-w-screen-xl mx-auto">

              {/* A. Welcome header */}
              <div className="rounded-xl p-6 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${T.amber}18 0%, ${T.amberLight} 100%)`, border: `1px solid ${T.amberBorder}` }}>
                <div>
                  <h1 className="text-2xl font-light mb-1" style={{ color: T.text }}>
                    Ledgers track what was spent. <span style={{ color: T.amber, fontWeight: 600 }}>Sentinel tracks what will break.</span>
                  </h1>
                  <p className="text-sm" style={{ color: T.muted }}>Every resource. Every movement. Every decision. Connected. · Welcome, {user?.full_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium" style={{ color: T.muted }}>{user?.role?.replaceAll("_"," ")}</div>
                  <div className="text-xs" style={{ color: T.dim }}>{user?.department_name ?? "All departments"}</div>
                  <button onClick={() => { fetchSystemData(); loadDashSummary(); }}
                    className="mt-2 flex items-center gap-1 text-xs ml-auto" style={{ color: T.amber }}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              </div>

              {/* B. KPI Cards (5) */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Total Resources",    val: String(items.length + assets.length), icon: Package2,      sub: `${items.length} consumables · ${assets.length} fixed`,        color: T.amber,   onClick: () => setActiveTab("inventory") },
                  { label: "Campus Movements",   val: String(transactions.length),          icon: Truck,         sub: "transactions recorded",                                        color: T.info,    onClick: () => setActiveTab("history") },
                  { label: "Pending Approvals",  val: String(prs.filter(p => p.status === "PENDING").length + oldPOs.filter(p => p.status === "PENDING_APPROVAL").length), icon: Clock3, sub: "awaiting action", color: T.warn, onClick: () => setActiveTab("requisitions") },
                  { label: "Resource Value",     val: totalValue ? fmt_inr(totalValue) : "—", icon: IndianRupee, sub: "inventory + fixed assets",                                     color: T.success, onClick: () => setActiveTab("analytics") },
                  { label: "Low Stock",          val: String(lowStock),                     icon: AlertTriangle, sub: `SKU${lowStock !== 1 ? "s" : ""} below reorder level`,          color: lowStock > 0 ? T.danger : T.success, onClick: () => setActiveTab("inventory") },
                ].map((k, i) => (
                  <motion.div key={i} whileHover={{ y: -2 }} onClick={k.onClick}
                    style={{ ...card, padding: "1.25rem", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-5" style={{ background: k.color, transform: "translate(25%,-25%)" }} />
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                        <k.icon className="w-4 h-4" style={{ color: k.color }} />
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5" style={{ color: T.dim }} />
                    </div>
                    <div className="text-2xl font-bold mb-1" style={{ color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.val}</div>
                    <div className="text-xs font-medium mb-0.5" style={{ color: T.text }}>{k.label}</div>
                    <div className="text-[10px]" style={{ color: T.muted }}>{k.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* PR Summary if available */}
              {dashSummary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Open PRs",       val: dashSummary.requisitions?.pending_approval ?? 0, color: T.amber },
                    { label: "Active POs",     val: dashSummary.purchase_orders?.total ?? 0,          color: T.info },
                    { label: "Bills recorded", val: dashSummary.bills?.total ?? 0,                    color: T.success },
                    { label: "Low SKUs",       val: dashSummary.low_stock_items ?? lowStock,           color: T.danger },
                  ].map(s => (
                    <div key={s.label} style={{ ...cardSm, padding: "1rem" }}>
                      <div className="text-xs font-medium mb-1" style={{ color: T.muted }}>{s.label}</div>
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 3: Map + Needs Attention */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* C. Campus Map */}
                <div className="lg:col-span-2" style={{ ...card, overflow: "hidden" }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4" style={{ color: T.amber }} />
                      <span className="font-semibold text-sm" style={{ color: T.text }}>Campus Map</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.amberLight, color: T.amberDeep }}>AGC · NH-3 Meharbanpur</span>
                    </div>
                  <button
  onClick={() => {
  setLocSummLoading(true);
  fetch(`http://localhost:8000/api/explorer/map/location-summary`)
    .then(r => r.json())
    .then(d => {
      setLocSummaries(d);
      setLocSummLoading(false);
      setMapKey(k => k + 1); // forces Leaflet to remount with fresh data
    })
    .catch(() => setLocSummLoading(false));
}}
  style={{
    padding:"4px 11px", borderRadius:99, fontSize:11,
    border:`1px solid ${T.border}`, background:T.surface,
    color:T.muted, cursor:"pointer",
  }}
>
  🔄 Refresh
</button>
                  </div>

                  <div style={{ height: "360px", position: "relative" }}>
                    {mapReady && (
                     <MapContainer
                      key={mapKey}
  center={AGC_CENTER}
  zoom={17}
  style={{ height: "100%", width: "100%" }}
  zoomControl={false}
  ref={mapRef}
  attributionControl={true}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
  <ZoomControl position="bottomright" />

  {CAMPUS_LOCATIONS.map(loc => {
    const summ  = locSummaries[loc.id];
    const state = summ?.marker_state ?? (locSummLoading ? "LOADING" : "UNMAPPED");

    // Marker ring colour by state
    const ringColor =
      state === "CRITICAL"  ? "#C0392B" :
      state === "ATTENTION" ? "#D9A441" :
      state === "NORMAL"    ? "#3A7D44" : "#A49E95";

    return (
      <Marker
        key={loc.id}
        position={[loc.lat, loc.lng]}
        eventHandlers={{ click: () => setSelectedMapLoc(loc) }}
      >
        <Popup closeButton={false} offset={[0, -10]}>
          <div style={{
            minWidth: 220, maxWidth: 260,
            fontFamily: "Inter, sans-serif",
            padding: "2px 0",
          }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:20 }}>{loc.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#252525" }}>{loc.name}</div>
                <div style={{ fontSize:11, color:"#77736B" }}>{loc.dept}</div>
              </div>
              <span style={{
                fontSize:9, fontWeight:700, borderRadius:99, padding:"2px 7px",
                background: ringColor + "20", color: ringColor,
                border: `1px solid ${ringColor}55`,
              }}>
                {state === "CRITICAL"  ? "Critical"  :
                 state === "ATTENTION" ? "Attention" :
                 state === "NORMAL"    ? "Tracked"   :
                 state === "LOADING"   ? "Loading…"  : "Unmapped"}
              </span>
            </div>

            {/* Body */}
            {locSummLoading && (
              <div style={{ fontSize:11, color:"#A49E95" }}>Loading resource data…</div>
            )}

            {!locSummLoading && !summ?.data_available && (
              <div style={{
                fontSize:11, color:"#77736B",
                background:"#F3EFE7", borderRadius:6,
                padding:"7px 9px", lineHeight:1.5,
              }}>
                No resources mapped to this location yet.<br/>
                Add items to the <strong>{loc.dept}</strong> domain to see live data.
              </div>
            )}

            {!locSummLoading && summ?.data_available && (
              <>
                {/* KPI pills */}
                <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                  <StatPill label="SKUs"   value={summ.items.total_skus}        color="#D9A441" />
                  <StatPill label="Stock"  value={summ.items.total_stock_units} color="#2563EB" />
                  <StatPill label="Assets" value={summ.assets.total}            color="#9333EA" />
                </div>

                {/* Value */}
                {(summ.items.inventory_value + summ.assets.total_value) > 0 && (
                  <div style={{ fontSize:11, color:"#77736B", marginBottom:6 }}>
                    Total value:{" "}
                    <span style={{ color:"#B8862B", fontWeight:700 }}>
                      ₹{(summ.items.inventory_value + summ.assets.total_value)
                          .toLocaleString("en-IN", { maximumFractionDigits:0 })}
                    </span>
                  </div>
                )}

                {/* Low stock warning */}
                {summ.items.low_stock_count > 0 && (
                  <div style={{
                    fontSize:11, color:"#C0392B",
                    background:"#FBEAEA", border:"1px solid #E8A5A0",
                    borderRadius:6, padding:"4px 8px", marginBottom:6,
                  }}>
                    ⚠ {summ.items.low_stock_count} low-stock item{summ.items.low_stock_count > 1 ? "s" : ""}
                  </div>
                )}

                {/* Pending PRs */}
                {summ.procurement.pending_prs > 0 && (
                  <div style={{
                    fontSize:11, color:"#B8862B",
                    background:"#FDF3DC", border:"1px solid #F0D9A0",
                    borderRadius:6, padding:"4px 8px", marginBottom:6,
                  }}>
                    🕐 {summ.procurement.pending_prs} pending PR{summ.procurement.pending_prs > 1 ? "s" : ""}
                  </div>
                )}

                {/* Category breakdown */}
                {Object.keys(summ.items.category_breakdown).length > 0 && (
                  <div style={{
                    background:"#F3EFE7", borderRadius:6,
                    padding:"6px 8px", marginBottom:6,
                  }}>
                    {Object.entries(summ.items.category_breakdown)
                      .sort((a:any, b:any) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([cat, qty]:any) => (
                        <div key={cat} style={{
                          display:"flex", justifyContent:"space-between",
                          fontSize:10, color:"#77736B", marginBottom:2,
                        }}>
                          <span>{cat}</span>
                          <span style={{ fontWeight:600, color:"#252525" }}>{qty} units</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Last movement */}
                {summ.movements.last_movement_at && (
                  <div style={{ fontSize:10, color:"#A49E95" }}>
                    Last dispatch:{" "}
                    {(() => {
                      const diff = Date.now() - new Date(summ.movements.last_movement_at).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h ago`;
                      return `${Math.floor(hrs/24)}d ago`;
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </Popup>
      </Marker>
    );
  })}
</MapContainer>
                    )}
                    {!mapReady && <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.amber }} /></div>}
                  </div>

                  {/* Map legend */}
                  <div className="px-5 py-3 flex items-center gap-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}`, background: T.ivory }}>
                    <span className="text-[10px] font-medium" style={{ color: T.muted }}>CAMPUS LOCATIONS:</span>
                    {CAMPUS_LOCATIONS.slice(0, 5).map(l => (
                      <span key={l.id} className="text-[10px] flex items-center gap-1" style={{ color: T.muted }}>{l.icon} {l.name.split(" ")[0]}</span>
                    ))}
                  </div>
                </div>

                {/* D. Needs Attention */}
                <div style={{ ...card, overflow: "hidden" }}>
                  <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <AlertCircle className="w-4 h-4" style={{ color: T.danger }} />
                    <span className="font-semibold text-sm" style={{ color: T.text }}>Needs Attention</span>
                    {alerts.length > 0 && <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: T.dangerBg, color: T.danger }}>{alerts.length}</span>}
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: "370px" }}>
                    {alerts.length === 0
                      ? <div className="p-8 text-center text-sm" style={{ color: T.muted }}>All clear — no outstanding issues.</div>
                      : alerts.map((a, i) => (
                        <div key={i} className="px-4 py-3.5 flex items-start gap-3" style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }} onClick={a.action}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: a.sev === "crit" ? T.dangerBg : a.sev === "warn" ? T.warnBg : T.infoBg }}>
                            {a.sev === "crit" ? <AlertTriangle className="w-4 h-4" style={{ color: T.danger }} /> : a.sev === "warn" ? <AlertCircle className="w-4 h-4" style={{ color: T.warn }} /> : <CircleDot className="w-4 h-4" style={{ color: T.info }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold mb-0.5" style={{ color: a.sev === "crit" ? T.danger : a.sev === "warn" ? T.amberDeep : T.info }}>{a.kind}</div>
                            <div className="text-xs leading-snug" style={{ color: T.text }}>{a.text}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: T.dim }} />
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Row 4: Quick Actions + Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* E. Quick Actions */}
                <div style={card}>
                  <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" style={{ color: T.amber }} />
                      <span className="font-semibold text-sm" style={{ color: T.text }}>Quick Actions</span>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    {[
                      { label: "Add Resource",       icon: Plus,          action: () => setActiveTab("inventory"),    color: T.amber },
                      { label: "Record Movement",    icon: ArrowLeftRight, action: () => setActiveTab("dispatch"),    color: T.info },
                      { label: "Create Requisition", icon: FileText,      action: () => { setActiveTab("requisitions"); setTimeout(() => setPRModal(true), 200); }, color: T.success },
                      { label: "Receive PO",         icon: Package,       action: () => setActiveTab("orders"),       color: "#9333EA" },
                      { label: "View Inventory",     icon: Layers,        action: () => setActiveTab("inventory"),    color: T.amberDeep },
                      { label: "Generate Report",    icon: Download,      action: () => activeCase && window.open(`${API_BASE}/cases/${activeCase.id}/pdf`, "_blank"), color: T.muted },
                    ].map((qa, i) => (
                      <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={qa.action}
                        className="flex items-center gap-3 p-3.5 rounded-xl text-left"
                        style={{ background: T.ivory, border: `1px solid ${T.border}`, cursor: "pointer", width: "100%" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${qa.color}18`, border: `1px solid ${qa.color}28` }}>
                          <qa.icon className="w-4 h-4" style={{ color: qa.color }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: T.text }}>{qa.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* F. Recent Activity */}
                <div style={{ ...card, overflow: "hidden" }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" style={{ color: T.amber }} />
                      <span className="font-semibold text-sm" style={{ color: T.text }}>Recent Activity</span>
                    </div>
                    <button onClick={() => setActiveTab("history")} className="text-xs flex items-center gap-1" style={{ color: T.amber }}>View all <ArrowUpRight className="w-3 h-3" /></button>
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
                    {recentActivity.length === 0
                      ? <div className="p-8 text-center text-sm" style={{ color: T.muted }}>No recent activity yet.</div>
                      : recentActivity.map((a, i) => (
                        <div key={a.id} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: i < recentActivity.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          <div className="text-base w-6 text-center">{a.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm leading-snug" style={{ color: T.text }}>{a.text}</div>
                            {a.sub && <div className="text-xs mt-0.5" style={{ color: T.muted }}>{a.sub}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            {a.ts && <div className="text-[10px]" style={{ color: T.dim }}>{fmt_time(a.ts)}</div>}
                            <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: a.status === "success" ? T.successBg : a.status === "error" ? T.dangerBg : T.warnBg, color: a.status === "success" ? T.success : a.status === "error" ? T.danger : T.amberDeep }}>
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Row 5: Recent Transactions + Campus Movements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* G. Recent Transactions */}
                <div className="lg:col-span-2" style={{ ...card, overflow: "hidden" }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" style={{ color: T.amber }} />
                      <span className="font-semibold text-sm" style={{ color: T.text }}>Recent Transactions</span>
                    </div>
                    <button onClick={() => setActiveTab("history")} className="text-xs flex items-center gap-1" style={{ color: T.amber }}>View all <ArrowUpRight className="w-3 h-3" /></button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                      <thead>
                        <tr style={{ background: T.ivory }}>
                          {["Txn ID","Resource","Type","Source","Destination","Qty","Date","Status"].map(h => (
                            <th key={h} style={{ padding: "0.625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0
                          ? <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: T.muted }}>No transactions yet.</td></tr>
                          : transactions.slice(0, 8).map((t, i) => {
                            const itm  = items.find(x => x.id === t.item_id);
                            const dept = departments.find(d => d.id === (t as any).department_id);
                            const tc   = txColor(t.type);
                            return (
                              <tr key={t.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                                <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace,monospace", color: T.muted, whiteSpace: "nowrap" }}>TXN-{t.id}</td>
                                <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: T.text }}>{itm?.name ?? `Item #${t.item_id}`}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <span style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.bdr}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>{t.type}</span>
                                </td>
                                <td style={{ padding: "0.75rem 1rem", color: T.muted, fontSize: "0.75rem" }}>{t.type === "ISSUE" ? "Central Store" : "Vendor"}</td>
                                <td style={{ padding: "0.75rem 1rem", color: T.muted, fontSize: "0.75rem" }}>{dept?.name ?? "—"}</td>
                                <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "ui-monospace,monospace", color: T.text }}>{t.quantity}</td>
                                <td style={{ padding: "0.75rem 1rem", color: T.dim, fontSize: "0.75rem", whiteSpace: "nowrap" }}>{fmt_time(t.timestamp)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <span style={{ background: T.successBg, color: T.success, border: `1px solid ${T.successBdr}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>Completed</span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* H. Campus Movements */}
                <div style={{ ...card, overflow: "hidden" }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" style={{ color: T.amber }} />
                      <span className="font-semibold text-sm" style={{ color: T.text }}>Campus Movements</span>
                    </div>
                    <button onClick={() => setActiveTab("history")} className="text-xs flex items-center gap-1" style={{ color: T.amber }}>All <ArrowUpRight className="w-3 h-3" /></button>
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
                    {recentMovements.length === 0
                      ? <div className="p-8 text-center text-sm" style={{ color: T.muted }}>No movements recorded yet.</div>
                      : recentMovements.map((m, i) => (
                        <div key={m.id} className="p-4" style={{ borderBottom: i < recentMovements.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          {/* Source → Destination */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-xs font-semibold px-2 py-1 rounded-lg truncate max-w-[100px]" style={{ background: T.ivory, color: T.text, border: `1px solid ${T.border}` }} title={m.from}>{m.from}</div>
                            <div className="flex-1 flex items-center gap-1">
                              <div className="flex-1 h-px" style={{ background: T.amber }} />
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: T.amber }} />
                              <div className="flex-1 h-px" style={{ background: T.amber }} />
                            </div>
                            <div className="text-xs font-semibold px-2 py-1 rounded-lg truncate max-w-[100px]" style={{ background: T.amberLight, color: T.amberDeep, border: `1px solid ${T.amberBorder}` }} title={m.to}>{m.to}</div>
                          </div>
                          {/* Resource details */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium" style={{ color: T.text }}>{m.resource}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: T.muted }}>Qty: {m.qty} · {fmt_time(m.timestamp)}</div>
                            </div>
                            <span style={{ background: T.successBg, color: T.success, border: `1px solid ${T.successBdr}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>
                              {m.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Row 6: Movement Timeline */}
              <div style={{ ...card, padding: "1.5rem" }}>
                <div className="flex items-center gap-2 mb-5">
                  <History className="w-4 h-4" style={{ color: T.amber }} />
                  <span className="font-semibold text-sm" style={{ color: T.text }}>Resource Lifecycle — Movement Timeline</span>
                  <span className="text-xs ml-2" style={{ color: T.muted }}>Typical procurement-to-delivery stages</span>
                </div>
                <div className="flex items-start gap-0 overflow-x-auto pb-2">
                  {LIFECYCLE.map((stage, i) => {
                    /* derive completion from real data */
                    const done = i === 0 ? prs.length > 0
                      : i === 1 ? prs.some(p => p.status === "APPROVED")
                      : i === 2 ? oldPOs.length > 0
                      : i === 3 ? oldPOs.some(p => p.status === "RECEIVED")
                      : i === 4 ? warehouses.length > 0
                      : i === 5 ? transactions.some(t => t.type === "ISSUE")
                      : transactions.some(t => t.type === "ISSUE" && t.quantity > 0);
                    const active = !done && (
                      i === 0 ? true
                      : i === 1 ? prs.length > 0
                      : i === 2 ? prs.some(p => p.status === "APPROVED")
                      : i === 3 ? oldPOs.length > 0
                      : i === 4 ? oldPOs.some(p => p.status === "RECEIVED")
                      : i === 5 ? warehouses.length > 0
                      : transactions.some(t => t.type === "ISSUE")
                    );
                    return (
                      <div key={stage} className="flex items-center">
                        <div className="flex flex-col items-center" style={{ minWidth: "90px" }}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 mb-2"
                            style={{ borderColor: done ? T.success : active ? T.amber : T.border, background: done ? T.successBg : active ? T.amberLight : T.ivory }}>
                            {done ? <Check className="w-4 h-4" style={{ color: T.success }} /> : active ? <CircleDot className="w-4 h-4" style={{ color: T.amber }} /> : <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.border }} />}
                          </div>
                          <div className="text-[10px] font-semibold text-center" style={{ color: done ? T.success : active ? T.amberDeep : T.dim }}>{stage}</div>
                          <div className="text-[9px] text-center mt-0.5" style={{ color: T.dim }}>{done ? "Done" : active ? "In progress" : "Pending"}</div>
                        </div>
                        {i < LIFECYCLE.length - 1 && (
                          <div className="h-0.5 w-8 mx-1" style={{ background: done ? T.success : T.border, flexShrink: 0, marginBottom: "20px" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Domain bar chart */}
              {domainCards.length > 0 && (
                <div style={{ ...card, padding: "1.5rem" }}>
                  <h3 className="text-sm font-semibold mb-5" style={{ color: T.text }}>Stock Value by Campus Domain</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={domainCards.map((c, i) => ({ name: DOMAIN_CFG.find(d => d.key === c.domain)?.label ?? c.domain, value: Math.round(c.total_value / 1000), color: DOMAIN_CFG[i]?.color ?? T.amber }))}>
                      <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`} />
                      <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} formatter={(v: any) => [`₹${v}K`, "Stock Value"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {domainCards.map((_, i) => <Cell key={i} fill={DOMAIN_CFG[i]?.color ?? T.amber} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════ EXPLORER ════════════════════════════ */}
          {activeTab === "explorer" && (
            <div className="space-y-5 max-w-6xl">
              <div>
                <h2 className="text-2xl font-semibold mb-1" style={{ color: T.text }}>University Resource Explorer</h2>
                <p className="text-sm" style={{ color: T.muted }}>Navigate the campus hierarchy to inspect physical resources and their complete movement histories.</p>
              </div>
              <div className="grid grid-cols-12 gap-0 rounded-xl overflow-hidden" style={{ height: "580px", border: `1px solid ${T.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                {/* Tree */}
                <div className="col-span-3 overflow-y-auto p-3" style={{ background: T.ivory, borderRight: `1px solid ${T.border}` }}>
                  <div className="text-[10px] tracking-widest uppercase font-semibold mb-3 px-2" style={{ color: T.muted }}>Campus Locations</div>
                  {locationTree.map(node => <LocationTreeNode key={node.id} node={node} selectedId={selectedLocation?.id} onSelect={selectLocationNode} depth={0} />)}
                  {locationTree.length === 0 && <div className="text-xs text-center py-8" style={{ color: T.muted }}>No locations seeded yet.</div>}
                </div>
                {/* Resources */}
                <div className="col-span-5 overflow-y-auto flex flex-col" style={{ borderRight: `1px solid ${T.border}` }}>
                  <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" style={{ color: T.amber }} />
                      <span className="text-sm font-semibold" style={{ color: T.text }}>{selectedLocation?.name ?? "Select a location"}</span>
                    </div>
                    <span className="text-xs" style={{ color: T.muted }}>{locationResources.length} resources</span>
                  </div>
                  {loadingExplorer
                    ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.amber }} /></div>
                    : locationResources.length === 0
                      ? <div className="flex-1 flex items-center justify-center text-sm" style={{ color: T.muted }}>No resources at this location.</div>
                      : <div className="p-4 space-y-2 overflow-y-auto flex-1">
                          {locationResources.map((res, i) => (
                            <div key={i} onClick={() => inspectResourceTimeline(res.resource_type, res.id, res.name)}
                              className="p-3.5 rounded-xl cursor-pointer"
                              style={{ background: selectedResource?.id === res.id ? T.amberLight : T.ivory, border: `1px solid ${selectedResource?.id === res.id ? T.amberBorder : T.border}`, transition: "all 0.15s" }}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-sm font-medium" style={{ color: T.text }}>{res.name}</div>
                                  <div className="text-[10px] mt-0.5" style={{ color: T.muted, fontFamily: "ui-monospace, monospace" }}>{res.tag} · {res.category}</div>
                                </div>
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.ivory, color: T.muted, border: `1px solid ${T.border}` }}>{res.status}</span>
                              </div>
                              {res.custodian && <div className="text-[10px] mt-1.5 font-medium" style={{ color: T.amber }}>Custodian: {res.custodian}</div>}
                            </div>
                          ))}
                        </div>}
                </div>
                {/* Timeline */}
                <div className="col-span-4 overflow-y-auto" style={{ background: T.ivory }}>
                  <div className="px-5 py-4 flex items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}>
                    <History className="w-4 h-4" style={{ color: T.amber }} />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>Lifecycle</span>
                  </div>
                  {!selectedResource
                    ? <div className="h-full flex items-center justify-center text-sm text-center p-6" style={{ color: T.muted }}>Click any resource to see its movement history.</div>
                    : <div className="p-5">
                        <div className="pb-3 mb-4" style={{ borderBottom: `1px solid ${T.border}` }}>
                          <div className="font-semibold text-sm" style={{ color: T.text }}>{selectedResource.name}</div>
                          <div className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: T.muted }}>{selectedResource.type} #{selectedResource.id}</div>
                        </div>
                        {movementTimeline.length === 0
                          ? <div className="text-sm" style={{ color: T.muted }}>No movement history yet.</div>
                          : <div className="relative pl-5 space-y-5">
                              <div className="absolute top-2 left-1.5 bottom-2 w-0.5" style={{ background: T.amberBorder }} />
                              {movementTimeline.map(m => (
                                <div key={m.id} className="relative">
                                  <div className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full border-2" style={{ background: T.amberLight, borderColor: T.amber }} />
                                  <div className="text-xs font-semibold mb-0.5" style={{ color: T.text }}>{m.action}</div>
                                  <div className="text-xs" style={{ color: T.muted }}>{m.from_loc} → {m.to_loc}</div>
                                  <div className="text-[10px] mt-0.5" style={{ color: T.dim }}>{new Date(m.timestamp).toLocaleDateString()}</div>
                                  {m.reference && <div className="text-[9px] mt-0.5" style={{ color: T.amber, fontFamily: "ui-monospace, monospace" }}>Ref: {m.reference}</div>}
                                </div>
                              ))}
                            </div>}
                      </div>}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════ SENTINEL ════════════════════════════ */}
          {activeTab === "sentinel" && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-2xl font-semibold mb-1" style={{ color: T.text }}>Sentinel Investigation Desk</h2>
                <p className="text-sm" style={{ color: T.muted }}>Detect → investigate → policy → authorize → verify</p>
              </div>
              {activeCase ? (
                <div style={{ ...card, overflow: "hidden" }}>
                  {crisis && <div className="h-1" style={{ background: `linear-gradient(90deg, ${T.amber}, ${T.amberDeep})` }} />}
                  <div className="px-6 py-5 flex justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${T.border}`, background: T.ivory }}>
                    <div>
                      <div className="text-xs font-bold mb-1" style={{ color: T.amber, fontFamily: "ui-monospace, monospace" }}>{activeCase.case_number}</div>
                      <div className="font-semibold" style={{ color: T.text }}>{activeCase.title}</div>
                    </div>
                    <a href={`${API_BASE}/cases/${activeCase.id}/pdf`} target="_blank"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold h-fit"
                      style={{ ...ghostBtn, background: T.surface }}>
                      <Download className="w-3.5 h-3.5" /> PDF Audit
                    </a>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{activeCase.ai_narrative}</p>
                    <div className="flex flex-wrap gap-2">
                      {activeCase.evidence?.map((ev, i) => (
                        <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{ background: T.ivory, border: `1px solid ${T.border}`, color: T.muted }}>{ev.description}</span>
                      ))}
                    </div>
                    {activeCase.status !== "RESOLVED"
                      ? <button onClick={approveAction} disabled={isApproving} style={{ ...amberBtn, width: "100%", padding: "0.875rem", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
                          {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Authorize Purchase Order
                        </button>
                      : <div className="p-4 rounded-lg text-sm font-medium flex gap-2 items-center" style={{ background: T.successBg, color: T.success, border: `1px solid ${T.successBdr}` }}>
                          <Check className="w-4 h-4" /> PO executed and resolved
                        </div>}
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center rounded-xl text-sm" style={{ ...card, color: T.muted }}>
                  No open cases. Click "Simulate" in the header to trigger an anomaly.
                </div>
              )}
            </div>
          )}
          {activeTab === "inventory" && (() => {
            /* ── derived filter options ── */
            const allCategories  = [...new Set(items.map(i => i.category).filter(Boolean))];
            const allLocations   = [...new Set(items.map(i => i.sub_location).filter(Boolean))] as string[];

            const filtered = items.filter(i => {
              const domainOk   = invDomainFilter   === "ALL" || i.domain        === invDomainFilter;
              const catOk      = invCategoryFilter === "ALL" || i.category      === invCategoryFilter;
              const locOk      = invLocationFilter === "ALL" || i.sub_location  === invLocationFilter;
              const searchOk   = !invSearch || i.name.toLowerCase().includes(invSearch.toLowerCase()) || i.sku.toLowerCase().includes(invSearch.toLowerCase());
              return domainOk && catOk && locOk && searchOk;
            });

            /* group by sub_location → campus_location */
            const grouped: Record<string, { campus: string; domain: string; items: Item[] }> = {};
            filtered.forEach(i => {
              const key = i.sub_location || "General Store";
              if (!grouped[key]) grouped[key] = { campus: i.campus_location || "Campus", domain: i.domain || "ACADEMIC", items: [] };
              grouped[key].items.push(i);
            });

            const domainColor: Record<string, string> = {
              ACADEMIC: "#D9A441", HOSTEL: "#9333EA", SPORTS: "#3A7D44",
              MEDICAL: "#E11D48", MESS: "#D97706", MAINT: "#2563EB", MAINTENANCE: "#2563EB",
            };
            const domainIcon: Record<string, string> = {
              ACADEMIC: "🎓", HOSTEL: "🏠", SPORTS: "⚽",
              MEDICAL: "🏥", MESS: "🍽️", MAINT: "🔧", MAINTENANCE: "🔧",
            };
            const categoryIcon: Record<string, string> = {
              Electronics: "💻", "Lab Equipment": "🔬", Stationery: "📄",
              Furniture: "🪑", Medicines: "💊", Consumables: "📦",
              "Raw Materials": "🌾", Utensils: "🍽️", Fuel: "⛽",
              Electrical: "⚡", Plumbing: "🔧", Tools: "🛠️", Paint: "🎨",
              Equipment: "🏋️",
            };

            const inp2: React.CSSProperties = {
              padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.elevated, fontSize: 13, color: T.text,
              outline: "none", width: "100%",
            };
            const pill = (active: boolean, color = T.amber): React.CSSProperties => ({
              padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: `1px solid ${active ? color : T.border}`,
              background: active ? color + "18" : T.surface,
              color: active ? color : T.muted, transition: "all 0.15s",
            });

            return (
              <section style={{ padding: "28px 32px", minHeight: "100vh", background: T.bg }}>

                {/* ── Header row ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Inventory Management</h1>
                    <p style={{ fontSize: 13, color: T.muted, margin: "2px 0 0" }}>
                      {filtered.length} items across {Object.keys(grouped).length} locations
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {/* Card / Table toggle */}
                    <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                      {(["card","table"] as const).map(v => (
                        <button key={v} onClick={() => setInvView(v)} style={{
                          padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: invView === v ? T.amber : T.surface,
                          color: invView === v ? "#fff" : T.muted, border: "none",
                        }}>{v === "card" ? "⊞ Cards" : "☰ Table"}</button>
                      ))}
                    </div>
                    <button onClick={() => setShowAddItem(s => !s)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: T.amber, color: "#fff", border: "none", cursor: "pointer",
                    }}>
                      <Plus size={15} /> Add Item
                    </button>
                  </div>
                </div>

                {/* ── Add Item Panel ── */}
                {showAddItem && (
                  <div style={{ ...card, padding: 24, marginBottom: 24, background: T.elevated, border: `1px solid ${T.amberBorder}` }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>➕ New Inventory Item</h3>
                    <form onSubmit={e => { e.preventDefault(); (document.getElementById("saveItemBtn") as HTMLButtonElement)?.click(); }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>ITEM NAME *</label>
                          <input required placeholder="e.g. HP LaserJet Toner" style={inp2} value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>SKU *</label>
                          <input required placeholder="e.g. TONER-HP-05" style={inp2} value={itemForm.sku} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>DOMAIN *</label>
                          <select required style={inp2} value={itemForm.domain} onChange={e => setItemForm({ ...itemForm, domain: e.target.value })}>
                            {["ACADEMIC","HOSTEL","SPORTS","MEDICAL","MESS","MAINT"].map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>CATEGORY *</label>
                          <input required placeholder="e.g. Electronics" style={inp2} value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>SUB-CATEGORY</label>
                          <input placeholder="e.g. GPU, Bed Frame" style={inp2} value={itemForm.sub_category} onChange={e => setItemForm({ ...itemForm, sub_category: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>UNIT</label>
                          <select style={inp2} value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}>
                            {["pcs","kg","L","box","strip","pair","set","bag","roll","m"].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>CAMPUS BUILDING</label>
                          <input placeholder="e.g. Science Block" style={inp2} value={itemForm.campus_location} onChange={e => setItemForm({ ...itemForm, campus_location: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>EXACT LOCATION *</label>
                          <input required placeholder="e.g. Computer Lab 401" style={inp2} value={itemForm.sub_location} onChange={e => setItemForm({ ...itemForm, sub_location: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>CURRENT STOCK *</label>
                          <input required type="number" min="0" style={inp2} value={itemForm.current_stock} onChange={e => setItemForm({ ...itemForm, current_stock: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>REORDER LEVEL *</label>
                          <input required type="number" min="0" style={inp2} value={itemForm.reorder_level} onChange={e => setItemForm({ ...itemForm, reorder_level: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 4 }}>UNIT PRICE (₹) *</label>
                          <input required type="number" min="0" style={inp2} value={itemForm.unit_price} onChange={e => setItemForm({ ...itemForm, unit_price: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                        <button id="saveItemBtn" type="button" onClick={async () => {
                          try {
                            const r = await fetch(`${API_BASE}/items`, {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: itemForm.name, sku: itemForm.sku,
                                domain: itemForm.domain, category: itemForm.category,
                                sub_category: itemForm.sub_category,
                                campus_location: itemForm.campus_location,
                                sub_location: itemForm.sub_location,
                                unit: itemForm.unit,
                                current_stock: parseInt(itemForm.current_stock),
                                reorder_level: parseInt(itemForm.reorder_level),
                                unit_price: parseFloat(itemForm.unit_price),
                              }),
                            });
                            if (!r.ok) throw new Error((await r.json()).detail || "Failed");
                            showToast("Item added successfully", "success");
                            setShowAddItem(false);
                            setItemForm({ name: "", sku: "", domain: "ACADEMIC", category: "Electronics", sub_category: "", campus_location: "Science Block", sub_location: "Computer Lab 401", unit: "pcs", current_stock: "10", reorder_level: "10", unit_price: "1000" });
                            await fetchSystemData();
                          } catch (err: any) { showToast(err.message, "error"); }
                        }} style={{ padding: "9px 24px", borderRadius: 8, background: T.amber, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          Save Item
                        </button>
                        <button type="button" onClick={() => setShowAddItem(false)} style={{ padding: "9px 20px", borderRadius: 8, background: T.surface, color: T.muted, border: `1px solid ${T.border}`, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ── Search bar ── */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ position: "relative", maxWidth: 340 }}>
                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.dim }} />
                    <input placeholder="Search items or SKU…" value={invSearch} onChange={e => setInvSearch(e.target.value)}
                      style={{ ...inp2, paddingLeft: 32, maxWidth: 340 }} />
                  </div>
                </div>

                {/* ── Domain filter pills ── */}
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, marginRight: 10, letterSpacing: "0.05em" }}>DOMAIN</span>
                  {["ALL","ACADEMIC","HOSTEL","SPORTS","MEDICAL","MESS","MAINT"].map(d => (
                    <button key={d} onClick={() => { setInvDomainFilter(d); setInvCategoryFilter("ALL"); setInvLocationFilter("ALL"); }}
                      style={{ ...pill(invDomainFilter === d, d === "ALL" ? T.amber : domainColor[d] ?? T.amber), marginRight: 6, marginBottom: 6 }}>
                      {d === "ALL" ? "All Domains" : domainIcon[d] + " " + d.charAt(0) + d.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* ── Category filter pills ── */}
                {allCategories.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, marginRight: 10, letterSpacing: "0.05em" }}>CATEGORY</span>
                    <button onClick={() => setInvCategoryFilter("ALL")} style={{ ...pill(invCategoryFilter === "ALL"), marginRight: 6, marginBottom: 6 }}>All</button>
                    {allCategories.map(c => (
                      <button key={c} onClick={() => setInvCategoryFilter(c)} style={{ ...pill(invCategoryFilter === c), marginRight: 6, marginBottom: 6 }}>
                        {categoryIcon[c] ?? "📦"} {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Location filter pills ── */}
                {allLocations.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, marginRight: 10, letterSpacing: "0.05em" }}>LOCATION</span>
                    <button onClick={() => setInvLocationFilter("ALL")} style={{ ...pill(invLocationFilter === "ALL"), marginRight: 6, marginBottom: 6 }}>All</button>
                    {allLocations.map(l => (
                      <button key={l} onClick={() => setInvLocationFilter(l)} style={{ ...pill(invLocationFilter === l), marginRight: 6, marginBottom: 6 }}>
                        📍 {l}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Summary strip ── */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                  {[
                    { label: "Total Items", val: filtered.length, color: T.amber },
                    { label: "Low Stock", val: filtered.filter(i => i.current_stock <= i.reorder_level && i.current_stock > 0).length, color: T.warn },
                    { label: "Out of Stock", val: filtered.filter(i => i.current_stock === 0).length, color: T.danger },
                    { label: "Healthy", val: filtered.filter(i => i.current_stock > i.reorder_level).length, color: T.success },
                    { label: "Total Value", val: "₹" + filtered.reduce((s, i) => s + i.current_stock * i.unit_price, 0).toLocaleString("en-IN"), color: T.amberDeep },
                  ].map(s => (
                    <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</span>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* ── CARD VIEW: grouped by sub_location ── */}
                {invView === "card" && (
                  <div>
                    {Object.keys(grouped).length === 0 && (
                      <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>No items match current filters.</div>
                    )}
                    {Object.entries(grouped).map(([subLoc, grp]) => {
                      const dColor = domainColor[grp.domain] ?? T.amber;
                      return (
                        <div key={subLoc} style={{ marginBottom: 28 }}>
                          {/* Location header */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 16px", background: T.ivory, borderRadius: 10, border: `1px solid ${T.border}` }}>
                            <MapPin size={15} style={{ color: dColor }} />
                            <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{subLoc}</span>
                            <span style={{ fontSize: 12, color: T.muted }}>·</span>
                            <span style={{ fontSize: 12, color: T.muted }}>{grp.campus}</span>
                            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: dColor, background: dColor + "18", border: `1px solid ${dColor}44`, borderRadius: 99, padding: "2px 10px" }}>
                              {domainIcon[grp.domain]} {grp.domain}
                            </span>
                            <span style={{ fontSize: 11, color: T.muted, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 99, padding: "2px 10px" }}>
                              {grp.items.length} item{grp.items.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Item cards */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                            {grp.items.map(item => {
                              const isOut  = item.current_stock === 0;
                              const isLow  = !isOut && item.current_stock <= item.reorder_level;
                              const isOk   = !isOut && !isLow;
                              const statusColor = isOut ? T.danger : isLow ? T.warn : T.success;
                              const statusBg    = isOut ? T.dangerBg : isLow ? T.warnBg : T.successBg;
                              const statusLabel = isOut ? "Out of Stock" : isLow ? "Low Stock" : "Healthy";
                              const statusIcon  = isOut ? "🔴" : isLow ? "⚠️" : "✅";
                              return (
                                <div key={item.id} style={{
                                  ...card, padding: 16, position: "relative",
                                  borderLeft: `3px solid ${statusColor}`,
                                  transition: "box-shadow 0.15s",
                                }}>
                                  {/* Category icon + sub_category */}
                                  <div style={{ fontSize: 22, marginBottom: 6 }}>{categoryIcon[item.category] ?? "📦"}</div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{item.name}</div>
                                  <div style={{ fontSize: 11, color: T.dim, marginBottom: 8, fontFamily: "monospace" }}>{item.sku}</div>

                                  {item.sub_category && (
                                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                                      <span style={{ fontWeight: 600 }}>Type:</span> {item.sub_category}
                                    </div>
                                  )}

                                  {/* Stock */}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>STOCK</span>
                                    <span style={{ fontSize: 15, fontWeight: 800, color: statusColor }}>{item.current_stock} <span style={{ fontSize: 11, fontWeight: 400 }}>{item.unit}</span></span>
                                  </div>

                                  {/* Reorder level bar */}
                                  <div style={{ height: 4, background: T.ivory, borderRadius: 99, marginBottom: 8, overflow: "hidden" }}>
                                    <div style={{
                                      height: "100%", borderRadius: 99,
                                      width: `${Math.min(100, item.reorder_level > 0 ? (item.current_stock / (item.reorder_level * 2)) * 100 : 100)}%`,
                                      background: statusColor,
                                      transition: "width 0.4s",
                                    }} />
                                  </div>

                                  {/* Price */}
                                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                                    ₹{item.unit_price.toLocaleString("en-IN")} / {item.unit}
                                  </div>

                                  {/* Status badge */}
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: statusBg, color: statusColor, border: `1px solid ${statusColor}44` }}>
                                    {statusIcon} {statusLabel}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── TABLE VIEW ── */}
                {invView === "table" && (
                  <div style={{ ...card, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: T.ivory }}>
                          {["Item","SKU","Domain","Category","Sub-Category","Location","Stock","Reorder","Unit Price","Status"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.04em", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item, idx) => {
                          const isOut = item.current_stock === 0;
                          const isLow = !isOut && item.current_stock <= item.reorder_level;
                          const statusColor = isOut ? T.danger : isLow ? T.warn : T.success;
                          const statusLabel = isOut ? "🔴 Out" : isLow ? "⚠️ Low" : "✅ OK";
                          const dColor = domainColor[item.domain ?? "ACADEMIC"] ?? T.amber;
                          return (
                            <tr key={item.id} style={{ background: idx % 2 === 0 ? T.surface : T.ivory, borderBottom: `1px solid ${T.border}` }}>
                              <td style={{ padding: "10px 14px", fontWeight: 600, color: T.text }}>{item.name}</td>
                              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: T.muted }}>{item.sku}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: dColor, background: dColor + "18", border: `1px solid ${dColor}44`, borderRadius: 99, padding: "2px 8px" }}>
                                  {item.domain}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", color: T.muted }}>{item.category}</td>
                              <td style={{ padding: "10px 14px", color: T.muted }}>{item.sub_category || "—"}</td>
                              <td style={{ padding: "10px 14px", color: T.muted, fontSize: 12 }}>
                                <div style={{ fontWeight: 600, color: T.text }}>{item.sub_location || "—"}</div>
                                <div style={{ fontSize: 11, color: T.dim }}>{item.campus_location || ""}</div>
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: statusColor }}>{item.current_stock} {item.unit}</td>
                              <td style={{ padding: "10px 14px", color: T.muted }}>{item.reorder_level}</td>
                              <td style={{ padding: "10px 14px", color: T.text }}>₹{item.unit_price.toLocaleString("en-IN")}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div style={{ textAlign: "center", padding: "40px", color: T.muted }}>No items match current filters.</div>
                    )}
                    
                  </div>
                )}

              </section>
            );
          })()}
         
          {/* ════════════════════════════ ASSETS ════════════════════════════ */}
          {activeTab === "assets" && (
            <div className="max-w-5xl space-y-5">
              <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Fixed Asset Register</h2>
              <form onSubmit={handleCreateAsset} className="p-5 grid md:grid-cols-4 gap-3" style={card}>
                <input required placeholder="Tag AST-001" style={inp} value={assetForm.asset_tag} onChange={e => setAssetForm({ ...assetForm, asset_tag: e.target.value })} />
                <input required placeholder="Name" style={inp} value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} />
                <input required placeholder="Category" style={inp} value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })} />
                <div className="flex gap-2">
                  <input required type="number" placeholder="Cost ₹" style={inp} value={assetForm.purchase_cost} onChange={e => setAssetForm({ ...assetForm, purchase_cost: e.target.value })} />
                  <button type="submit" style={{ ...amberBtn, padding: "0 1rem", whiteSpace: "nowrap" }}>Save</button>
                </div>
              </form>
              <form onSubmit={handleAssignAsset} className="p-5 grid md:grid-cols-2 gap-3" style={card}>
                <select required style={inp} value={assignForm.asset_id} onChange={e => setAssignForm({ ...assignForm, asset_id: e.target.value })}>
                  <option value="">Select asset</option>{assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} · {a.name}</option>)}
                </select>
                <select style={inp} value={assignForm.user_id} onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}>
                  <option value="">Assign to user</option>{userList.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                <select style={inp} value={assignForm.department_id} onChange={e => setAssignForm({ ...assignForm, department_id: e.target.value })}>
                  <option value="">Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button type="submit" style={{ ...ghostBtn, padding: "0.625rem", borderRadius: "0.625rem" }}>Assign asset</button>
              </form>
              <div style={{ ...card, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead><tr style={{ background: T.ivory }}>
                    {["Asset","Status","Custodian","Action"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div className="font-medium" style={{ color: T.text }}>{a.name}</div>
                          <div className="text-[10px]" style={{ color: T.muted, fontFamily: "ui-monospace, monospace" }}>{a.asset_tag}</div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ background: a.status === "AVAILABLE" ? T.successBg : T.warnBg, color: a.status === "AVAILABLE" ? T.success : T.amberDeep, border: `1px solid ${a.status === "AVAILABLE" ? T.successBdr : T.warnBdr}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>{a.status}</span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: T.muted, fontSize: "0.75rem" }}>{a.assigned_user || "—"} / {a.assigned_department || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {a.status === "ASSIGNED" && <button onClick={() => handleReturnAsset(a.id)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: T.amber }}><RotateCcw className="w-3 h-3" /> Return</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════ WAREHOUSES ════════════════════════════ */}
          {activeTab === "warehouses" && (
            <div className="max-w-5xl space-y-5">
              <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Warehouses & Storage</h2>
              <form onSubmit={handleCreateWarehouse} className="p-5 grid md:grid-cols-3 gap-3" style={card}>
                <input required placeholder="Warehouse name" style={inp} value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} />
                <input required placeholder="Location e.g. Block A Basement" style={inp} value={warehouseForm.location} onChange={e => setWarehouseForm({ ...warehouseForm, location: e.target.value })} />
                <button type="submit" style={{ ...amberBtn, padding: "0.625rem" }}>Add warehouse</button>
              </form>
              <div className="grid md:grid-cols-2 gap-3">
                {warehouses.map(w => (
                  <div key={w.id} style={{ ...card, padding: "1.25rem" }}>
                    <div className="font-semibold mb-1" style={{ color: T.text }}>{w.name}</div>
                    <div className="text-sm" style={{ color: T.muted }}>{w.location}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════ DISPATCH ════════════════════════════ */}
         {activeTab === "dispatch" && (
  <div className="max-w-xl space-y-5">
    <div>
      <h2 className="text-2xl font-semibold mb-1" style={{ color: T.text }}>
        Dispatch & Issue
      </h2>
      <p className="text-sm" style={{ color: T.muted }}>
        Smart Reorder Agent auto-triggers when stock hits reorder level.
      </p>
    </div>

    {/* Predictive Stockout Summary Strip */}
    {Object.keys(stockoutMap).length > 0 && (() => {
      const critical = items.filter(i =>
        stockoutMap[i.id] !== null &&
        stockoutMap[i.id] !== undefined &&
        (stockoutMap[i.id] as number) <= 7
      );
      if (critical.length === 0) return null;
      return (
        <div style={{
          padding: "14px 18px", borderRadius: 10,
          background: T.dangerBg, border: `1px solid ${T.dangerBdr}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: T.danger }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.danger }}>
              {critical.length} item{critical.length > 1 ? "s" : ""} will stock out within 7 days
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              {critical.map(i => `${i.name} (~${stockoutMap[i.id]}d)`).join(" · ")}
            </div>
          </div>
        </div>
      );
    })()}

    <form onSubmit={handleManualDispatch} className="p-6 space-y-4" style={card}>

      {/* Item Selector */}
      <div>
        <label style={{
          fontSize: 11, fontWeight: 700, color: T.muted,
          display: "block", marginBottom: 6, letterSpacing: "0.05em"
        }}>
          SELECT ITEM
        </label>
        <select required style={inp} value={dispatchForm.item_id}
          onChange={e => setDispatchForm({ ...dispatchForm, item_id: e.target.value })}>
          <option value="">Choose item to dispatch…</option>
          {items.map(i => {
            const days = stockoutMap[i.id];
            const isLow = i.current_stock <= i.reorder_level;
            const warn  = days !== null && days !== undefined && (days as number) <= 7;
            return (
              <option key={i.id} value={i.id}>
                {isLow ? "⚠ " : warn ? "🕐 " : "✓ "}
                {i.name} — stock: {i.current_stock} {i.unit}
                {days !== null && days !== undefined ? ` · ~${days}d stockout` : ""}
              </option>
            );
          })}
        </select>

        {/* Warning card when item selected */}
        {dispatchForm.item_id && (() => {
          const id = parseInt(dispatchForm.item_id);
          const it = items.find(x => x.id === id);
          const days = stockoutMap[id];
          if (!it) return null;
          const isOut  = it.current_stock === 0;
          const isLow  = it.current_stock <= it.reorder_level;
          const isCrit = days !== null && days !== undefined && (days as number) <= 7;

          if (!isOut && !isLow && !isCrit) return (
            <div style={{
              marginTop: 8, padding: "8px 12px", borderRadius: 8,
              background: T.successBg, border: `1px solid ${T.successBdr}`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: T.success }} />
              <span style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>
                Healthy stock — {it.current_stock} {it.unit} available
                {days !== null && days !== undefined ? ` · ~${days}d supply` : ""}
              </span>
            </div>
          );

          return (
            <div style={{
              marginTop: 8, padding: "12px 14px", borderRadius: 8,
              background: isOut ? T.dangerBg : T.warnBg,
              border: `1px solid ${isOut ? T.dangerBdr : T.warnBdr}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <AlertTriangle className="w-4 h-4"
                  style={{ color: isOut ? T.danger : T.warn }} />
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: isOut ? T.danger : T.amberDeep
                }}>
                  {isOut ? "Out of Stock" : "Low Stock — Reorder Needed"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                Current: <strong>{it.current_stock} {it.unit}</strong>
                {" "}· Reorder level: <strong>{it.reorder_level}</strong>
                {days !== null && days !== undefined
                  ? <> · <strong style={{ color: isOut ? T.danger : T.warn }}>
                      ~{days} days until stockout
                    </strong></>
                  : ""}
                <br />
                🤖 Smart Reorder Agent will auto-draft a PR after this dispatch.
              </div>
            </div>
          );
        })()}
      </div>

      {/* Department */}
      <div>
        <label style={{
          fontSize: 11, fontWeight: 700, color: T.muted,
          display: "block", marginBottom: 6, letterSpacing: "0.05em"
        }}>
          DEPARTMENT
        </label>
        <select required style={inp} value={dispatchForm.department_id}
          onChange={e => setDispatchForm({ ...dispatchForm, department_id: e.target.value })}>
          <option value="">Select department…</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label style={{
          fontSize: 11, fontWeight: 700, color: T.muted,
          display: "block", marginBottom: 6, letterSpacing: "0.05em"
        }}>
          QUANTITY
        </label>
        <input required type="number" min="1" placeholder="Enter quantity"
          style={inp} value={dispatchForm.quantity}
          onChange={e => setDispatchForm({ ...dispatchForm, quantity: e.target.value })} />
      </div>

      {/* Notes */}
      <div>
        <label style={{
          fontSize: 11, fontWeight: 700, color: T.muted,
          display: "block", marginBottom: 6, letterSpacing: "0.05em"
        }}>
          NOTES (optional)
        </label>
        <input placeholder="Reason for dispatch…" style={inp}
          value={dispatchForm.notes}
          onChange={e => setDispatchForm({ ...dispatchForm, notes: e.target.value })} />
      </div>

      <button type="submit" style={{
        ...amberBtn, width: "100%", padding: "0.875rem",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: "0.5rem",
      }}>
        <Send className="w-4 h-4" /> Issue Stock
      </button>
    </form>
  </div>
)}
          {/* ════════════════════════════ REQUISITIONS ════════════════════════════ */}
          {activeTab === "requisitions" && (
            <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} className="max-w-5xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Purchase Requisitions</h2>
                  <p className="text-sm mt-0.5" style={{ color: T.muted }}>{user?.role === "DEPT_HEAD" ? `Filtered to ${user.department_name}` : "All departments"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadPRs} style={{ ...ghostBtn, padding: "0.5rem" }}><RefreshCw className="w-4 h-4" /></button>
                  {(user?.role === "PROCUREMENT_OFFICER" || user?.role === "SUPER_ADMIN" || user?.role === "DEPT_HEAD" || user?.role === "STOREKEEPER") && (                    <button onClick={() => setPRModal(true)} style={{ ...amberBtn, padding: "0.5rem 1rem", display:"flex", alignItems:"center", gap:"0.375rem" }}>
                      <Plus className="w-4 h-4" /> New Requisition
                    </button>
                  )}
                </div>
              </div>
              <div style={{ ...card, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead><tr style={{ background: T.ivory }}>
                    {["PR #","Title","Department","Status","Est. Value","Actions"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {prs.length === 0
                      ? <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: T.muted }}>No requisitions yet. Create one — HOD will be notified by email.</td></tr>
                      : prs.map((pr, i) => (
                        <tr key={pr.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                          <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.amber, fontWeight: 600 }}>PR-{pr.id}</td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div className="font-medium" style={{ color: T.text }}>{pr.title}</div>
                            {pr.justification && <div className="text-xs truncate max-w-48" style={{ color: T.muted }}>{pr.justification}</div>}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: T.muted }}>{pr.department_name ?? `Dept #${pr.department_id}`}</td>
                          <td style={{ padding: "0.75rem 1rem" }}><PRStatusBadge status={pr.status} /></td>
                          <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.text }}>{pr.total_estimated ? fmt_inr(pr.total_estimated) : "—"}</td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div className="flex items-center gap-1.5">
                              {user?.role === "DEPT_HEAD" && (pr.status === "PENDING" || pr.status === "PENDING_APPROVAL") && <>
                                <button onClick={() => approvePR(pr)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: T.successBg, color: T.success, border: `1px solid ${T.successBdr}` }}><Check className="w-3 h-3" /> Approve</button>
                                <button onClick={() => rejectPR(pr)}  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: T.dangerBg, color: T.danger, border: `1px solid ${T.dangerBdr}` }}><X className="w-3 h-3" /> Reject</button>
                              </>}
                              {user?.role === "PROCUREMENT_OFFICER" && pr.status === "APPROVED" && (
                                <button onClick={() => openPOModal(pr)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: T.infoBg, color: T.info, border: `1px solid ${T.infoBdr}` }}><ShoppingCart className="w-3 h-3" /> Create PO</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Legacy quick requisition */}
              <details style={{ ...card, overflow: "hidden" }}>
                <summary className="px-5 py-4 text-sm font-medium cursor-pointer select-none" style={{ color: T.muted }}>▸ Legacy Quick Requisition (no approval routing)</summary>
                <form onSubmit={createOldRequisition} className="p-5 pt-0 grid md:grid-cols-2 gap-3">
                  <select required style={inp} value={reqForm.item_id} onChange={e => setReqForm({ ...reqForm, item_id: e.target.value })}><option value="">Item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  <select required style={inp} value={reqForm.department_id} onChange={e => setReqForm({ ...reqForm, department_id: e.target.value })}><option value="">Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                  <select style={inp} value={reqForm.vendor_id} onChange={e => setReqForm({ ...reqForm, vendor_id: e.target.value })}><option value="">Auto-select vendor</option>{preferredVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                  <input required type="number" min="1" placeholder="Qty" style={inp} value={reqForm.quantity} onChange={e => setReqForm({ ...reqForm, quantity: e.target.value })} />
                  <textarea required rows={2} placeholder="Justification" className="md:col-span-2" style={{ ...inp, resize: "none" }} value={reqForm.justification} onChange={e => setReqForm({ ...reqForm, justification: e.target.value })} />
                  <button type="submit" className="md:col-span-2" style={{ ...ghostBtn, padding: "0.75rem", borderRadius: "0.625rem" }}>Submit legacy requisition</button>
                </form>
              </details>
            </motion.div>
          )}

          {/* ════════════════════════════ ORDERS ════════════════════════════ */}
          {activeTab === "orders" && (
            <div className="max-w-5xl space-y-4">
              <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Purchase Orders</h2>
              {oldPOs.length === 0 && <div className="text-sm" style={{ color: T.muted }}>No POs yet.</div>}
              {oldPOs.map(po => (
                <div key={po.id} className="p-5 flex flex-wrap justify-between gap-3 items-center" style={card}>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: T.text }}>{po.po_number} <span style={{ color: T.muted }}>· {po.status}</span></div>
                    <div className="text-xs mt-1" style={{ color: T.muted }}>{po.item_name} · qty {po.quantity} · ₹{po.total_amount?.toLocaleString()}</div>
                    {po.vendor_name && <div className="text-xs mt-0.5" style={{ color: T.amber }}>{po.vendor_name}</div>}
                  </div>
                  <div className="flex gap-2 items-center">
                    {po.status === "PENDING_APPROVAL" && (user?.role === "PROCUREMENT_OFFICER" || user?.role === "SUPER_ADMIN") && (
  <button onClick={() => approvePO(po.id)} style={{ ...amberBtn, padding: "0.5rem 1rem" }}>Approve</button>
)}
                    {po.status === "APPROVED" && (user?.role === "PROCUREMENT_OFFICER" || user?.role === "SUPER_ADMIN") && <>
                      <input type="number" placeholder="Qty received" style={{ ...inp, width: "110px" }} value={receiveQty[po.id] || ""} onChange={e => setReceiveQty({ ...receiveQty, [po.id]: e.target.value })} />
                      <button onClick={() => receivePO(po.id)} style={{ ...ghostBtn, padding: "0.5rem 1rem", borderRadius: "0.625rem" }}>Receive goods</button>
                    </>}
                    {po.status === "RECEIVED" && <span className="text-sm font-medium flex items-center gap-1" style={{ color: T.success }}><Check className="w-4 h-4" /> Received</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════ BILLS ════════════════════════════ */}
          {activeTab === "bills" && (
            <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} className="max-w-5xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Bills & 3-Way Match</h2>
                  <p className="text-sm mt-0.5" style={{ color: T.muted }}>{user?.role === "FINANCE_OFFICER" ? "MATCHED bills show UPI Pay button." : "View invoice reconciliation."}</p>
                </div>
                <button onClick={loadNewBills} style={{ ...ghostBtn, padding: "0.5rem" }}><RefreshCw className="w-4 h-4" /></button>
              </div>
              <form onSubmit={submitBill} className="p-6 grid md:grid-cols-2 gap-3 max-w-2xl" style={card}>
                <select required style={inp} value={billForm.po_id} onChange={e => setBillForm({ ...billForm, po_id: e.target.value })}><option value="">Select PO</option>{oldPOs.map(p => <option key={p.id} value={p.id}>{p.po_number} · ₹{p.total_amount}</option>)}</select>
                <input required placeholder="Invoice / Bill #" style={inp} value={billForm.bill_number} onChange={e => setBillForm({ ...billForm, bill_number: e.target.value })} />
                <input required type="number" placeholder="Billed quantity" style={inp} value={billForm.billed_quantity} onChange={e => setBillForm({ ...billForm, billed_quantity: e.target.value })} />
                <input required type="number" step="0.01" placeholder="Billed amount ₹" style={inp} value={billForm.billed_amount} onChange={e => setBillForm({ ...billForm, billed_amount: e.target.value })} />
                <button type="submit" className="md:col-span-2" style={{ ...amberBtn, padding: "0.75rem" }}>Record invoice & run 3-way match</button>
              </form>
              {newBills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.muted }}>Recorded Invoices</div>
                  <div style={{ ...card, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                      <thead><tr style={{ background: T.ivory }}>
                        {["Bill #","PO #","Status","Amount","Payment"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {newBills.map((bill, i) => (
                          <tr key={bill.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                            <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.amber, fontWeight: 600 }}>BILL-{bill.id}</td>
                            <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.muted }}>PO-{bill.po_id}</td>
                            <td style={{ padding: "0.75rem 1rem" }}><PRStatusBadge status={bill.status} /></td>
                            <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.text }}>{bill.billed_amount ? fmt_inr(bill.billed_amount) : "—"}</td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <div className="flex items-center gap-2">
                                {user?.role === "FINANCE_OFFICER" && bill.status === "MATCHED" && !bill.payment_txn_id && (
                                  <button onClick={() => initiatePayment(bill)} disabled={payLoading === bill.id}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                    style={{ background: "linear-gradient(135deg,#5B21B6,#7C3AED)", boxShadow: "0 2px 8px rgba(91,33,182,0.3)" }}>
                                    {payLoading === bill.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <IndianRupee className="w-3 h-3" />}
                                    {payLoading === bill.id ? "Initiating…" : "Pay via PhonePe"}
                                  </button>
                                )}
                                {bill.payment_txn_id && (
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ background: bill.payment_state === "COMPLETED" ? T.successBg : T.infoBg, color: bill.payment_state === "COMPLETED" ? T.success : T.info, border: `1px solid ${bill.payment_state === "COMPLETED" ? T.successBdr : T.infoBdr}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>
                                      {bill.payment_state ?? "PENDING"}
                                    </span>
                                    {bill.payment_state !== "COMPLETED" && <button onClick={() => checkPayStatus(bill.payment_txn_id!)} style={{ color: T.muted }}><RefreshCw className="w-3 h-3" /></button>}
                                  </div>
                                )}
                                {bill.status === "MISMATCH" && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: T.danger }}><AlertTriangle className="w-3 h-3" /> Case opened · vendor emailed</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {oldBills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.muted }}>Legacy Bills</div>
                  {oldBills.map(b => (
                    <div key={b.id} className="p-4 flex justify-between mb-2" style={cardSm}>
                      <div><div className="font-medium text-sm" style={{ color: T.amber, fontFamily: "ui-monospace, monospace" }}>{b.bill_number}</div><div className="text-xs" style={{ color: T.muted }}>{b.vendor_name}</div></div>
                      <div className="font-semibold text-sm">{b.is_reconciled ? <span style={{ color: T.success }}>RECONCILED</span> : <span style={{ color: T.danger }}>MISMATCH</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════ VENDORS ════════════════════════════ */}
          {activeTab === "vendors" && (
            <div className="max-w-5xl space-y-5">
              <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Vendor Registry</h2>
              <form onSubmit={handleCreateVendor} className="p-5 grid md:grid-cols-4 gap-3" style={card}>
                <input required placeholder="Vendor name" style={inp} value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                <input required type="email" placeholder="Contact email" style={inp} value={vendorForm.contact_email} onChange={e => setVendorForm({ ...vendorForm, contact_email: e.target.value })} />
                <input required type="number" placeholder="Lead days" style={inp} value={vendorForm.avg_lead_time_days} onChange={e => setVendorForm({ ...vendorForm, avg_lead_time_days: e.target.value })} />
                <button type="submit" style={{ ...amberBtn, padding: "0.625rem" }}>Add vendor</button>
              </form>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {preferredVendors.map(v => (
                  <motion.div key={v.id} whileHover={{ y: -2 }} style={{ ...card, padding: "1.25rem" }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-semibold" style={{ color: T.text }}>{v.name}</div>
                      {v.preferred && <span style={{ background: T.amberLight, color: T.amberDeep, border: `1px solid ${T.amberBorder}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>PREFERRED</span>}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span style={{ color: T.muted }}>Email</span><span style={{ color: T.text, fontSize: "0.75rem" }}>{v.contact_email ?? "—"}</span></div>
                      {v.phone && <div className="flex justify-between"><span style={{ color: T.muted }}>Phone</span><span style={{ color: T.text }}>{v.phone}</span></div>}
                      <div className="flex justify-between"><span style={{ color: T.muted }}>Lead time</span><span style={{ color: T.text }}>{v.avg_lead_time_days}d</span></div>
                      <div className="flex justify-between"><span style={{ color: T.muted }}>On-time</span><span style={{ color: v.on_time_delivery_rate >= 0.9 ? T.success : T.danger, fontWeight: 600 }}>{Math.round(v.on_time_delivery_rate * 100)}%</span></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════ USERS ════════════════════════════ */}
          {activeTab === "users" && (
            <div className="max-w-5xl">
              <div className="flex justify-between mb-5">
                <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Users</h2>
                <button onClick={() => setView("register")} style={{ ...amberBtn, padding: "0.5rem 1.25rem" }}>Add user</button>
              </div>
              <div style={{ ...card, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead><tr style={{ background: T.ivory }}>{["Name","Username","Role","Department"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {userList.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: T.text }}>{u.full_name}</td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.muted }}>{u.username}</td>
                        <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: T.amberLight, color: T.amberDeep, border: `1px solid ${T.amberBorder}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>{u.role}</span></td>
                        <td style={{ padding: "0.75rem 1rem", color: T.muted }}>{(u as any).department_name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════ AUDIT ════════════════════════════ */}
          {activeTab === "audit" && (
            <div className="max-w-5xl space-y-4">
              <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Audit Log</h2>
              <div style={{ ...card, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead><tr style={{ background: T.ivory }}>{["Time","Actor","Action","Entity","Details"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {auditLogs.length === 0
                      ? <tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: T.muted }}>No audit entries yet.</td></tr>
                      : auditLogs.map((a, i) => (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                          <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.muted, fontSize: "0.75rem" }}>{a.timestamp ? fmt_time(a.timestamp) : "—"}</td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: T.text }}>{a.actor}</td>
                          <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: T.amberLight, color: T.amberDeep, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>{a.action}</span></td>
                          <td style={{ padding: "0.75rem 1rem", fontFamily: "ui-monospace, monospace", color: T.muted, fontSize: "0.75rem" }}>{a.entity_type}#{a.entity_id}</td>
                          <td style={{ padding: "0.75rem 1rem", color: T.muted, fontSize: "0.75rem", maxWidth: "200px" }}>{a.details}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ════════════════════════════ HISTORY ════════════════════════════ */}
          {activeTab === "history" && (
            <div className="max-w-6xl">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Transaction History</h2>
                  <p className="text-sm mt-0.5" style={{ color: T.muted }}>{filteredTx.length} of {txList.length} records</p>
                </div>
                <button onClick={() => { setTxSearch(""); setTxType(""); setTxDateFrom(""); setTxDateTo(""); }}
                  style={{ ...ghostBtn, padding:"0.4rem 0.875rem", fontSize:"0.8rem" }}>Clear filters</button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:"0.75rem", marginBottom:"1.25rem" }}>
                <input placeholder="🔍 Search by item, department, notes..."
                  value={txSearch} onChange={e => setTxSearch(e.target.value)}
                  style={{ ...inp, fontSize:"0.875rem" }} />
                <select value={txType} onChange={e => setTxType(e.target.value)} style={{ ...inp, minWidth:"150px" }}>
                  <option value="">All Types</option>
                  <option value="ISSUE">ISSUE</option>
                  <option value="PURCHASE_RECEIVE">PURCHASE_RECEIVE</option>
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>
                <input type="date" value={txDateFrom} onChange={e => setTxDateFrom(e.target.value)}
                  style={{ ...inp, minWidth:"140px" }} title="From date" />
                <input type="date" value={txDateTo} onChange={e => setTxDateTo(e.target.value)}
                  style={{ ...inp, minWidth:"140px" }} title="To date" />
              </div>

              <div style={{ ...card, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8125rem" }}>
                  <thead>
                    <tr style={{ background: T.ivory }}>
                      {["#","When","Type","Item","Department","Qty","Unit Price","Total Value","Notes"].map(h => (
                        <th key={h} style={{ padding:"0.75rem 1rem", textAlign:"left", fontWeight:600, fontSize:"0.6875rem", textTransform:"uppercase", letterSpacing:"0.05em", color:T.muted, borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.length === 0 && (
                      <tr><td colSpan={9} style={{ padding:"3rem", textAlign:"center", color:T.muted }}>No transactions match your filters.</td></tr>
                    )}
                    {filteredTx.map((t: any, i: number) => {
                      const tc = txColor(t.type);
                      const isIssue = t.type === "ISSUE";
                      return (
                        <tr key={t.id} style={{ borderBottom:`1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.ivory }}>
                          <td style={{ padding:"0.75rem 1rem", fontFamily:"ui-monospace, monospace", color:T.dim, fontSize:"0.72rem" }}>#{t.id}</td>
                          <td style={{ padding:"0.75rem 1rem", fontFamily:"ui-monospace, monospace", color:T.muted, fontSize:"0.75rem", whiteSpace:"nowrap" }}>{fmt_time(t.timestamp)}</td>
                          <td style={{ padding:"0.75rem 1rem" }}>
                            <span style={{ padding:"2px 8px", borderRadius:"99px", fontSize:"0.6875rem", fontWeight:600, background:tc.bg, color:tc.text, border:`1px solid ${tc.bdr}`, whiteSpace:"nowrap" }}>{t.type}</span>
                          </td>
                          <td style={{ padding:"0.75rem 1rem", fontWeight:600, color:T.text }}>{t.item_name ?? `Item #${t.item_id}`}</td>
                          <td style={{ padding:"0.75rem 1rem", color:T.muted, fontSize:"0.78rem" }}>{t.department_name ?? "—"}</td>
                          <td style={{ padding:"0.75rem 1rem", fontFamily:"ui-monospace, monospace", textAlign:"right", color: isIssue ? T.danger : T.success, fontWeight:600 }}>
                            {isIssue ? "−" : "+"}{t.quantity}
                          </td>
                          <td style={{ padding:"0.75rem 1rem", fontFamily:"ui-monospace, monospace", textAlign:"right", color:T.muted, fontSize:"0.78rem" }}>
                            {t.unit_price ? `₹${Number(t.unit_price).toLocaleString()}` : "—"}
                          </td>
                          <td style={{ padding:"0.75rem 1rem", fontFamily:"ui-monospace, monospace", textAlign:"right", color:T.amber, fontWeight:600 }}>
                            ₹{t.total_value?.toLocaleString()}
                          </td>
                          <td style={{ padding:"0.75rem 1rem", color:T.muted, fontSize:"0.75rem", maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {t.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginTop:"1rem" }}>
                {[
                  { label:"Total Transactions", val: txList.length,                                                          color: T.info },
                  { label:"Issues (Out)",        val: txList.filter((t:any) => t.type === "ISSUE").length,                   color: T.danger },
                  { label:"Receipts (In)",       val: txList.filter((t:any) => t.type === "PURCHASE_RECEIVE").length,        color: T.success },
                  { label:"Total Value Moved",   val: `₹${txList.reduce((s:number,t:any) => s + (t.total_value||0), 0).toLocaleString()}`, color: T.amber },
                ].map(s => (
                  <div key={s.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"0.5rem", padding:"0.75rem 1rem" }}>
                    <div style={{ fontSize:"1.05rem", fontWeight:700, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:"0.72rem", color:T.muted, marginTop:"0.2rem" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ════════════════════════════ ANALYTICS ════════════════════════════ */}
          {activeTab === "analytics" && (
            <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} className="max-w-5xl space-y-6">
              <h2 className="text-2xl font-semibold" style={{ color: T.text }}>Analytics</h2>
              {domainCards.length > 0 && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div style={{ ...card, padding: "1.5rem" }}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: T.text }}>Stock Distribution by Domain</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={domainCards.map(c => ({ name: DOMAIN_CFG.find(d => d.key === c.domain)?.label ?? c.domain, value: c.total_value, color: DOMAIN_CFG.find(d => d.key === c.domain)?.color ?? T.amber }))}
                          cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, percent }) => percent && percent > 0.03 ? `${name} ${((percent ?? 0)*100).toFixed(0)}%` : ""}
                          labelLine={{ stroke: T.muted }}>
                          {domainCards.map((_, i) => <Cell key={i} fill={DOMAIN_CFG[i]?.color ?? T.amber} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} formatter={(v: any) => [fmt_inr(v), "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ ...card, padding: "1.5rem" }}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: T.text }}>Low-Stock SKUs by Domain</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={domainCards.map(c => ({ name: DOMAIN_CFG.find(d => d.key === c.domain)?.label ?? c.domain, Total: c.total_items, Low: c.low_stock }))}>
                        <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
                        <Bar dataKey="Total" fill={T.amberBorder} radius={[3,3,0,0]} />
                        <Bar dataKey="Low"   fill={T.danger}       radius={[3,3,0,0]} />
                        <Legend wrapperStyle={{ color: T.muted, fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {analytics?.departments && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.muted }}>Department Budget Utilisation</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {analytics.departments.map((d: any, i: number) => (
                      <div key={i} style={{ ...card, padding: "1.25rem" }}>
                        <div className="flex justify-between text-sm mb-3">
                          <span className="font-semibold" style={{ color: T.text }}>{d.name}</span>
                          <span style={{ color: T.amber, fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>₹{Number(d.remaining).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.ivory }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100,(Number(d.used)/Math.max(1,Number(d.total)))*100)}%`, background: `linear-gradient(90deg,${T.amber},${T.amberDeep})` }} />
                        </div>
                        <div className="text-xs mt-2" style={{ color: T.muted }}>Used ₹{Number(d.used).toLocaleString()} / ₹{Number(d.total).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </div>

      {/* ══════════════ MODAL — New PR ══════════════ */}
      <AnimatePresence>
        {prModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(37,37,37,0.5)", backdropFilter: "blur(4px)" }}
            onClick={e => e.target === e.currentTarget && setPRModal(false)}>
            <motion.div initial={{ scale:0.95,y:16 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95,y:16 }}
              style={{ ...card, width:"100%", maxWidth:"560px", padding:"1.75rem", position:"relative" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: T.text }}>New Purchase Requisition</h2>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>HOD will be notified by email</p>
                </div>
                <button onClick={() => setPRModal(false)} style={{ color: T.muted, background: T.ivory, border: `1px solid ${T.border}`, borderRadius: "0.5rem", padding: "0.375rem" }}><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <input value={prForm.title} onChange={e => setPRForm(p=>({...p,title:e.target.value}))} placeholder="Title *" style={inp} />
                <select value={prForm.department_id} onChange={e => setPRForm(p=>({...p,department_id:e.target.value}))} style={inp}>
                  <option value="">Select department *</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <textarea value={prForm.justification} onChange={e => setPRForm(p=>({...p,justification:e.target.value}))} rows={2} placeholder="Justification" style={{ ...inp, resize: "none" }} />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Line Items *</span>
                    <button onClick={() => setPRForm(p=>({...p,items:[...p.items,{item_id:"",quantity:"",unit_price:""}]}))} style={{ color: T.amber, fontSize:"0.75rem", fontWeight:600 }}>+ Add item</button>
                  </div>
                  {prForm.items.map((it,idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <select value={it.item_id} onChange={e=>{
                        const rows=[...prForm.items]; const found=items.find(i=>i.id===parseInt(e.target.value));
                        rows[idx]={...rows[idx],item_id:e.target.value,unit_price:found?.unit_price?.toString()??""};
                        setPRForm(p=>({...p,items:rows}));
                      }} style={{ ...inp, flex:1, minWidth:0 }}><option value="">Item…</option>{items.map(i=><option key={i.id} value={i.id}>[{i.domain??"ACAD"}] {i.name}</option>)}</select>
                      <input value={it.quantity} onChange={e=>{const rows=[...prForm.items];rows[idx].quantity=e.target.value;setPRForm(p=>({...p,items:rows}));}} placeholder="Qty" type="number" style={{ ...inp, width:"70px" }} />
                      <input value={it.unit_price} onChange={e=>{const rows=[...prForm.items];rows[idx].unit_price=e.target.value;setPRForm(p=>({...p,items:rows}));}} placeholder="₹" type="number" style={{ ...inp, width:"80px" }} />
                      {prForm.items.length>1 && <button onClick={()=>setPRForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))} style={{ color:T.danger }}><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
                {prForm.items.some(i=>i.quantity&&i.unit_price) && (
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: T.amberLight, border: `1px solid ${T.amberBorder}` }}>
                    <span className="text-sm" style={{ color: T.muted }}>Estimated total</span>
                    <span className="font-bold text-sm" style={{ color: T.amberDeep }}>{fmt_inr(prForm.items.reduce((s,i)=>s+(parseFloat(i.quantity||"0")*parseFloat(i.unit_price||"0")),0))}</span>
                  </div>
                )}
                <button onClick={submitPR} style={{ ...amberBtn, width:"100%", padding:"0.75rem" }}>Submit Requisition</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ MODAL — Create PO ══════════════ */}
      <AnimatePresence>
        {poModal && activePR && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(37,37,37,0.5)", backdropFilter: "blur(4px)" }}
            onClick={e => e.target === e.currentTarget && setPOModal(false)}>
            <motion.div initial={{ scale:0.95,y:16 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95,y:16 }}
              style={{ ...card, width:"100%", maxWidth:"420px", padding:"1.75rem" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: T.text }}>Create Purchase Order</h2>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>From PR-{activePR.id}: {activePR.title}</p>
                </div>
                <button onClick={()=>{setPOModal(false);setActivePR(null);}} style={{ color:T.muted, background:T.ivory, border:`1px solid ${T.border}`, borderRadius:"0.5rem", padding:"0.375rem" }}><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                            {/* ── Duplicate Warning ── */}
            {dupWarning && (
              <div style={{ background:T.dangerBg, border:`1px solid ${T.dangerBdr}`, borderRadius:"0.625rem", padding:"0.875rem 1rem", marginBottom:"1rem", display:"flex", gap:"0.75rem", alignItems:"flex-start" }}>
                <span style={{ fontSize:"1.5rem" }}>⚠️</span>
                <div>
                  <div style={{ fontWeight:700, color:T.danger, fontSize:"0.9rem" }}>Duplicate PO Detected</div>
                  <div style={{ color:T.danger, fontSize:"0.8rem", marginTop:"0.2rem" }}>
                    A PO already exists for this PR — <strong>{dupWarning.po_number}</strong> (Status: {dupWarning.status}).
                    Creating another will result in double ordering. Proceed only if the previous PO was cancelled verbally.
                  </div>
                </div>
              </div>
            )}

            {/* ── Smart Vendor Recommendations ── */}
            <div style={{ marginBottom:"1rem" }}>
              <div style={{ fontSize:"0.8rem", fontWeight:700, color:T.text, marginBottom:"0.5rem", display:"flex", alignItems:"center", gap:"0.375rem" }}>
                🤖 Smart Vendor Selection
                <span style={{ fontSize:"0.72rem", fontWeight:400, color:T.muted }}>(ranked by delivery rate)</span>
              </div>
              {vendorRecsLoading && (
                <div style={{ color:T.muted, fontSize:"0.8rem", padding:"0.5rem 0" }}>⏳ Loading vendor recommendations...</div>
              )}
              {!vendorRecsLoading && vendorRecs.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem" }}>
                  {vendorRecs.slice(0, 3).map((v: any, idx: number) => (
                    <div
                      key={v.id}
                      onClick={() => setPOForm((f: any) => ({ ...f, vendor_id: String(v.id) }))}
                      style={{
                        border: `1px solid ${poForm.vendor_id === String(v.id) ? T.amber : T.border}`,
                        background: poForm.vendor_id === String(v.id) ? T.amberLight : T.ivory,
                        borderRadius:"0.5rem", padding:"0.625rem 0.875rem",
                        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between"
                      }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                        <span style={{ fontSize:"0.75rem", fontWeight:700, color:T.muted, width:"1rem" }}>{idx + 1}</span>
                        <div>
                          <div style={{ fontSize:"0.85rem", fontWeight:600, color:T.text }}>{v.name}</div>
                          <div style={{ fontSize:"0.72rem", color:T.muted }}>{v.category ?? "General Supplier"}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"0.78rem", fontWeight:700, color:T.success }}>
                          {((v.on_time_delivery_rate ?? 0) * 100).toFixed(0)}% on-time
                        </div>
                        <div style={{ fontSize:"0.7rem", color:T.muted }}>
                          {v.total_orders ?? 0} orders
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!vendorRecsLoading && vendorRecs.length === 0 && (
                <div style={{ color:T.muted, fontSize:"0.8rem" }}>No vendor data available yet.</div>
              )}
            </div>
                <select value={poForm.vendor_id} onChange={e=>setPOForm(p=>({...p,vendor_id:e.target.value}))} style={inp}>
                  <option value="">Select vendor *</option>{preferredVendors.map(v=><option key={v.id} value={v.id}>{v.name} — {v.avg_lead_time_days}d · {Math.round(v.on_time_delivery_rate*100)}% OTD</option>)}
                </select>
                <input type="date" value={poForm.expected_delivery} onChange={e=>setPOForm(p=>({...p,expected_delivery:e.target.value}))} style={inp} />
                <button onClick={createPOFromPR} style={{ ...amberBtn, width:"100%", padding:"0.75rem", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
                  <ShoppingCart className="w-4 h-4" /> Issue Purchase Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            {/* ═══════════════ BURN RATE APPROVAL MODAL ═══════════════ */}
      {burnModal && burnPR && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:"#fff", borderRadius:"1rem", width:"100%", maxWidth:"640px", maxHeight:"90vh", overflowY:"auto", padding:"2rem", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
              <div>
                <h2 style={{ fontSize:"1.25rem", fontWeight:700, color:T.text, margin:0 }}>Budget Burn Rate Check</h2>
                <p style={{ color:T.muted, fontSize:"0.85rem", marginTop:"0.25rem" }}>PR-{burnPR.id}: {burnPR.title}</p>
              </div>
              <button onClick={() => { setBurnModal(false); setBurnData(null); setBurnPR(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:"1.75rem", lineHeight:1, padding:"0 0.25rem" }}>×</button>
            </div>

            {/* Loading */}
            {burnLoading && (
              <div style={{ textAlign:"center", padding:"3rem 1rem", color:T.muted, fontSize:"0.95rem" }}>
                ⏳ Fetching budget burn rate...
              </div>
            )}

            {/* Error */}
            {burnErr && !burnLoading && (
              <div style={{ background:T.dangerBg, border:`1px solid ${T.dangerBdr}`, borderRadius:"0.5rem", padding:"1rem 1.25rem", color:T.danger, marginBottom:"1rem" }}>
                ⚠ {burnErr}
              </div>
            )}

            {/* Main Data */}
            {burnData && !burnLoading && (() => {
              const wl: string = burnData.warning_level ?? "LOW";
              const wCfg: Record<string, { bg:string; bdr:string; color:string; icon:string; label:string }> = {
                LOW:      { bg:T.successBg, bdr:T.successBdr, color:T.success, icon:"✅", label:"Budget Healthy" },
                MEDIUM:   { bg:T.warnBg,    bdr:T.warnBdr,    color:T.warn,    icon:"⚠️", label:"Budget Warning" },
                HIGH:     { bg:T.dangerBg,  bdr:T.dangerBdr,  color:T.danger,  icon:"🚨", label:"Budget Critical" },
                CRITICAL: { bg:T.dangerBg,  bdr:T.dangerBdr,  color:T.danger,  icon:"🔴", label:"CRITICALLY LOW" },
              };
              const wc = wCfg[wl] ?? wCfg.LOW;
              const pct: number = Math.min(burnData.utilisation_pct ?? 0, 100);
              const barColor = pct >= 90 ? T.danger : pct >= 70 ? T.warn : T.success;

              return (
                <>
                  {/* Warning Card */}
                  <div style={{ background:wc.bg, border:`1px solid ${wc.bdr}`, borderRadius:"0.75rem", padding:"1rem 1.25rem", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:"0.75rem" }}>
                    <span style={{ fontSize:"1.75rem" }}>{wc.icon}</span>
                    <div>
                      <div style={{ fontWeight:700, color:wc.color, fontSize:"0.95rem" }}>{wc.label}</div>
                      <div style={{ color:wc.color, fontSize:"0.82rem", marginTop:"0.2rem" }}>
                        {burnData.days_until_exhausted != null
                          ? `At current burn rate, budget exhausted in ~${burnData.days_until_exhausted} days`
                          : "Insufficient transaction history to project exhaustion date"}
                      </div>
                    </div>
                  </div>

                  {/* Budget Stats */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem", marginBottom:"1.25rem" }}>
                    {[
                      { label:"Total Budget",  val:`₹${(burnData.budget_total ?? 0).toLocaleString()}` },
                      { label:"Used",          val:`₹${(burnData.budget_used ?? 0).toLocaleString()}` },
                      { label:"Remaining",     val:`₹${(burnData.budget_remaining ?? 0).toLocaleString()}` },
                    ].map(s => (
                      <div key={s.label} style={{ background:T.ivory, border:`1px solid ${T.border}`, borderRadius:"0.5rem", padding:"0.75rem 1rem", textAlign:"center" }}>
                        <div style={{ fontSize:"1.05rem", fontWeight:700, color:T.text }}>{s.val}</div>
                        <div style={{ fontSize:"0.72rem", color:T.muted, marginTop:"0.2rem" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Utilisation Bar */}
                  <div style={{ marginBottom:"1.25rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.4rem" }}>
                      <span style={{ fontSize:"0.8rem", color:T.muted }}>Budget Utilisation</span>
                      <span style={{ fontSize:"0.8rem", fontWeight:700, color:T.text }}>{(burnData.utilisation_pct ?? 0).toFixed(1)}%</span>
                    </div>
                    <div style={{ background:T.border, borderRadius:"999px", height:"9px" }}>
                      <div style={{ width:`${pct}%`, height:"100%", borderRadius:"999px", background:barColor, transition:"width 0.4s ease" }} />
                    </div>
                  </div>

                  {/* Weekly Spend Chart */}
                  {burnData.weekly_spend?.length > 0 && (
                    <div style={{ marginBottom:"1.25rem" }}>
                      <div style={{ fontSize:"0.85rem", fontWeight:600, color:T.text, marginBottom:"0.75rem" }}>Weekly Spend — Last 8 Weeks</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={burnData.weekly_spend} margin={{ top:4, right:8, left:0, bottom:4 }}>
                          <XAxis dataKey="week" tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false}
                            tickFormatter={(v: number) => `₹${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
                          <Tooltip
                            formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Spent"]}
                            contentStyle={{ fontSize:"0.78rem", borderRadius:"0.5rem", border:`1px solid ${T.border}` }} />
                          <Bar dataKey="spent" fill={T.amber} radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Daily / Weekly Burn */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"1.5rem" }}>
                    <div style={{ background:T.ivory, border:`1px solid ${T.border}`, borderRadius:"0.5rem", padding:"0.75rem 1rem" }}>
                      <div style={{ fontSize:"0.72rem", color:T.muted }}>Daily Burn Rate</div>
                      <div style={{ fontSize:"1rem", fontWeight:700, color:T.text, marginTop:"0.2rem" }}>
                        ₹{(burnData.daily_burn ?? 0).toFixed(0)}/day
                      </div>
                    </div>
                    <div style={{ background:T.ivory, border:`1px solid ${T.border}`, borderRadius:"0.5rem", padding:"0.75rem 1rem" }}>
                      <div style={{ fontSize:"0.72rem", color:T.muted }}>Avg Weekly Burn</div>
                      <div style={{ fontSize:"1rem", fontWeight:700, color:T.text, marginTop:"0.2rem" }}>
                        ₹{(burnData.avg_weekly_burn ?? 0).toFixed(0)}/week
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Action Buttons */}
            <div style={{ display:"flex", gap:"0.75rem", justifyContent:"flex-end", borderTop:`1px solid ${T.border}`, paddingTop:"1.25rem" }}>
              <button
                onClick={() => { setBurnModal(false); setBurnData(null); setBurnPR(null); }}
                style={{ padding:"0.6rem 1.25rem", borderRadius:"0.5rem", border:`1px solid ${T.border}`, background:T.ivory, color:T.text, fontWeight:600, cursor:"pointer", fontSize:"0.875rem" }}>
                Cancel
              </button>
              <button
                onClick={() => doApprovePR(burnPR!)}
                style={{ padding:"0.6rem 1.5rem", borderRadius:"0.5rem", border:"none", background:T.success, color:"#fff", fontWeight:700, cursor:"pointer", fontSize:"0.875rem" }}>
                ✓ Approve Anyway
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label:string; value:number; color:string }) {
  return (
    <span style={{
      fontSize:10, fontWeight:700, borderRadius:99,
      padding:"2px 8px",
      background: color + "18", color,
      border: `1px solid ${color}44`,
    }}>
      {value} {label}
    </span>
  );
}

/* ─── Sidebar atoms ─── */
function SidebarSection({ label }: { label: string }) {
  return <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A49E95", padding: "1.125rem 0.75rem 0.375rem", fontWeight: 700 }}>{label}</div>;
}
function NavBtn({ active, onClick, Icon, label, badge }: { active: boolean; onClick: () => void; Icon: any; label: string; badge?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
        background: active ? "#FDF3DC" : "transparent",
        color: active ? "#B8862B" : "#77736B",
        border: active ? "1px solid #F0D9A0" : "1px solid transparent",
        fontWeight: active ? 600 : 400, fontSize: "0.8125rem",
        cursor: "pointer", transition: "all 0.12s",
        borderLeft: active ? "2px solid #D9A441" : "2px solid transparent",
      }}>
      <span style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <Icon style={{ width: "0.875rem", height: "0.875rem", color: active ? "#D9A441" : "#A49E95", flexShrink: 0 }} />
        {label}
      </span>
      {badge && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C0392B", flexShrink: 0 }} />}
    </button>
  );
}

/* ─── Status badge ─── */
function PRStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; bdr: string }> = {
    DRAFT:          { bg: "#F3EFE7", color: "#77736B", bdr: "#E9E3D8" },
    PENDING:        { bg: "#EFF6FF", color: "#2563EB", bdr: "#BFDBFE" },
    APPROVED:       { bg: "#EBF5EE", color: "#3A7D44", bdr: "#A3CFAA" },
    REJECTED:       { bg: "#FBEAEA", color: "#C0392B", bdr: "#E8A5A0" },
    ORDERED:        { bg: "#F5F3FF", color: "#7C3AED", bdr: "#C4B5FD" },
    RECEIVED:       { bg: "#EBF5EE", color: "#3A7D44", bdr: "#A3CFAA" },
    MATCHED:        { bg: "#EBF5EE", color: "#3A7D44", bdr: "#A3CFAA" },
    MISMATCH:       { bg: "#FBEAEA", color: "#C0392B", bdr: "#E8A5A0" },
    PAID:           { bg: "#EBF5EE", color: "#3A7D44", bdr: "#A3CFAA" },
    PAYMENT_FAILED: { bg: "#FBEAEA", color: "#C0392B", bdr: "#E8A5A0" },
  };
  const c = cfg[status] ?? { bg: "#F3EFE7", color: "#77736B", bdr: "#E9E3D8" };
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.bdr}`, padding: "2px 8px", borderRadius: "99px", fontSize: "0.6875rem", fontWeight: 600 }}>{status}</span>;
}

/* ─── Location tree ─── */
function LocationTreeNode({ node, selectedId, onSelect, depth }: { node: LocationNode; selectedId?: number; onSelect: (n: LocationNode) => void; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children?.length > 0;
  const isSelected  = selectedId === node.id;
  return (
    <div>
      <div onClick={() => { onSelect(node); if (hasChildren) setOpen(!open); }}
        style={{ display:"flex", alignItems:"center", gap:"0.25rem", padding:`0.375rem 0.5rem`, paddingLeft:`${8+depth*12}px`, borderRadius:"0.5rem", cursor:"pointer", background:isSelected?"#FDF3DC":"transparent", color:isSelected?"#B8862B":"#77736B", border:isSelected?"1px solid #F0D9A0":"1px solid transparent", fontSize:"0.8125rem", fontWeight:isSelected?600:400, transition:"all 0.12s" }}>
        {hasChildren ? <ChevronRight style={{ width:"0.75rem", height:"0.75rem", flexShrink:0, transform:open?"rotate(90deg)":"none", transition:"transform 0.15s" }} /> : <span style={{ width:"0.75rem", flexShrink:0 }} />}
        <Layers style={{ width:"0.75rem", height:"0.75rem", flexShrink:0, color:isSelected?"#D9A441":"#A49E95" }} />
        <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{node.name}</span>
      </div>
      {open && hasChildren && node.children.map(child => <LocationTreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth+1} />)}
    </div>
  );
}