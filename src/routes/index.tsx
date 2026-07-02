import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Box, Users, BarChart3, IdCard,
  LogOut, Plus, Search, Barcode, Trash2, Edit, Printer, X, Check,
  Zap, ChevronRight, ChevronLeft, ShirtIcon, CreditCard, Package, Calendar,
  TrendingUp, AlertTriangle, ShoppingCartIcon, Wallet, KeyRound,
  FileSpreadsheet, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Superman Export Zone — POS" },
      { name: "description", content: "POS & Billing Software for Superman Export Zone" },
    ],
  }),
  component: POSApp,
});

// ---------- types ----------
type Staff = { id: string; name: string; role: string; has_pin: boolean; active: boolean };
const STAFF_COLS = "id,name,role,active,has_pin,created_at";
type Product = { id: string; name: string; category: string | null; barcode: string | null; price: number; cost: number; stock: number; low_stock_threshold: number };
type Customer = { id: string; name: string; phone: string | null; address: string | null; total_purchase: number; points: number; created_at: string };
type Sale = { id: string; invoice_no: string; customer_id: string | null; staff_id: string | null; subtotal: number; discount: number; total: number; paid: number; due: number; created_at: string; customers?: { name: string } | null; staff?: { name: string } | null };
type SaleItem = { id: string; sale_id: string; product_id: string | null; product_name: string; price: number; quantity: number; total: number };
type CartItem = { id: string; name: string; price: number; qty: number; stock: number };
type Expense = { id: string; category: string; amount: number; note: string | null; staff_id: string | null; created_at: string };

const AVATAR_COLORS = ["#4f6ef7", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const CATEGORIES = ["Shirt", "Pant", "T-Shirt", "Polo", "Jeans", "Kids Collection"];
const SHOP = {
  name: "Superman Export Zone",
  phone: "+880 1716-939770",
  address: "Killarpull, Narayanganj, Bangladesh",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(n: number) {
  return "৳ " + Math.round(n).toLocaleString("en-IN");
}

const SESSION_KEY = "pos_session";

function POSApp() {
  const [booting, setBooting] = useState(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<(Staff & { colorIdx: number }) | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("staff").select(STAFF_COLS).eq("active", true).order("created_at");
      const list = (data ?? []).map(r => ({ ...r, has_pin: !!r.has_pin })) as Staff[];
      setStaffList(list);
      // Restore session if previously logged in
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
        if (raw) {
          const saved = JSON.parse(raw) as { id: string; colorIdx: number };
          const match = list.find(s => s.id === saved.id);
          if (match) setCurrentUser({ ...match, colorIdx: saved.colorIdx ?? 0 });
          else localStorage.removeItem(SESSION_KEY);
        }
      } catch { /* ignore */ }
      setBooting(false);
    })();
  }, []);

  if (booting) {
    return (
      <div className="login-screen">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div className="loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <div className="text-muted">Loading…</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login
        staffList={staffList}
        onLogin={(s, idx) => {
          try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: s.id, colorIdx: idx })); } catch { /* ignore */ }
          setCurrentUser({ ...s, colorIdx: idx });
        }}
        reload={async () => {
          const { data } = await supabase.from("staff").select("*").eq("active", true).order("created_at");
          setStaffList(data ?? []);
        }}
      />
    );
  }

  return <Shell user={currentUser} onLogout={() => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setCurrentUser(null);
  }} />;
}


