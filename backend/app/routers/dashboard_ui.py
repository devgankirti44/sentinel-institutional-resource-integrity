from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Command Dashboard"])

HTML_CONTENT = """
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sentinel — Executive Resource Integrity Command</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">

    <!-- TOP HEADER -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                    <i data-lucide="shield-alert" class="w-6 h-6"></i>
                </div>
                <div>
                    <h1 class="font-bold text-lg tracking-wide text-white">SENTINEL</h1>
                    <p class="text-xs text-slate-400">Institutional Resource Integrity System</p>
                </div>
            </div>
            
            <div class="flex items-center gap-4">
                <button onclick="injectHeroIncident()" class="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-rose-950/50 animate-pulse">
                    <i data-lucide="zap" class="w-4 h-4"></i>
                    INJECT CS VELOCITY SHOCK
                </button>
                <div class="h-4 w-px bg-slate-800"></div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                    SYSTEM ONLINE
                </span>
            </div>
        </div>
    </header>

    <!-- MAIN BODY -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">

        <!-- KPI METRICS -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div class="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                <div class="flex items-center justify-between text-slate-400 mb-2">
                    <span class="text-xs font-medium uppercase tracking-wider">Active Cases</span>
                    <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>
                </div>
                <div id="metric-cases" class="text-2xl font-bold text-white">0</div>
            </div>

            <div class="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                <div class="flex items-center justify-between text-slate-400 mb-2">
                    <span class="text-xs font-medium uppercase tracking-wider">Tracked Inventory</span>
                    <i data-lucide="box" class="w-4 h-4 text-cyan-400"></i>
                </div>
                <div id="metric-items" class="text-2xl font-bold text-white">0 Items</div>
            </div>

            <div class="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                <div class="flex items-center justify-between text-slate-400 mb-2">
                    <span class="text-xs font-medium uppercase tracking-wider">Registered Vendors</span>
                    <i data-lucide="truck" class="w-4 h-4 text-emerald-400"></i>
                </div>
                <div id="metric-vendors" class="text-2xl font-bold text-white">0 Active</div>
            </div>

            <div class="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                <div class="flex items-center justify-between text-slate-400 mb-2">
                    <span class="text-xs font-medium uppercase tracking-wider">Policy Gate</span>
                    <i data-lucide="shield-check" class="w-4 h-4 text-blue-400"></i>
                </div>
                <div class="text-2xl font-bold text-emerald-400">ENFORCING</div>
            </div>
        </div>

        <!-- ACTIVE CASES SECTION -->
        <section class="space-y-4">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-bold text-white flex items-center gap-2">
                    <i data-lucide="file-search" class="w-5 h-5 text-cyan-400"></i>
                    Active Resource Investigation Dossiers
                </h2>
                <button onclick="loadDashboard()" class="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                </button>
            </div>

            <div id="cases-container" class="grid grid-cols-1 gap-4">
                <div class="p-8 text-center text-slate-500 bg-slate-900/50 border border-slate-800/80 rounded-xl">
                    No active cases detected. Click "INJECT CS VELOCITY SHOCK" above to simulate an institutional crisis.
                </div>
            </div>
        </section>

        <!-- INVENTORY LEDGER SECTION -->
        <section class="space-y-4">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="database" class="w-5 h-5 text-emerald-400"></i>
                Deterministic System of Record (Inventory Ledger)
            </h2>

            <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table class="w-full text-left text-sm text-slate-300">
                    <thead class="bg-slate-950 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                        <tr>
                            <th class="px-6 py-3">Item Name</th>
                            <th class="px-6 py-3">SKU</th>
                            <th class="px-6 py-3">Category</th>
                            <th class="px-6 py-3">Current Stock</th>
                            <th class="px-6 py-3">Unit Price</th>
                            <th class="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-table-body" class="divide-y divide-slate-800/60">
                        <!-- Populated by JS -->
                    </tbody>
                </table>
            </div>
        </section>

    </main>

    <script>
        lucide.createIcons();

        async function loadDashboard() {
            try {
                // Fetch Items
                const itemsRes = await fetch('/api/items');
                const items = await itemsRes.json();
                document.getElementById('metric-items').innerText = items.length + " Items";

                const tbody = document.getElementById('inventory-table-body');
                tbody.innerHTML = items.map(item => `
                    <tr class="hover:bg-slate-800/30">
                        <td class="px-6 py-4 font-medium text-white">\${item.name}</td>
                        <td class="px-6 py-4 text-slate-400 font-mono text-xs">\${item.sku}</td>
                        <td class="px-6 py-4 text-slate-400">\${item.category}</td>
                        <td class="px-6 py-4 font-bold \${item.current_stock <= item.reorder_level ? 'text-rose-400' : 'text-emerald-400'}">
                            \${item.current_stock} \${item.unit}
                        </td>
                        <td class="px-6 py-4">₹\${item.unit_price.toLocaleString()}</td>
                        <td class="px-6 py-4">
                            \${item.current_stock <= item.reorder_level 
                                ? '<span class="px-2 py-1 text-xs rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">LOW STOCK</span>' 
                                : '<span class="px-2 py-1 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">OPTIMAL</span>'}
                        </td>
                    </tr>
                `).join('');

                // Fetch Vendors
                const vendorsRes = await fetch('/api/vendors');
                const vendors = await vendorsRes.json();
                document.getElementById('metric-vendors').innerText = vendors.length + " Active";

                // Fetch Cases
                const casesRes = await fetch('/api/cases');
                const cases = await casesRes.json();
                document.getElementById('metric-cases').innerText = cases.length;

                const casesContainer = document.getElementById('cases-container');
                if (cases.length === 0) {
                    casesContainer.innerHTML = `
                        <div class="p-8 text-center text-slate-500 bg-slate-900/50 border border-slate-800/80 rounded-xl">
                            No active cases detected. Click "INJECT CS VELOCITY SHOCK" above to simulate an institutional crisis.
                        </div>`;
                } else {
                    casesContainer.innerHTML = cases.map(c => `
                        <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                            <div class="flex items-start justify-between">
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <span class="font-mono text-xs text-cyan-400 bg-cyan-950 border border-cyan-800/50 px-2 py-0.5 rounded">\${c.case_number}</span>
                                        <span class="text-xs px-2 py-0.5 rounded font-bold \${c.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}">\${c.status}</span>
                                        <span class="text-xs px-2 py-0.5 rounded font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">RISK: \${c.risk_class || 'MEDIUM'}</span>
                                    </div>
                                    <h3 class="text-xl font-bold text-white">\${c.title}</h3>
                                </div>
                                <div class="flex gap-2">
                                    <a href="/api/cases/\${c.id}/pdf" target="_blank" class="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition">
                                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Audit PDF
                                    </a>
                                    \${c.status !== 'RESOLVED' ? `
                                        <button onclick="approveCase(\${c.id})" class="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-950/50">
                                            <i data-lucide="check-circle" class="w-4 h-4"></i> APPROVE DRAFT PO
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- AI Operational Narrative -->
                            <div class="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
                                <div class="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <i data-lucide="brain-circuit" class="w-4 h-4"></i> AI Investigation Operational Narrative
                                </div>
                                <p class="text-sm text-slate-300 leading-relaxed">\${c.ai_narrative || 'Investigation in progress...'}</p>
                            </div>

                            <!-- Evidence Chips -->
                            <div class="space-y-2">
                                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gathered Evidence (Deterministic Tool Snapshots):</span>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    \${c.evidence ? c.evidence.map(ev => `
                                        <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1">
                                            <div class="font-semibold text-cyan-400 font-mono">\${ev.tool_name}</div>
                                            <div class="text-slate-300">\${ev.description}</div>
                                        </div>
                                    `).join('') : '<span class="text-slate-500 text-xs">No evidence gathered yet.</span>'}
                                </div>
                            </div>
                        </div>
                    `).join('');
                    lucide.createIcons();
                }

            } catch (err) {
                console.error("Failed to load dashboard data:", err);
            }
        }

        async function injectHeroIncident() {
            try {
                const res = await fetch('/api/demo/inject-cs-shock', { method: 'POST' });
                const data = await res.json();
                alert("🚨 HERO INCIDENT INJECTED!\nCase " + data.case_number + " opened & investigated.");
                loadDashboard();
            } catch (err) {
                alert("Failed to inject incident.");
            }
        }

        async function approveCase(caseId) {
            try {
                const res = await fetch('/api/cases/' + caseId + '/approve', { method: 'POST' });
                const data = await res.json();
                alert("✅ Action Approved! Purchase Order formally generated.");
                loadDashboard();
            } catch (err) {
                alert("Failed to approve action.");
            }
        }

        loadDashboard();
    </script>
</body>
</html>
"""

@router.get("/dashboard", response_class=HTMLResponse)
def get_command_dashboard():
    return HTML_CONTENT