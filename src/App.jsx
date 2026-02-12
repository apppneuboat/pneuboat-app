import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Printer, Save, FileText, FolderOpen, ClipboardList,
  Database, History, Search, X, Upload, Settings, LayoutDashboard,
  Anchor, PackageCheck, ShieldCheck
} from "lucide-react";
import { supabase } from "./supabase";

/* ------------------ UTILITAIRES (garde les tiens si tu veux) ------------------ */
const calculateSubtotal = (items) =>
  items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

const calculateTotal = (items, tvaRate) =>
  calculateSubtotal(items) * (1 + Number(tvaRate || 0) / 100);

const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "";

/* ------------------ APP ------------------ */
export default function App() {
  /* ====== LOGIN UNIQUE ====== */
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  // Garde la session locale (simple)
  useEffect(() => {
    const ok = localStorage.getItem("pb_unlock") === "1";
    setIsUnlocked(ok);
  }, []);

  const unlock = () => {
    setLoginMsg("");
    if (!APP_PASSWORD) {
      setLoginMsg("Mot de passe non configuré sur Vercel (VITE_APP_PASSWORD).");
      return;
    }
    if (pass === APP_PASSWORD) {
      localStorage.setItem("pb_unlock", "1");
      setIsUnlocked(true);
      setPass("");
      return;
    }
    setLoginMsg("Mot de passe incorrect.");
  };

  const lock = () => {
    localStorage.removeItem("pb_unlock");
    setIsUnlocked(false);
  };

  /* ====== APP STATE ====== */
  const [view, setView] = useState("list");
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [modelDocs, setModelDocs] = useState({});
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [printModelId, setPrintModelId] = useState(null);
  const [busy, setBusy] = useState(false);

  const [companyConfig, setCompanyConfig] = useState({
    name: "PNEUBOAT SARL",
    managerName: "Sekkal Gherbi Youcef",
    address: "Rue sans Nom num 5 partie 2 local 03, Hai el Badr Oran",
    email: "info@pneuboat.net",
    phone: "0563269639 / 0557687966",
    fax: "041245330",
    rc: "18B0117285-00/31",
    nif: "001831011728522",
    nis: "001831010078354",
    capital: "2.000.000,00 DA",
    bankName: "CPA",
    bankRib: "004 00418400026468131",
    footerText: "Chantier Naval & Maintenance Maritime Algérie",
    nextInvoiceNumber: 1,
    nextProformaNumber: 1,
    nextDeliveryNumber: 1,
    nextAttestationNumber: 1,
    logo: null,
    boatModels: [
      { id: 1, name: "PNB-360", length: "3.60 m", approvalNumber: "N° 689 DU 15/04/2021", type: "Semi-rigide" },
      { id: 2, name: "PNB-420", length: "4.20 m", approvalNumber: "N° 689 DU 15/04/2021", type: "Semi-rigide" },
      { id: 3, name: "PNB-510", length: "5.10 m", approvalNumber: "N° 689 DU 15/04/2021", type: "Semi-rigide" },
      { id: 4, name: "PNB 525 OPEN", length: "5.25 m", approvalNumber: "N° 689 DU 15/04/2021", type: "Coque Open" },
      { id: 5, name: "PNB-550", length: "5.50 m", approvalNumber: "N° 1565 du 10/07/2025", type: "Semi-rigide" },
      { id: 6, name: "PNB-650", length: "6.50 m", approvalNumber: "N° 689 DU 15/04/2021", type: "Semi-rigide" },
      { id: 7, name: "PNB-700", length: "7.00 m", approvalNumber: "N° 750/145 du 11/03/2019", type: "Semi-rigide" },
    ],
  });

  /* ------------------ LOCAL PERSISTENCE ------------------ */
  useEffect(() => {
    const savedConfig = localStorage.getItem("pb_vfinal_config");
    if (savedConfig) setCompanyConfig((prev) => ({ ...prev, ...JSON.parse(savedConfig) }));
    const savedDocs = localStorage.getItem("pb_model_docs");
    if (savedDocs) setModelDocs(JSON.parse(savedDocs));
  }, []);

  const saveLocal = (config, docs) => {
    localStorage.setItem("pb_vfinal_config", JSON.stringify(config));
    localStorage.setItem("pb_model_docs", JSON.stringify(docs));
  };

  /* ------------------ DB: LOAD HISTORY ------------------ */
  const loadHistory = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, number, date, client_name, client_address, client_id_number, tva_rate, total, doc_type, data, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    setBusy(false);
    if (error) return console.error(error);

    const mapped = (data || []).map((row) => {
      const d = row.data || {};
      return {
        ...d,
        db_id: row.id,
        type: row.doc_type || d.type || "facture",
        number: row.number,
        date: row.date,
        clientName: row.client_name,
        clientAddress: row.client_address,
        clientIdNumber: row.client_id_number,
        tvaRate: Number(row.tva_rate ?? d.tvaRate ?? 19),
        items: d.items || [{ id: Date.now(), description: "", quantity: 1, price: 0 }],
      };
    });

    setInvoiceHistory(mapped);
  };

  useEffect(() => {
    if (isUnlocked) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  /* ------------------ DOCS ------------------ */
  const startNew = (type) => {
    const year = new Date().getFullYear();
    const { nextInvoiceNumber: nf, nextAttestationNumber: na, nextDeliveryNumber: nbl, nextProformaNumber: np } = companyConfig;

    let newDoc = {
      id: Date.now(),
      type,
      date: new Date().toISOString().split("T")[0],
      clientName: "",
      clientAddress: "",
      clientIdNumber: "",
      items: [{ id: Date.now(), description: "", quantity: 1, price: 0 }],
      tvaRate: 19,
      showPayment: true,
      paymentMethod: "virement",
      clientChequeNumber: "",
      boatDetails: {
        model: "",
        serialNumber: "",
        length: "",
        approvalNumber: "",
        year: year.toString(),
        notes: "",
      },
    };

    if (type === "dossier") {
      newDoc.number = `DOS-${year}-${String(nf).padStart(3, "0")}`;
      newDoc.invoiceNumber = `FAC-${year}-${String(nf).padStart(3, "0")}`;
      newDoc.attestationNumber = `ATT-${year}-${String(na).padStart(3, "0")}`;
      newDoc.deliveryNumber = `BL-${year}-${String(nbl).padStart(3, "0")}`;
    } else {
      let pref = type === "facture" ? "FAC" : type === "proforma" ? "PRO" : type === "livraison" ? "BL" : "ATT";
      let num = type === "facture" ? nf : type === "proforma" ? np : type === "livraison" ? nbl : na;
      newDoc.number = `${pref}-${year}-${String(num).padStart(3, "0")}`;
    }

    setCurrentInvoice(newDoc);
    setView("edit");
  };

  /* ------------------ DB: SAVE / DELETE ------------------ */
  const saveInvoice = async () => {
    if (!currentInvoice?.clientName) return alert("Veuillez saisir le nom du client.");
    if (!currentInvoice?.number) return alert("Numéro manquant.");

    setBusy(true);

    const subtotal = calculateSubtotal(currentInvoice.items || []);
    const total = calculateTotal(currentInvoice.items || [], Number(currentInvoice.tvaRate || 0));
    const doc_type = currentInvoice.type || "facture";

    const payload = {
      doc_type,
      number: currentInvoice.number,
      date: currentInvoice.date,
      client_name: currentInvoice.clientName,
      client_address: currentInvoice.clientAddress || "",
      client_id_number: currentInvoice.clientIdNumber || "",
      tva_rate: Number(currentInvoice.tvaRate || 0),
      subtotal,
      tva_amount: subtotal * (Number(currentInvoice.tvaRate || 0) / 100),
      total,
      data: { ...currentInvoice },
    };

    let invoiceId = currentInvoice.db_id || null;

    if (!invoiceId) {
      const { data, error } = await supabase.from("invoices").insert(payload).select("id").single();
      if (error) { setBusy(false); alert(error.message); return; }
      invoiceId = data.id;
    } else {
      const { error } = await supabase.from("invoices").update(payload).eq("id", invoiceId);
      if (error) { setBusy(false); alert(error.message); return; }
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
    }

    const itemsPayload = (currentInvoice.items || []).map((it) => ({
      invoice_id: invoiceId,
      description: it.description || "",
      qty: Number(it.quantity || 0),
      price: Number(it.price || 0),
      line_total: Number(it.quantity || 0) * Number(it.price || 0),
    }));
    if (itemsPayload.length) {
      const { error: itemsErr } = await supabase.from("invoice_items").insert(itemsPayload);
      if (itemsErr) { setBusy(false); alert(itemsErr.message); return; }
    }

    setBusy(false);
    await loadHistory();
    setView("history");
  };

  const deleteInvoice = async (inv) => {
    if (!inv?.db_id) return;
    if (!window.confirm("Supprimer ce document ?")) return;
    setBusy(true);
    const { error } = await supabase.from("invoices").delete().eq("id", inv.db_id);
    setBusy(false);
    if (error) return alert(error.message);
    await loadHistory();
  };

  const handlePrint = () => requestAnimationFrame(() => window.print());

  /* ------------------ UI ------------------ */
  if (!isUnlocked) {
    return (
      <div className="pb-page flex items-center justify-center">
        <div className="pb-container w-full flex justify-center">
          <div className="pb-card p-8 w-full max-w-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight">Pneuboat</div>
                <div className="text-sm pb-muted">Accès unique</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <div className="text-xs font-extrabold text-slate-600 mb-1">Mot de passe</div>
                <input
                  className="pb-input"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {loginMsg && <div className="text-sm font-bold text-red-600">{loginMsg}</div>}

              <button onClick={unlock} className="pb-btn pb-btn-primary w-full py-3">
                Se connecter
              </button>

              <div className="text-xs pb-muted">
                (Défini sur Vercel : <b>VITE_APP_PASSWORD</b>)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredHistory = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return invoiceHistory;
    return invoiceHistory.filter((i) => (i.clientName || "").toLowerCase().includes(q) || (i.number || "").toLowerCase().includes(q));
  }, [invoiceHistory, searchTerm]);

  return (
    <div className="pb-page">
      <nav className="pb-nav print-hidden">
        <div className="pb-container flex items-center justify-between">
          <button onClick={() => setView("list")} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <LayoutDashboard size={18} />
            </div>
            <div className="leading-tight text-left">
              <div className="font-extrabold tracking-tight">Pneuboat</div>
              <div className="text-xs pb-muted">Facturation & Documents</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={() => setView("list")} className={`pb-tab ${view === "list" ? "pb-tab-active" : ""}`}>
              <Plus size={16} /> Station
            </button>
            <button onClick={() => setView("history")} className={`pb-tab ${view === "history" ? "pb-tab-active" : ""}`}>
              <History size={16} /> Archives
            </button>
            <button onClick={() => setView("database")} className={`pb-tab ${view === "database" ? "pb-tab-active" : ""}`}>
              <Database size={16} /> Plans
            </button>
            <button onClick={() => setView("settings")} className={`pb-tab ${view === "settings" ? "pb-tab-active" : ""}`}>
              <Settings size={16} /> Config
            </button>

            <div className="w-px h-7 bg-slate-200 mx-2" />

            <button onClick={lock} className="pb-btn pb-btn-ghost">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* ====== VUES ====== */}
      {view === "list" && (
        <div className="pb-container">
          <div className="pb-card p-6">
            <h2 className="text-2xl font-extrabold tracking-tight">Station</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
              <ActionCard title="Dossier complet" icon={<FolderOpen size={18} />} primary onClick={() => startNew("dossier")} />
              <ActionCard title="Facture" icon={<FileText size={18} />} onClick={() => startNew("facture")} />
              <ActionCard title="Proforma" icon={<ClipboardList size={18} />} onClick={() => startNew("proforma")} />
              <ActionCard title="Livraison" icon={<PackageCheck size={18} />} onClick={() => startNew("livraison")} />
              <ActionCard title="Attestation" icon={<Anchor size={18} />} onClick={() => startNew("attestation")} />
            </div>
          </div>
        </div>
      )}

      {view === "history" && (
        <div className="pb-container">
          <div className="pb-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Archives</h2>
                <p className="pb-muted mt-1">Documents enregistrés.</p>
              </div>

              <div className="flex gap-2 items-center">
                <div className="relative w-full md:w-[420px]">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input className="pb-input pl-9" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button className="pb-btn pb-btn-ghost" onClick={loadHistory} disabled={busy}>↻</button>
              </div>
            </div>

            <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-3 font-extrabold">Date</th>
                    <th className="text-left p-3 font-extrabold">Référence</th>
                    <th className="text-left p-3 font-extrabold">Client</th>
                    <th className="text-right p-3 font-extrabold">Total</th>
                    <th className="text-right p-3 font-extrabold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((inv) => (
                    <tr key={inv.db_id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">{inv.date}</td>
                      <td className="p-3 font-mono text-slate-900">{inv.number}</td>
                      <td className="p-3 font-semibold text-slate-900">{inv.clientName}</td>
                      <td className="p-3 text-right font-extrabold">{formatCurrency(calculateTotal(inv.items, inv.tvaRate))}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button className="pb-btn pb-btn-ghost" onClick={() => { setCurrentInvoice(inv); setView("edit"); }}>
                            Ouvrir
                          </button>
                          <button className="pb-btn pb-btn-danger" onClick={() => deleteInvoice(inv)} title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredHistory.length && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        {busy ? "Chargement..." : "Aucun document."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pour garder ton rendu edit/database/settings => tu peux recoller tes blocs ici */}
      {view === "edit" && (
        <div className="pb-container">
          <div className="pb-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Mode édition</h2>
              <button className="pb-btn pb-btn-ghost" onClick={() => setView("history")}><X size={16} /></button>
            </div>

            <div className="mt-4 text-sm text-slate-600">
              ✅ Accès unique activé. <br/>
              (Tu peux maintenant remettre ici ton gros design “RenderDoc / edit / print” sans changer le login)
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={saveInvoice} className="pb-btn pb-btn-primary"><Save size={16}/> Sauvegarder</button>
              <button onClick={handlePrint} className="pb-btn pb-btn-ghost"><Printer size={16}/> Imprimer</button>
            </div>
          </div>
        </div>
      )}

      {view === "database" && (
        <div className="pb-container">
          <div className="pb-card p-6">
            <h2 className="text-2xl font-extrabold">Plans</h2>
            <p className="pb-muted mt-1">Ici tu peux garder ton système upload.</p>
          </div>
        </div>
      )}

      {view === "settings" && (
        <div className="pb-container">
          <div className="pb-card p-6">
            <h2 className="text-2xl font-extrabold">Config</h2>
            <p className="pb-muted mt-1">Ici tu peux garder tes champs config.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ SMALL COMPONENTS ------------------ */
function ActionCard({ title, icon, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`text-left pb-card p-4 hover:bg-slate-50 transition ${primary ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${primary ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
          {icon}
        </div>
        <div className="font-extrabold">{title}</div>
      </div>
      <div className="text-sm pb-muted mt-2">Créer</div>
    </button>
  );
}