// ---------- LOGIN ----------
function Login({ staffList, onLogin, reload }: { staffList: Staff[]; onLogin: (s: Staff, idx: number) => void; reload: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected !== null) pinRef.current?.focus();
  }, [selected]);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  function tryLogin() {
    if (selected === null) return;
    const s = staffList[selected];
    if (s.pin && s.pin !== pin) {
      setError("Wrong PIN. Try again.");
      setPin("");
      return;
    }
    onLogin(s, selected);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><Zap size={22} /></div>
          <div className="login-logo-text">
            Superman Export Zone
            <span>POS & Billing System</span>
          </div>
        </div>
        <div className="login-divider" />
        <div className="login-sub">Select staff to continue</div>
        <div>
          {staffList.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13, padding: 12 }}>No staff configured.</div>
          )}
          {staffList.map((s, i) => (
            <button
              key={s.id}
              className={`staff-btn ${selected === i ? "selected" : ""}`}
              onClick={() => { setSelected(i); setError(""); setPin(""); }}
            >
              <div className="staff-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                {s.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="staff-info">
                <div className="staff-name">{s.name}</div>
                <div className="staff-role">{s.role}</div>
              </div>
              <ChevronRight size={16} color="var(--text3)" />
            </button>
          ))}
        </div>
        {selected !== null && (
          <div>
            <input
              ref={pinRef}
              type="password"
              className="pin-input"
              placeholder="Enter PIN"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") tryLogin(); }}
            />
            <button className="btn-login" onClick={tryLogin}>
              <LogOut size={14} style={{ transform: "rotate(180deg)" }} /> Login
            </button>
            {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6, textAlign: "center" }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- SHELL ----------
type PageKey = "dashboard" | "sales" | "inventory" | "customers" | "expenses" | "reports" | "staff" | "settings";

function Shell({ user, onLogout }: { user: Staff & { colorIdx: number }; onLogout: () => void }) {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [clock, setClock] = useState(new Date());

  // data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [staffAll, setStaffAll] = useState<Staff[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modal, setModal] = useState<React.ReactNode>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function loadAll() {
    const [p, c, s, si, st, ex] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("customers").select("*").order("name"),
      supabase.from("sales").select("*, customers(name), staff(name)").order("created_at", { ascending: false }),
      supabase.from("sale_items").select("*"),
      supabase.from("staff").select("*").order("created_at"),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
    ]);
    setProducts(p.data ?? []);
    setCustomers(c.data ?? []);
    setSales((s.data as Sale[]) ?? []);
    setSaleItems(si.data ?? []);
    setStaffAll(st.data ?? []);
    setExpenses(ex.data ?? []);
  }

  useEffect(() => { loadAll(); }, []);

  const titles: Record<PageKey, string> = {
    dashboard: "Dashboard",
    sales: "Sales / POS",
    inventory: "Inventory",
    customers: "Customers",
    expenses: "Daily Expense",
    reports: "Reports",
    staff: "Staff Management",
    settings: "Settings",
  };

  const navItems: { key: PageKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { key: "sales", label: "Sales / POS", icon: <ShoppingCart /> },
    { key: "inventory", label: "Inventory", icon: <Box /> },
    { key: "customers", label: "Customers", icon: <Users /> },
    { key: "expenses", label: "Daily Expense", icon: <Wallet /> },
    { key: "reports", label: "Reports", icon: <BarChart3 /> },
    { key: "staff", label: "Staff", icon: <IdCard />, adminOnly: true },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Zap size={18} /></div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">Superman Export</div>
            <div className="sidebar-logo-sub">POS SYSTEM</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.filter(n => !n.adminOnly || user.role === "admin" || user.role === "owner").map(n => (
            <button key={n.key} className={`nav-item ${page === n.key ? "active" : ""}`} onClick={() => setPage(n.key)}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-av" style={{ background: AVATAR_COLORS[user.colorIdx % AVATAR_COLORS.length] }}>
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <button className="btn-logout" onClick={onLogout} title="Logout"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-title">{titles[page]}</div>
          <div className="topbar-right">
            <span className="clock">{clock.toLocaleTimeString()}</span>
            {page !== "sales" && (
              <button className="btn btn-primary btn-sm" onClick={() => setPage("sales")}>
                <Plus size={14} /> New Sale
              </button>
            )}
          </div>
        </div>
        <div className="content">
          {page === "dashboard" && <Dashboard products={products} customers={customers} sales={sales} />}
          {page === "sales" && (
            <POS
              products={products} customers={customers} user={user}
              onAfterCheckout={loadAll} setModal={setModal}
            />
          )}
          {page === "inventory" && <Inventory products={products} reload={loadAll} setModal={setModal} />}
          {page === "customers" && <CustomersPage customers={customers} reload={loadAll} setModal={setModal} />}
          {page === "expenses" && <ExpensesPage expenses={expenses} user={user} reload={loadAll} setModal={setModal} />}
          {page === "reports" && <Reports sales={sales} saleItems={saleItems} products={products} expenses={expenses} reload={loadAll} setModal={setModal} />}
          {page === "staff" && <StaffPage staff={staffAll} reload={loadAll} setModal={setModal} />}
        </div>
      </main>

      {modal}
      <div id="invoice-print" />
    </div>
  );
}

// ---------- DASHBOARD ----------
function Dashboard({ products, customers, sales }: { products: Product[]; customers: Customer[]; sales: Sale[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const todaySales = sales.filter(s => s.created_at.startsWith(today));
  const monthSales = sales.filter(s => s.created_at >= monthStart);
  const todayTotal = todaySales.reduce((a, s) => a + Number(s.total), 0);
  const monthTotal = monthSales.reduce((a, s) => a + Number(s.total), 0);
  const lowStock = products.filter(p => p.stock <= p.low_stock_threshold);

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<CreditCard size={14} />} label="Today's Sales" value={fmt(todayTotal)} sub={`${todaySales.length} transactions`} />
        <StatCard icon={<Package size={14} />} label="Total Products" value={String(products.length)} sub={`${lowStock.length} low stock`} />
        <StatCard icon={<Users size={14} />} label="Customers" value={String(customers.length)} sub="registered" />
        <StatCard icon={<Calendar size={14} />} label="This Month" value={fmt(monthTotal)} sub={`${monthSales.length} transactions`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-title">Recent Sales</div>
          <table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Time</th></tr></thead>
            <tbody>
              {sales.slice(0, 6).map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-blue">{s.invoice_no}</span></td>
                  <td>{s.customers?.name || "Walk-in"}</td>
                  <td><strong>{fmt(Number(s.total))}</strong></td>
                  <td style={{ color: "var(--text3)", fontSize: 12 }}>{new Date(s.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={4} className="empty-row">No sales yet</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-title">Low Stock Alert <AlertTriangle size={14} color="var(--warning)" /></div>
          <table>
            <thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {lowStock.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td><span className={`badge ${p.stock === 0 ? "badge-danger" : "badge-warning"}`}>{p.stock === 0 ? "Out" : "Low"}</span></td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan={3} className="empty-row">All stocks healthy ✓</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, sub, actions }: { icon: React.ReactNode; label: React.ReactNode; value: string; sub: string; actions?: React.ReactNode }) {
  return (
    <div className="stat-card" style={{ position: "relative" }}>
      {actions && <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>{actions}</div>}
      <div className="stat-label">{icon}{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

// ---------- POS ----------
function POS({
  products, customers, user, onAfterCheckout, setModal,
}: {
  products: Product[]; customers: Customer[]; user: Staff;
  onAfterCheckout: () => Promise<void>;
  setModal: (n: React.ReactNode) => void;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [customerId, setCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [paid, setPaid] = useState<string>("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.category && set.add(p.category));
    return ["All", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      const okCat = cat === "All" || p.category === cat;
      const okSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q);
      return okCat && okSearch;
    });
  }, [products, search, cat]);

  function addToCart(p: Product) {
    if (p.stock <= 0) return;
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) return prev;
        return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: p.id, name: p.name, price: Number(p.price), qty: 1, stock: p.stock }];
    });
  }
  function updateQty(id: string, qty: number) {
    setCart(prev => prev.flatMap(c => {
      if (c.id !== id) return [c];
      const q = Math.max(0, Math.min(c.stock, qty));
      if (q === 0) return [];
      return [{ ...c, qty: q }];
    }));
  }
  function updatePrice(id: string, price: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, price: Math.max(0, price) } : c));
  }
  function removeItem(id: string) { setCart(prev => prev.filter(c => c.id !== id)); }
  function clear() { setCart([]); setDiscount(""); setPaid(""); setCustomerId(""); }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discInput = parseFloat(discount) || 0;
  const discAmt = discountType === "percent"
    ? Math.round(subtotal * discInput / 100)
    : Math.min(subtotal, Math.round(discInput));
  const total = subtotal - discAmt;
  const paidAmt = paid === "" ? total : (parseFloat(paid) || 0);
  const due = Math.max(0, total - paidAmt);

  async function checkout() {
    if (cart.length === 0) { alert("Cart is empty"); return; }
    const invNo = "INV-" + Date.now().toString().slice(-8);
    const cust = customers.find(c => c.id === customerId) || null;

    const { data: saleRow, error } = await supabase.from("sales").insert({
      invoice_no: invNo, customer_id: cust?.id ?? null, staff_id: user.id,
      subtotal, discount: discAmt, total, paid: paidAmt, due,
    }).select().single();

    if (error || !saleRow) { alert("Error: " + (error?.message || "unknown")); return; }

    await supabase.from("sale_items").insert(cart.map(c => ({
      sale_id: saleRow.id, product_id: c.id, product_name: c.name,
      price: c.price, quantity: c.qty, total: c.price * c.qty,
    })));

    for (const c of cart) {
      const p = products.find(p => p.id === c.id);
      if (p) await supabase.from("products").update({ stock: p.stock - c.qty }).eq("id", c.id);
    }

    if (cust) {
      await supabase.from("customers").update({
        total_purchase: Number(cust.total_purchase) + total,
        points: cust.points + Math.floor(total / 100),
      }).eq("id", cust.id);
    }

    const invoiceData = {
      invoice_no: invNo, items: [...cart], subtotal, discAmt, total,
      paid: paidAmt, due, staff: user.name, customer: cust?.name || "Walk-in",
      customer_phone: cust?.phone || "",
      date: new Date(),
    };
    showInvoice(invoiceData, setModal);
    clear();
    await onAfterCheckout();
  }

  return (
    <div className="pos-layout">
      <div className="pos-left">
        <div className="search-row">
          <input
            className="search-input"
            placeholder="🔍 Search product or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button className="btn" onClick={() => {
            const match = products.find(p => p.barcode && p.barcode.toLowerCase() === search.toLowerCase());
            if (match) { addToCart(match); setSearch(""); }
          }}><Barcode size={14} /> Scan</button>
        </div>
        <div className="cat-tabs">
          {categories.map(c => (
            <button key={c} className={`cat-tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div className="products-grid">
          {filtered.map(p => (
            <div key={p.id} className={`prod-card ${p.stock === 0 ? "out" : ""}`} onClick={() => addToCart(p)}>
              <div className="prod-icon"><ShirtIcon size={22} /></div>
              <div className="prod-name">{p.name}</div>
              <div className="prod-price">{fmt(Number(p.price))}</div>
              <div className="prod-stock">{p.stock === 0 ? "❌ Out of stock" : `✓ ${p.stock} in stock`}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 30, color: "var(--text3)" }}>No products found</div>
          )}
        </div>
      </div>

      <div className="cart-panel">
        <div className="cart-header">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShoppingCart size={16} /> Cart ({cart.length})</span>
          <button className="btn btn-sm" onClick={clear}>Clear</button>
        </div>
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCartIcon />
              Cart is empty
              <br /><small>Click a product to add</small>
            </div>
          ) : cart.map(c => (
            <div key={c.id} className="cart-item">
              <div className="cart-item-row">
                <div className="cart-item-name">{c.name}</div>
                <button className="cart-item-del" onClick={() => removeItem(c.id)}><Trash2 size={14} /></button>
              </div>
              <div className="cart-item-row">
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => updateQty(c.id, c.qty - 1)}>−</button>
                  <input className="qty-input" type="number" min={1} max={c.stock} value={c.qty}
                    onChange={(e) => updateQty(c.id, parseInt(e.target.value) || 0)} />
                  <button className="qty-btn" onClick={() => updateQty(c.id, c.qty + 1)}>+</button>
                </div>
                <input className="price-input" type="number" min={0} value={c.price}
                  onChange={(e) => updatePrice(c.id, parseFloat(e.target.value) || 0)} />
                <div className="cart-item-total">{fmt(c.price * c.qty)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-footer">
          <div className="cust-row">
            <div className="cust-pill">
              <span className="cust-pill-name">
                {customerId ? (customers.find(c => c.id === customerId)?.name || "Walk-in") : "— Walk-in Customer —"}
              </span>
              {customerId && (
                <button type="button" className="cust-pill-x" onClick={() => setCustomerId("")}>✕</button>
              )}
            </div>
            <button type="button" className="cust-btn" onClick={() => {
              setModal(<CustomerSearchModal customers={customers} onClose={() => setModal(null)} onPick={(id) => { setCustomerId(id); setModal(null); }} />);
            }}><Search size={13} /> Search</button>
            <button type="button" className="cust-btn" onClick={() => {
              setModal(<CustomerForm onClose={() => setModal(null)} onSaved={async (created) => {
                setModal(null);
                await onAfterCheckout();
                if (created?.id) setCustomerId(created.id);
              }} />);
            }}><Plus size={13} /> New</button>
          </div>
          <div className="cart-disc-row" style={{ gap: 6 }}>
            <select
              className="cart-disc-input"
              style={{ maxWidth: 80 }}
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "percent" | "flat")}
            >
              <option value="percent">% Disc</option>
              <option value="flat">Flat ৳</option>
            </select>
            <input className="cart-disc-input" type="number" placeholder={discountType === "percent" ? "Discount %" : "Discount ৳"} min={0}
              value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="cart-disc-row" style={{ gap: 6, marginTop: 6 }}>
            <input className="cart-disc-input" style={{ flex: 1 }} type="number" placeholder="Paid amount" min={0}
              value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
          <div className="cart-totals">
            <div className="cart-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="cart-row"><span>Discount {discountType === "percent" ? `(${discInput}%)` : "(Flat)"}</span><span className="text-danger">- {fmt(discAmt)}</span></div>
            {due > 0 && <div className="cart-row"><span>Due</span><span className="text-danger">{fmt(due)}</span></div>}
            <div className="cart-row grand"><span>Grand Total</span><span style={{ color: "var(--accent)" }}>{fmt(total)}</span></div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 11 }} onClick={checkout}>
            <Check size={15} /> Checkout & Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- INVOICE ----------
function showInvoice(d: {
  invoice_no: string; items: CartItem[]; subtotal: number; discAmt: number; total: number;
  paid: number; due: number; staff: string; customer: string; customer_phone: string; date: Date;
}, setModal: (n: React.ReactNode) => void) {
  const printNode = document.getElementById("invoice-print");
  if (printNode) {
    printNode.innerHTML = `
      <div style="text-align:center;width:100%;overflow:hidden;">
        <div style="font-size:16px;font-weight:900;letter-spacing:0;">${esc(SHOP.name)}</div>
        <div style="font-size:11px;font-weight:700;">${esc(SHOP.address)}</div>
        <div style="font-size:11px;font-weight:700;">Contact: ${esc(SHOP.phone)}</div>
      </div>
      <div style="border-top:2px solid #000;border-bottom:2px solid #000;margin:5px 0;padding:3px 0;font-size:11px;font-weight:800;line-height:1.25;">
        <div>Invoice: <b style="font-weight:900;">${esc(d.invoice_no)}</b></div>
        <div>Date: ${esc(d.date.toLocaleString())}</div>
        <div>Staff: <b style="font-weight:900;">${esc(d.staff)}</b></div>
        <div>Customer: <b style="font-weight:900;">${esc(d.customer)}</b>${d.customer_phone ? " (" + esc(d.customer_phone) + ")" : ""}</div>
      </div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;font-weight:800;table-layout:fixed;line-height:1.2;">
        <colgroup>
          <col style="width:45%;" />
          <col style="width:15%;" />
          <col style="width:20%;" />
          <col style="width:20%;" />
        </colgroup>
        <thead><tr style="border-bottom:2px solid #000;font-weight:900;">
          <th style="text-align:left;padding:2px 4px 2px 0;">Item</th>
          <th style="text-align:center;padding:2px 2px;">Q</th>
          <th style="text-align:right;padding:2px 2px;">Price</th>
          <th style="text-align:right;padding:2px 0 2px 2px;">Total</th>
        </tr></thead>
        <tbody>
          ${d.items.map(c => `
            <tr>
              <td style="padding:2px 4px 2px 0;word-break:break-word;overflow-wrap:break-word;">${esc(c.name)}</td>
              <td style="text-align:center;padding:2px 2px;">${c.qty}</td>
              <td style="text-align:right;padding:2px 2px;overflow-wrap:break-word;">${Math.round(c.price)}</td>
              <td style="text-align:right;padding:2px 0 2px 2px;overflow-wrap:break-word;">${Math.round(c.price * c.qty)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div style="border-top:2px solid #000;margin-top:5px;padding-top:3px;font-size:11px;font-weight:800;line-height:1.3;">
        <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${Math.round(d.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Discount</span><span>- ${Math.round(d.discAmt)}</span></div>
        <div style="display:flex;justify-content:space-between;gap:4px;font-weight:900;font-size:13px;border-top:2px solid #000;border-bottom:2px solid #000;margin:3px 0;padding:3px 0;"><span>Total</span><span>${Math.round(d.total)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Paid</span><span>${Math.round(d.paid)}</span></div>
        ${d.due > 0 ? `<div style="display:flex;justify-content:space-between;font-weight:900;"><span>Due</span><span>${Math.round(d.due)}</span></div>` : ""}
      </div>
      <div style="text-align:center;margin-top:8px;font-size:11px;font-weight:800;border-top:2px solid #000;padding-top:5px;">
        Thank You For Shopping
      </div>
    `;
  }

  const body = (
    <div style={{ fontSize: 13 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>⚡ {SHOP.name}</div>
        <div style={{ fontSize: 11, color: "var(--text2)" }}>{SHOP.address}</div>
        <div style={{ fontSize: 11, color: "var(--text2)" }}>Contact: {SHOP.phone}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: "var(--accent)" }}>{d.invoice_no}</div>
        <div style={{ fontSize: 11, color: "var(--text3)" }}>{d.date.toLocaleString()} • {d.staff}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Customer: <b>{d.customer}</b></div>
      </div>
      <hr style={{ borderColor: "var(--border)", margin: "10px 0" }} />
      {d.items.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
          <span>{c.name} × {c.qty} @ {fmt(c.price)}</span>
          <span>{fmt(c.price * c.qty)}</span>
        </div>
      ))}
      <hr style={{ borderColor: "var(--border)", margin: "10px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text2)" }}><span>Subtotal</span><span>{fmt(d.subtotal)}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}><span>Discount</span><span>- {fmt(d.discAmt)}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
        <span>Grand Total</span><span style={{ color: "var(--accent)" }}>{fmt(d.total)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span>Paid</span><span>{fmt(d.paid)}</span></div>
      {d.due > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)", fontWeight: 700 }}><span>Due</span><span>{fmt(d.due)}</span></div>}
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "var(--text2)" }}>Thank You For Shopping 🙏</div>
    </div>
  );
  setModal(<Modal title={`Invoice — ${d.invoice_no}`} body={body} setModal={setModal} actions={[
    { label: "Print 80mm", primary: false, icon: <Printer size={14} />, onClick: () => window.print() },
    { label: "Close", primary: true, onClick: () => setModal(null) },
  ]} />);
}

// ---------- INVENTORY ----------
function Inventory({ products, reload, setModal }: { products: Product[]; reload: () => Promise<void>; setModal: (n: React.ReactNode) => void }) {
  function openForm(editing?: Product) {
    setModal(<ProductForm editing={editing} products={products} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />);
  }
  async function del(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    await reload();
  }
  return (
    <div className="card">
      <div className="card-title">
        Inventory Management
        <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={14} /> New Product</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Barcode</th><th>Price</th><th>Cost</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td>{p.category || "—"}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.barcode || "—"}</td>
              <td>{fmt(Number(p.price))}</td>
              <td className="text-muted">{fmt(Number(p.cost))}</td>
              <td>{p.stock}</td>
              <td><span className={`badge ${p.stock === 0 ? "badge-danger" : p.stock <= p.low_stock_threshold ? "badge-warning" : "badge-success"}`}>
                {p.stock === 0 ? "Out" : p.stock <= p.low_stock_threshold ? "Low" : "OK"}
              </span></td>
              <td><div className="row-actions">
                <button className="btn btn-sm" onClick={() => openForm(p)}><Edit size={13} /></button>
                <button className="btn btn-sm btn-danger" onClick={() => del(p)}><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan={8} className="empty-row">No products yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ProductForm({ editing, products, onClose, onSaved }: { editing?: Product; products: Product[]; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const allCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    products.forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);
  const [categoryList, setCategoryList] = useState<string[]>(allCategories);
  const [name, setName] = useState(editing?.name || "");
  const [category, setCategory] = useState(editing?.category || categoryList[0]);
  const [barcode, setBarcode] = useState(editing?.barcode || "");
  const [price, setPrice] = useState(String(editing?.price ?? ""));
  const [cost, setCost] = useState(String(editing?.cost ?? ""));
  const [stock, setStock] = useState(String(editing?.stock ?? 0));
  const [threshold, setThreshold] = useState(String(editing?.low_stock_threshold ?? 5));

  async function save() {
    if (!name.trim()) { alert("Name is required"); return; }
    const payload = {
      name: name.trim(), category, barcode: barcode.trim() || null,
      price: parseFloat(price) || 0, cost: parseFloat(cost) || 0,
      stock: parseInt(stock) || 0, low_stock_threshold: parseInt(threshold) || 5,
    };
    if (editing) await supabase.from("products").update(payload).eq("id", editing.id);
    else await supabase.from("products").insert(payload);
    await onSaved();
  }

  function handleCategoryChange(val: string) {
    if (val === "__new__") {
      const nc = prompt("Enter new category name:");
      if (nc && nc.trim()) {
        const trimmed = nc.trim();
        if (!categoryList.includes(trimmed)) setCategoryList([...categoryList, trimmed]);
        setCategory(trimmed);
      }
      return;
    }
    setCategory(val);
  }

  const body = (
    <>
      <div className="form-group">
        <label className="form-label">Product Name *</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slim Fit Pant" />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            {categoryList.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">+ Add new category…</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Barcode</label>
          <input className="form-input" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="optional" />
        </div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Sale Price (৳) *</label>
          <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Purchase Cost (৳)</label>
          <input className="form-input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Stock Qty</label>
          <input className="form-input" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Low Stock Alert ≤</label>
          <input className="form-input" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
      </div>
    </>
  );
  return <Modal title={editing ? "Edit Product" : "New Product"} body={body} setModal={onClose as any} actions={[
    { label: "Cancel", onClick: onClose },
    { label: "Save", primary: true, icon: <Check size={14} />, onClick: save },
  ]} />;
}

// ---------- CUSTOMERS ----------
function CustomersPage({ customers, reload, setModal }: { customers: Customer[]; reload: () => Promise<void>; setModal: (n: React.ReactNode) => void }) {
  function openForm() {
    setModal(<CustomerForm onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />);
  }
  return (
    <div className="card">
      <div className="card-title">Customer List
        <button className="btn btn-primary btn-sm" onClick={openForm}><Plus size={14} /> New Customer</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Total Purchase</th><th>Points</th><th>Added</th></tr></thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td>{c.phone || "—"}</td>
              <td>{fmt(Number(c.total_purchase))}</td>
              <td><span className="badge badge-blue">{c.points} pts</span></td>
              <td>{new Date(c.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {customers.length === 0 && <tr><td colSpan={5} className="empty-row">No customers yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CustomerForm({ onClose, onSaved }: { onClose: () => void; onSaved: (created?: { id: string; name: string }) => Promise<void> | void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  async function save() {
    if (!name.trim()) { alert("Name is required"); return; }
    const { data } = await supabase.from("customers").insert({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null }).select("id, name").single();
    await onSaved(data ?? undefined);
  }
  return <Modal title="New Customer" setModal={onClose as any} body={
    <>
      <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXX-XXXXXX" /></div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
    </>
  } actions={[
    { label: "Cancel", onClick: onClose },
    { label: "Save", primary: true, icon: <Check size={14} />, onClick: save },
  ]} />;
}

function CustomerSearchModal({ customers, onClose, onPick }: { customers: Customer[]; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? customers.filter(c => c.name.toLowerCase().includes(ql) || (c.phone || "").toLowerCase().includes(ql))
    : customers;
  return <Modal title="Search Customer" setModal={onClose as any} body={
    <>
      <div className="form-group">
        <input className="form-input" autoFocus placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        {filtered.length === 0 && <div className="empty-row" style={{ padding: 12 }}>No customers found</div>}
        {filtered.map(c => (
          <div key={c.id} onClick={() => onPick(c.id)} style={{ padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong>{c.name}</strong>
            <span style={{ color: "var(--muted-foreground)" }}>{c.phone || "—"}</span>
          </div>
        ))}
      </div>
    </>
  } actions={[{ label: "Close", onClick: onClose }]} />;
}

// ---------- REPORTS ----------
function Reports({ sales, saleItems, products, expenses, reload, setModal }: { sales: Sale[]; saleItems: SaleItem[]; products: Product[]; expenses: Expense[]; reload: () => Promise<void>; setModal: (n: React.ReactNode) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [monthOffset, setMonthOffset] = useState(0);
  const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const monthStartDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEndDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const monthStart = monthStartDate.toISOString();
  const monthEnd = monthEndDate.toISOString();
  const monthLabel = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const todayTotal = sales.filter(s => s.created_at.startsWith(today)).reduce((a, s) => a + Number(s.total), 0);
  const weekTotal = sales.filter(s => s.created_at >= weekStart).reduce((a, s) => a + Number(s.total), 0);
  const monthSales = sales.filter(s => s.created_at >= monthStart && s.created_at < monthEnd);
  const monthTotal = monthSales.reduce((a, s) => a + Number(s.total), 0);
  const allTotal = sales.reduce((a, s) => a + Number(s.total), 0);

  // weekly Saturday→Friday
  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  // Compute current week's Saturday (start) — JS getDay: Sun=0,Mon=1,...Sat=6
  const now0 = new Date();
  const todayDow = now0.getDay(); // 0..6
  // days since last Saturday (or today if Sat)
  const daysSinceSat = (todayDow + 1) % 7; // Sat=6→0, Sun=0→1, ... Fri=5→6
  const satStart = new Date(now0); satStart.setHours(0, 0, 0, 0); satStart.setDate(satStart.getDate() - daysSinceSat);
  const dayTotals = Array(7).fill(0) as number[];
  for (let i = 0; i < 7; i++) {
    const d = new Date(satStart); d.setDate(satStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayTotals[i] = sales.filter(s => s.created_at.startsWith(key)).reduce((a, s) => a + Number(s.total), 0);
  }
  const maxV = Math.max(...dayTotals, 1);
  const todayIdx = daysSinceSat; // index of today in the Sat→Fri row

  // top products
  const agg: Record<string, { qty: number; total: number }> = {};
  saleItems.forEach(it => {
    if (!agg[it.product_name]) agg[it.product_name] = { qty: 0, total: 0 };
    agg[it.product_name].qty += it.quantity;
    agg[it.product_name].total += Number(it.total);
  });
  const top = Object.entries(agg).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  const q = query.trim().toLowerCase();
  // date filter
  const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
  const toTs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;
  const dateFilteredSales = sales.filter(s => {
    const ts = new Date(s.created_at).getTime();
    if (fromTs !== null && ts < fromTs) return false;
    if (toTs !== null && ts > toTs) return false;
    return true;
  });
  const filteredSales = q
    ? dateFilteredSales.filter(s =>
        s.invoice_no.toLowerCase().includes(q) ||
        (s.customers?.name || "").toLowerCase().includes(q) ||
        (s.staff?.name || "").toLowerCase().includes(q),
      )
    : dateFilteredSales;

  // Profit (Investment vs Sale)
  const filteredSaleIds = new Set(dateFilteredSales.map(s => s.id));
  const filteredItems = saleItems.filter(it => filteredSaleIds.has(it.sale_id));
  const costMap: Record<string, number> = {};
  products.forEach(p => { costMap[p.id] = Number(p.cost); });
  let investment = 0, revenue = 0;
  filteredItems.forEach(it => {
    const cost = it.product_id ? (costMap[it.product_id] ?? 0) : 0;
    investment += cost * Number(it.quantity);
    revenue += Number(it.total);
  });
  const grossProfit = revenue - investment;
  const totalDiscount = dateFilteredSales.reduce((a, s) => a + Number(s.discount), 0);
  const expensesInRange = expenses.filter(e => {
    const ts = new Date(e.created_at).getTime();
    if (fromTs !== null && ts < fromTs) return false;
    if (toTs !== null && ts > toTs) return false;
    return true;
  });
  const totalExpenses = expensesInRange.reduce((a, e) => a + Number(e.amount), 0);
  const netProfit = grossProfit - totalDiscount - totalExpenses;
  const expenseByCat: Record<string, number> = {};
  expensesInRange.forEach(e => { expenseByCat[e.category] = (expenseByCat[e.category] || 0) + Number(e.amount); });

  function viewInvoice(s: Sale) {
    openInvoiceFromSale(s, saleItems, setModal);
  }
  function editSale(s: Sale) {
    setModal(<EditSaleForm sale={s} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />);
  }
  async function deleteSale(s: Sale) {
    if (!confirm(`Delete invoice ${s.invoice_no}? This will restore stock and remove the record.`)) return;
    const { data: items } = await supabase.from("sale_items").select("*").eq("sale_id", s.id);
    for (const it of items ?? []) {
      if (it.product_id) {
        const { data: prod } = await supabase.from("products").select("stock").eq("id", it.product_id).single();
        if (prod) await supabase.from("products").update({ stock: Number(prod.stock) + Number(it.quantity) }).eq("id", it.product_id);
      }
    }
    await supabase.from("sale_items").delete().eq("sale_id", s.id);
    await supabase.from("sales").delete().eq("id", s.id);
    await reload();
  }

  function exportExcel(rows: Sale[], label: string) {
    const header = ["Invoice", "Date", "Customer", "Staff", "Subtotal", "Discount", "Total", "Paid", "Due"];
    const csv = [header.join(",")].concat(
      rows.map(s => [
        s.invoice_no,
        new Date(s.created_at).toLocaleDateString(),
        (s.customers?.name || "Walk-in").replace(/,/g, " "),
        (s.staff?.name || "").replace(/,/g, " "),
        Number(s.subtotal).toFixed(2),
        Number(s.discount).toFixed(2),
        Number(s.total).toFixed(2),
        Number(s.paid).toFixed(2),
        Number(s.due).toFixed(2),
      ].join(",")),
    ).join("\n");
    const total = rows.reduce((a, s) => a + Number(s.total), 0);
    const blob = new Blob(["\ufeff" + csv + `\n,,,,,,Total,,${total.toFixed(2)}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Sales-${label}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  function exportPDF(rows: Sale[], label: string) {
    const total = rows.reduce((a, s) => a + Number(s.total), 0);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Sales Report - ${esc(label)}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{margin:0 0 4px;font-size:20px}
        .sub{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f3f3f3}
        td.r,th.r{text-align:right}
        tfoot td{font-weight:bold;background:#f9f9f9}
        @media print{button{display:none}}
      </style></head><body>
      <h1>Sales Report — ${esc(label)}</h1>
      <div class="sub">Generated: ${esc(new Date().toLocaleString())} • ${rows.length} sales</div>
      <button onclick="window.print()" style="margin-bottom:12px;padding:6px 12px">Print / Save as PDF</button>
      <table>
        <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Staff</th>
          <th class="r">Subtotal</th><th class="r">Discount</th><th class="r">Total</th><th class="r">Paid</th><th class="r">Due</th></tr></thead>
        <tbody>
        ${rows.map(s => `<tr>
          <td>${esc(s.invoice_no)}</td>
          <td>${esc(new Date(s.created_at).toLocaleString())}</td>
          <td>${esc(s.customers?.name || "Walk-in")}</td>
          <td>${esc(s.staff?.name || "")}</td>
          <td class="r">${Number(s.subtotal).toFixed(2)}</td>
          <td class="r">${Number(s.discount).toFixed(2)}</td>
          <td class="r">${Number(s.total).toFixed(2)}</td>
          <td class="r">${Number(s.paid).toFixed(2)}</td>
          <td class="r">${Number(s.due).toFixed(2)}</td>
        </tr>`).join("")}
        </tbody>
        <tfoot><tr><td colspan="6">Grand Total</td><td class="r">৳${total.toFixed(2)}</td><td colspan="2"></td></tr></tfoot>
      </table>
      </body></html>`);
    w.document.close();
  }

  const exportBtnStyle: React.CSSProperties = { background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "var(--text2)" };
  function ExportIcons({ rows, label }: { rows: Sale[]; label: string }) {
    return (
      <>
        <button type="button" title={`Download ${label} Excel`} style={exportBtnStyle} onClick={() => exportExcel(rows, label)}><FileSpreadsheet size={14} /></button>
        <button type="button" title={`Download ${label} PDF`} style={exportBtnStyle} onClick={() => exportPDF(rows, label)}><FileText size={14} /></button>
      </>
    );
  }

  const todaySales = sales.filter(s => s.created_at.startsWith(today));
  const weekSales = sales.filter(s => s.created_at >= weekStart);
  const rangeLabel = (fromDate || toDate) ? `${fromDate || "…"}_to_${toDate || "…"}` : "All";

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<TrendingUp size={14} />} label="Today" value={fmt(todayTotal)} sub="sales"
          actions={<ExportIcons rows={todaySales} label={`Today-${today}`} />} />
        <StatCard icon={<TrendingUp size={14} />} label="This Week" value={fmt(weekTotal)} sub="last 7 days"
          actions={<ExportIcons rows={weekSales} label="This-Week" />} />
        <StatCard
          icon={<Calendar size={14} />}
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button type="button" style={exportBtnStyle} title="Previous month" onClick={() => setMonthOffset(o => o - 1)}><ChevronLeft size={12} /></button>
              <span>{monthLabel}</span>
              <button type="button" style={{ ...exportBtnStyle, opacity: monthOffset >= 0 ? 0.4 : 1 }} title="Next month" disabled={monthOffset >= 0} onClick={() => setMonthOffset(o => Math.min(0, o + 1))}><ChevronRight size={12} /></button>
            </span>
          }
          value={fmt(monthTotal)}
          sub={`${monthSales.length} sales`}
          actions={<ExportIcons rows={monthSales} label={monthLabel.replace(/\s+/g, "-")} />}
        />
        <StatCard icon={<TrendingUp size={14} />} label="All Time" value={fmt(allTotal)} sub={`${sales.length} sales`}
          actions={<ExportIcons rows={sales} label="All-Time" />} />
      </div>

      <div className="card">
        <div className="card-title">
          <span>Date Range Filter</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "var(--text3)" }}>From</label>
            <input type="date" className="form-input" style={{ width: 150 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <label style={{ fontSize: 12, color: "var(--text3)" }}>To</label>
            <input type="date" className="form-input" style={{ width: 150 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button className="btn btn-sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button>
            <span style={{ display: "inline-flex", gap: 4, marginLeft: 4 }}>
              <ExportIcons rows={dateFilteredSales} label={`Range-${rangeLabel}`} />
            </span>
          </div>
        </div>
        <div className="stats-grid" style={{ marginTop: 4 }}>
          <StatCard icon={<TrendingUp size={14} />} label="Investment (Cost)" value={fmt(investment)} sub={`${filteredItems.length} items`} />
          <StatCard icon={<TrendingUp size={14} />} label="Revenue (Sale)" value={fmt(revenue)} sub={`${dateFilteredSales.length} sales`} />
          <StatCard icon={<TrendingUp size={14} />} label="Expenses" value={fmt(totalExpenses)} sub={`${expensesInRange.length} entries`} />
          <StatCard icon={<TrendingUp size={14} />} label={netProfit >= 0 ? "Net Profit" : "Net Loss"} value={fmt(Math.abs(netProfit))} sub={`Gross ${fmt(grossProfit)} − Disc ${fmt(totalDiscount)}`} />
        </div>
      </div>

      <div className="report-grid">
        <div className="card">
          <div className="card-title">Weekly Sales (Sat → Fri)</div>
          <div className="bar-chart">
            {dayTotals.map((v, i) => (
              <div className="bar-wrap" key={i}>
                <div className="bar-val">{v > 0 ? "৳" + (v / 1000).toFixed(1) + "k" : ""}</div>
                <div className={`bar ${i === todayIdx ? "today" : ""}`} style={{ height: Math.max(4, Math.round(v / maxV * 110)) }} />
                <div className="bar-label">{days[i]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Best Selling Products</div>
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
            <tbody>
              {top.map(([name, d]) => (
                <tr key={name}><td>{name}</td><td>{d.qty}</td><td>{fmt(d.total)}</td></tr>
              ))}
              {top.length === 0 && <tr><td colSpan={3} className="empty-row">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Expenses by Category {fromDate || toDate ? "(in range)" : "(all time)"}</div>
        <table>
          <thead><tr><th>Category</th><th>Amount</th></tr></thead>
          <tbody>
            {Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td><strong>{fmt(v)}</strong></td></tr>
            ))}
            {Object.keys(expenseByCat).length === 0 && <tr><td colSpan={2} className="empty-row">No expenses</td></tr>}
            {Object.keys(expenseByCat).length > 0 && (
              <tr><td><strong>Total</strong></td><td><strong>{fmt(totalExpenses)}</strong></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-title">
          <span>All Sales History</span>
          <div style={{ position: "relative", width: 260 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
            <input
              className="search-input"
              style={{ paddingLeft: 30, width: "100%" }}
              placeholder="Search invoice, customer, staff…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Discount</th><th>Total</th><th>Paid</th><th>Staff</th><th>Date</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {filteredSales.map(s => (
              <tr key={s.id}>
                <td><span className="badge badge-blue">{s.invoice_no}</span></td>
                <td>{s.customers?.name || "Walk-in"}</td>
                <td>{Number(s.discount) > 0 ? <span className="badge badge-warning">{fmt(Number(s.discount))}</span> : "—"}</td>
                <td><strong>{fmt(Number(s.total))}</strong></td>
                <td>{fmt(Number(s.paid))}{Number(s.due) > 0 && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Due {fmt(Number(s.due))}</span>}</td>
                <td>{s.staff?.name || "—"}</td>
                <td style={{ fontSize: 12, color: "var(--text3)" }}>{new Date(s.created_at).toLocaleString()}</td>
                <td>
                  <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-icon" title="View / Print" onClick={() => viewInvoice(s)}><Printer size={13} /></button>
                    <button className="btn btn-sm btn-icon" title="Edit" onClick={() => editSale(s)}><Edit size={13} /></button>
                    <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={() => deleteSale(s)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && <tr><td colSpan={8} className="empty-row">{q ? "No matching invoices" : "No sales"}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Re-print an existing sale invoice
async function openInvoiceFromSale(s: Sale, _allItems: SaleItem[], setModal: (n: React.ReactNode) => void) {
  const { data: items } = await supabase.from("sale_items").select("*").eq("sale_id", s.id);
  const cart: CartItem[] = (items ?? []).map(it => ({
    id: it.product_id || it.id, name: it.product_name, price: Number(it.price), qty: Number(it.quantity), stock: 0,
  }));
  showInvoice({
    invoice_no: s.invoice_no,
    items: cart,
    subtotal: Number(s.subtotal),
    discAmt: Number(s.discount),
    total: Number(s.total),
    paid: Number(s.paid),
    due: Number(s.due),
    staff: s.staff?.name || "—",
    customer: s.customers?.name || "Walk-in",
    customer_phone: "",
    date: new Date(s.created_at),
  }, setModal);
}

function EditSaleForm({ sale, onClose, onSaved }: { sale: Sale; onClose: () => void; onSaved: () => void }) {
  const [discount, setDiscount] = useState(String(sale.discount));
  const [paid, setPaid] = useState(String(sale.paid));
  const [saving, setSaving] = useState(false);

  const discNum = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, Number(sale.subtotal) - discNum);
  const paidNum = Math.max(0, Number(paid) || 0);
  const due = Math.max(0, total - paidNum);

  async function save() {
    setSaving(true);
    await supabase.from("sales").update({
      discount: discNum, total, paid: paidNum, due,
    }).eq("id", sale.id);
    setSaving(false);
    onSaved();
  }

  return (
    <Modal title={`Edit Invoice — ${sale.invoice_no}`} setModal={() => onClose()} body={
      <div>
        <div className="form-group">
          <label className="form-label">Subtotal</label>
          <input className="form-input" value={fmt(Number(sale.subtotal))} disabled />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Discount (৳)</label>
            <input className="form-input" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Paid (৳)</label>
            <input className="form-input" type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
        </div>
        <div className="cart-row"><span>Grand Total</span><strong>{fmt(total)}</strong></div>
        <div className="cart-row"><span>Due</span><strong className={due > 0 ? "text-danger" : "text-success"}>{fmt(due)}</strong></div>
      </div>
    } actions={[
      { label: "Cancel", onClick: onClose },
      { label: saving ? "Saving…" : "Save", primary: true, icon: <Check size={14} />, onClick: save },
    ]} />
  );
}


// ---------- STAFF ----------
function StaffPage({ staff, reload, setModal }: { staff: Staff[]; reload: () => Promise<void>; setModal: (n: React.ReactNode) => void }) {
  function openForm() {
    setModal(<StaffForm onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />);
  }
  function openChangePin(s: Staff) {
    setModal(<ChangePinForm staff={s} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />);
  }
  async function del(s: Staff) {
    if (!confirm(`Delete staff "${s.name}"?`)) return;
    await supabase.from("staff").delete().eq("id", s.id);
    await reload();
  }
  async function toggle(s: Staff) {
    await supabase.from("staff").update({ active: !s.active }).eq("id", s.id);
    await reload();
  }
  return (
    <div className="card">
      <div className="card-title">Staff Management
        <button className="btn btn-primary btn-sm" onClick={openForm}><Plus size={14} /> Add Staff</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>PIN</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {staff.map(s => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td className="text-muted" style={{ textTransform: "capitalize" }}>{s.role}</td>
              <td><span style={{ letterSpacing: 4 }}>{s.pin ? "••••" : "—"}</span></td>
              <td>
                <button onClick={() => toggle(s)} className={`badge ${s.active ? "badge-success" : "badge-danger"}`} style={{ border: "none", cursor: "pointer" }}>
                  {s.active ? "Active" : "Inactive"}
                </button>
              </td>
              <td>
                <div className="row-actions">
                  <button className="btn btn-sm" title="Change PIN" onClick={() => openChangePin(s)}><KeyRound size={13} /> PIN</button>
                  <button className="btn btn-sm btn-danger" onClick={() => del(s)}><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
          {staff.length === 0 && <tr><td colSpan={5} className="empty-row">No staff yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function StaffForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(""); const [role, setRole] = useState("salesman"); const [pin, setPin] = useState("");
  async function save() {
    if (!name.trim()) { alert("Name required"); return; }
    if (!/^\d{4,6}$/.test(pin)) { alert("PIN must be 4-6 digits"); return; }
    await supabase.from("staff").insert({ name: name.trim(), role, pin, active: true });
    await onSaved();
  }
  return <Modal title="Add Staff" setModal={onClose as any} body={
    <>
      <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Role</label>
          <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="salesman">Salesman</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">PIN (4-6 digits) *</label>
          <input className="form-input" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} />
        </div>
      </div>
    </>
  } actions={[
    { label: "Cancel", onClick: onClose },
    { label: "Save", primary: true, icon: <Check size={14} />, onClick: save },
  ]} />;
}

function ChangePinForm({ staff, onClose, onSaved }: { staff: Staff; onClose: () => void; onSaved: () => Promise<void> }) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  async function save() {
    if (staff.pin && staff.pin !== oldPin) { alert("Current PIN is incorrect"); return; }
    if (!/^\d{4,6}$/.test(newPin)) { alert("New PIN must be 4-6 digits"); return; }
    if (newPin !== confirmPin) { alert("New PINs do not match"); return; }
    await supabase.from("staff").update({ pin: newPin }).eq("id", staff.id);
    await onSaved();
  }
  return <Modal title={`Change PIN — ${staff.name}`} setModal={onClose as any} body={
    <>
      {staff.pin && (
        <div className="form-group"><label className="form-label">Current PIN</label>
          <input className="form-input" type="password" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
        </div>
      )}
      <div className="form-grid">
        <div className="form-group"><label className="form-label">New PIN (4-6 digits)</label>
          <input className="form-input" type="password" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value)} />
        </div>
        <div className="form-group"><label className="form-label">Confirm New PIN</label>
          <input className="form-input" type="password" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
        </div>
      </div>
    </>
  } actions={[
    { label: "Cancel", onClick: onClose },
    { label: "Update PIN", primary: true, icon: <Check size={14} />, onClick: save },
  ]} />;
}

// ---------- EXPENSES ----------
const EXPENSE_CATEGORIES = ["Staff Salary", "Rent", "Utilities", "Transport", "Food", "Marketing", "Maintenance", "Other"];

function ExpensesPage({ expenses, user, reload, setModal }: { expenses: Expense[]; user: Staff; reload: () => Promise<void>; setModal: (n: React.ReactNode) => void }) {
  function openForm() {
    setModal(<ExpenseForm user={user} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />);
  }
  async function del(e: Expense) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", e.id);
    await reload();
  }
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = expenses.filter(e => e.created_at.startsWith(today)).reduce((a, e) => a + Number(e.amount), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthTotal = expenses.filter(e => e.created_at >= monthStart).reduce((a, e) => a + Number(e.amount), 0);
  const allTotal = expenses.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<Wallet size={14} />} label="Today's Expense" value={fmt(todayTotal)} sub="today" />
        <StatCard icon={<Wallet size={14} />} label="This Month" value={fmt(monthTotal)} sub="MTD" />
        <StatCard icon={<Wallet size={14} />} label="All Time" value={fmt(allTotal)} sub={`${expenses.length} entries`} />
      </div>
      <div className="card">
        <div className="card-title">Daily Expense
          <button className="btn btn-primary btn-sm" onClick={openForm}><Plus size={14} /> Add Expense</button>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th>Action</th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: "var(--text3)" }}>{new Date(e.created_at).toLocaleString()}</td>
                <td><span className="badge badge-blue">{e.category}</span></td>
                <td><strong>{fmt(Number(e.amount))}</strong></td>
                <td>{e.note || "—"}</td>
                <td><button className="btn btn-sm btn-danger" onClick={() => del(e)}><Trash2 size={13} /></button></td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="empty-row">No expenses yet</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ExpenseForm({ user, onClose, onSaved }: { user: Staff; onClose: () => void; onSaved: () => Promise<void> }) {
  const [catList, setCatList] = useState<string[]>(EXPENSE_CATEGORIES);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  function handleCat(val: string) {
    if (val === "__new__") {
      const nc = prompt("Enter new expense category:");
      if (nc && nc.trim()) {
        const t = nc.trim();
        if (!catList.includes(t)) setCatList([...catList, t]);
        setCategory(t);
      }
      return;
    }
    setCategory(val);
  }
  async function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    await supabase.from("expenses").insert({ category, amount: amt, note: note.trim() || null, staff_id: user.id });
    await onSaved();
  }
  return <Modal title="Add Expense" setModal={onClose as any} body={
    <>
      <div className="form-group"><label className="form-label">Category *</label>
        <select className="form-select" value={category} onChange={(e) => handleCat(e.target.value)}>
          {catList.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__new__">+ Add new category…</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label">Amount (৳) *</label>
        <input className="form-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </div>
      <div className="form-group"><label className="form-label">Note</label>
        <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
      </div>
    </>
  } actions={[
    { label: "Cancel", onClick: onClose },
    { label: "Save", primary: true, icon: <Check size={14} />, onClick: save },
  ]} />;
}


// ---------- MODAL ----------
function Modal({
  title, body, actions, setModal,
}: {
  title: string; body: React.ReactNode;
  actions: { label: string; primary?: boolean; icon?: React.ReactNode; onClick: () => void | Promise<void> }[];
  setModal: (n: React.ReactNode) => void;
}) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="modal">
        <div className="modal-title">
          <span>{title}</span>
          <button className="btn btn-sm btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
        </div>
        <div>{body}</div>
        <div className="modal-actions">
          {actions.map((a, i) => (
            <button key={i} className={`btn ${a.primary ? "btn-primary" : ""}`} onClick={() => a.onClick()}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
