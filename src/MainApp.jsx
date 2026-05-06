// MainApp.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  FileText,
  FolderOpen,
  ClipboardList,
  Database,
  History,
  Search,
  X,
  Upload,
  Settings,
  Anchor,
  PackageCheck,
  LogOut,
  Cloud,
  CheckCircle,
  Percent,
  Phone,
  Calendar,
} from "lucide-react";
import { supabase } from "./supabase";

/* ------------------ UTILITAIRES ------------------ */
const NumberToLetter = (nombre) => {
  const unites = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const dizaines = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  const conv99 = (n) => {
    if (n < 20) return unites[n];
    let d = Math.floor(n / 10);
    let u = n % 10;
    if (d === 7 || d === 9) { d -= 1; u += 10; }
    let res = dizaines[d];
    if (u === 1 && d < 8) res += " et un";
    else if (u > 0) res += "-" + unites[u];
    return res;
  };
  const conv999 = (n) => {
    let c = Math.floor(n / 100);
    let r = n % 100;
    let res = "";
    if (c > 0) {
      res += (c === 1 ? "" : unites[c] + " ") + "cent" + (r === 0 && c > 1 ? "s" : "");
    }
    if (r > 0) res += (res ? " " : "") + conv99(r);
    return res;
  };
  const val = Number(nombre || 0);
  if (val === 0) return "Zéro Dinars Algériens";
  const ent = Math.floor(val);
  const dec = Math.round((val - ent) * 100);
  let n = ent;
  let res = "";
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    res += (m === 1 ? "un million" : conv999(m) + " millions") + " ";
    n %= 1000000;
  }
  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    res += (k === 1 ? "mille" : conv999(k) + " mille") + " ";
    n %= 1000;
  }
  if (n > 0) res += conv999(n);
  let final = res.trim() + " Dinars Algériens";
  if (dec > 0) final += " et " + conv99(dec) + " Centimes";
  return final.charAt(0).toUpperCase() + final.slice(1);
};

const calculateSubtotal = (items) => (items || []).reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.price || 0), 0);
const calculateTotal = (items, tvaRate, applyTva = true) => {
  const sub = calculateSubtotal(items);
  const rate = applyTva ? Number(tvaRate || 0) : 0;
  return sub * (1 + rate / 100);
};
const formatCurrency = (amount) => Number(amount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";
const labelDoc = (t) => {
  if (t === "facture") return "FACTURE";
  if (t === "proforma") return "FACTURE PROFORMA";
  if (t === "livraison") return "BON DE LIVRAISON";
  if (t === "attestation") return "ATTESTATION DE CONSTRUCTION";
  if (t === "commande") return "BON DE COMMANDE";
  if (t === "dossier") return "DOSSIER COMPLET";
  return String(t || "").toUpperCase();
};
const paymentLabel = (pm) => {
  if (pm === "cheque") return "Chèque";
  if (pm === "virement") return "Virement bancaire";
  if (pm === "espece") return "Espèce";
  return "—";
};

/* ------------------ ✅ NOUVEAU: TARIFS ACCESSOIRES 2026 ------------------ */
const TARIFS_ACCESSOIRES_2026 = [
  { name: "Crémaillère hydraulique (Max 90cv)", price: 125000 },
  { name: "Câble vitesse et accélérateur", price: 7500 },
  { name: "Gaine moteur avec passe-coque", price: 4800 },
  { name: "Réservoir 70 L", price: 73000 },
  { name: "Accessoires réservoir", price: 27000 },
  { name: "Séparateur d'eau", price: 14800 },
  { name: "Tableau interrupteur (6 boutons + USB)", price: 12500 },
  { name: "Coupe-courant", price: 6800 },
  { name: "Poste Radio", price: 43000 },
  { name: "Baffles étanches (paire)", price: 16000 },
  { name: "Roll Bar Inox", price: 78000 },
  { name: "Bimini (Taud de soleil)", price: 38000 },
  { name: "Table Ronde/Ovale", price: 45000 },
  { name: "Échelle (3 marches)", price: 23500 },
  { name: "Remorque renforcée", price: 200000 },
  { name: "Montage électricité", price: 40000 },
  { name: "Montage moteur", price: 30000 }
];

/* ------------------ DESIGNATION + TVA inversée ------------------ */
const designationFromModel = (modelName) => {
  const m = String(modelName || "").trim();
  if (/pnb\s*[- ]?\s*525/i.test(m)) return "Bateau rigide open PNB-525";
  const match = m.match(/pnb\s*[- ]?\s*(\d{3})/i);
  if (match) return `Semi rigide PNB-${match[1]}`;
  return m || "—";
};

const priceHtFromTtc = (ttc, tvaRate, applyTva = true) => {
  const T = Number(ttc || 0);
  const r = applyTva ? Number(tvaRate || 0) : 0;
  const denom = 1 + r / 100;
  return !denom ? T : T / denom;
};

const priceTtcFromHt = (ht, tvaRate, applyTva = true) => {
  const H = Number(ht || 0);
  const r = applyTva ? Number(tvaRate || 0) : 0;
  return H * (1 + r / 100);
};

const recomputeItemsHtFromTtc = (items, tvaRate, applyTva = true) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((it) => {
    const hasTtc = it && it.priceTtc !== undefined && it.priceTtc !== null && it.priceTtc !== "";
    if (!hasTtc) return it;
    return { ...it, price: priceHtFromTtc(it.priceTtc, tvaRate, applyTva) };
  });
};

/* ------------------ UI COMPONENTS ------------------ */
const Button = ({ children, onClick, variant = "primary", className = "", disabled, type = "button" }) => {
  const base = "inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-sm shadow-sm active:scale-95 disabled:opacity-50";
  const styles = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-800 text-white border border-blue-900",
    secondary: "bg-white text-blue-900 border border-blue-200",
    danger: "bg-red-500 text-white",
    ghost: "text-slate-500 hover:bg-slate-100",
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const InputGroup = ({ label, children, compact }) => (
  <div className={`${compact ? "mb-0" : "mb-3"}`}>
    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all font-semibold" />
);

/* ------------------ HELPERS FICHIERS ------------------ */
const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const isPdfLike = (src) => {
  const s = String(src || "");
  return s.startsWith("data:application/pdf") || s.toLowerCase().includes(".pdf") || s.includes("application/pdf");
};

/* ------------------ APP PRINCIPALE ------------------ */
export default function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState("list");
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveTab, setArchiveTab] = useState("all"); // ✅ Filtre par type
  const [busy, setBusy] = useState(false);
  const [modelDocs, setModelDocs] = useState({});
  const [pdfLibrary, setPdfLibrary] = useState([]);
  const [pdfSelected, setPdfSelected] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1.12);

  const [companyConfig, setCompanyConfig] = useState({
    name: "PNEUBOAT SARL", managerName: "Sekkal Gherbi Youcef", address: "Hai el Badr Oran",
    email: "info@pneuboat.net", website: "www.pneuboat.net", phone: "0563269639",
    nextInvoiceNumber: 1, nextProformaNumber: 1, nextDeliveryNumber: 1, nextAttestationNumber: 1, nextOrderNumber: 1,
    rc: "", nif: "", nis: "", bankName: "", bankRib: "", logo: null, favicon: null,
    boatModels: [
      { id: 1, name: "PNB-360", length: "3.60 m", approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP", type: "Semi-rigide" },
      { id: 2, name: "PNB-420", length: "4.20 m", approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP", type: "Semi-rigide" },
      { id: 3, name: "PNB-510", length: "5.10 m", approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP", type: "Semi-rigide" },
      { id: 4, name: "PNB 525 OPEN", length: "5.25 m", approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP", type: "Coque Open" },
      { id: 5, name: "PNB-550", length: "5.50 m", approvalNumber: "Numéro 1565 du 10/07/2025 délivrée par DMMP", type: "Semi-rigide" },
      { id: 6, name: "PNB-650", length: "6.50 m", approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP", type: "Semi-rigide" },
      { id: 7, name: "PNB-700", length: "7.00 m", approvalNumber: "Numéro 750/145 du 11/03/2019 délivrée par DMMP", type: "Semi-rigide" },
    ],
  });

  /* ------------------ PRINT RULES ------------------ */
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `@media print { .no-print { display: none !important; } .page-break { page-break-after: always; } body { background: white !important; } @page { size: A4; margin: 0; } }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  /* ------------------ SUPABASE & DATA ------------------ */
  const loadOnlineData = async () => {
    setBusy(true);
    try {
      const { data: configData } = await supabase.from("app_settings").select("config").limit(1).maybeSingle();
      if (configData?.config) setCompanyConfig(prev => ({ ...prev, ...configData.config }));
      const { data: invData } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(200);
      setInvoiceHistory((invData || []).map(row => ({ ...row.data, db_id: row.id, created_at: row.created_at })));
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  useEffect(() => {
    const auth = localStorage.getItem("pb_is_authenticated");
    if (auth === "true") { setIsAuthenticated(true); setTimeout(() => loadOnlineData(), 250); }
    const savedDocs = localStorage.getItem("pb_model_docs");
    if (savedDocs) try { setModelDocs(JSON.parse(savedDocs)); } catch {}
  }, []);

  const changeView = useCallback((newView) => { setView(newView); }, []);
  const handleLogout = () => { setIsAuthenticated(false); localStorage.removeItem("pb_is_authenticated"); setView("list"); };

  /* ------------------ GESTION FACTURES ------------------ */
  const normalizeInvoice = (inv) => ({
    ...inv,
    items: Array.isArray(inv?.items) ? inv.items : [{ id: Date.now(), description: "", quantity: 1, price: 0, priceTtc: null }],
    boatDetails: inv?.boatDetails || { model: "", serialNumber: "", length: "", approvalNumber: "", year: "2026", notes: "Certifié construit à neuf." },
    orderDetails: inv?.orderDetails || { modelWanted: "", colors: "", options: "", accessories: "", amountPaid: 0 },
    date: inv?.date || new Date().toISOString().split("T")[0],
    applyTva: inv?.applyTva ?? true,
    tvaRate: inv?.tvaRate ?? 19,
    showPayment: inv?.showPayment ?? true,
    paymentMethod: inv?.paymentMethod ?? "virement",
  });

  const startNew = (type) => {
    const year = new Date().getFullYear();
    const config = companyConfig;
    const n = type === "facture" ? config.nextInvoiceNumber : type === "proforma" ? config.nextProformaNumber : type === "livraison" ? config.nextDeliveryNumber : type === "commande" ? config.nextOrderNumber : config.nextAttestationNumber;
    const pref = type === "facture" ? "FAC" : type === "proforma" ? "PRO" : type === "livraison" ? "BL" : type === "commande" ? "BC" : "ATT";

    let newDoc = normalizeInvoice({
      type,
      number: type === "dossier" ? `DOS-${year}-${String(config.nextInvoiceNumber).padStart(3, "0")}` : `${pref}-${year}-${String(n).padStart(3, "0")}`,
    });

    if (type === "dossier") {
      newDoc.invoiceNumber = `FAC-${year}-${String(config.nextInvoiceNumber).padStart(3, "0")}`;
      newDoc.attestationNumber = `ATT-${year}-${String(config.nextAttestationNumber).padStart(3, "0")}`;
      newDoc.deliveryNumber = `BL-${year}-${String(config.nextDeliveryNumber).padStart(3, "0")}`;
    }
    setCurrentInvoice(newDoc);
    changeView("edit");
  };

  const selectModel = (id) => {
    const m = companyConfig.boatModels.find(x => x.id === parseInt(id));
    if (!m) return;
    setCurrentInvoice(p => {
      const prev = normalizeInvoice(p || {});
      return {
        ...prev,
        boatDetails: { ...prev.boatDetails, model: m.name, length: m.length, approvalNumber: m.approvalNumber },
        items: [{ ...prev.items[0], description: designationFromModel(m.name) }, ...prev.items.slice(1)]
      };
    });
  };

  const saveInvoiceToCloud = async () => {
    if (!currentInvoice?.clientName) return alert("Nom du client ?");
    setBusy(true);
    try {
      const normalized = normalizeInvoice(currentInvoice);
      const total = calculateTotal(normalized.items, normalized.tvaRate, normalized.applyTva);
      const payload = { doc_number: normalized.number, client_name: normalized.clientName, total, data: { ...normalized, total } };
      if (normalized.db_id) await supabase.from("invoices").update(payload).eq("id", normalized.db_id);
      else await supabase.from("invoices").insert(payload);
      await loadOnlineData();
      changeView("history");
    } catch (e) { alert("Erreur sauvegarde"); }
    setBusy(false);
  };

  /* ------------------ RENDU DOCUMENT ------------------ */
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;
    const inv = normalizeInvoice(currentInvoice);
    const subtotal = calculateSubtotal(inv.items);
    const total = calculateTotal(inv.items, inv.tvaRate, inv.applyTva);
    const totalWords = NumberToLetter(total);
    const isCommande = subType === "commande";

    return (
      <div className="bg-white w-[210mm] h-[297mm] p-[14mm] mx-auto shadow-2xl text-slate-900 relative text-[12px] leading-snug font-sans flex flex-col justify-between overflow-hidden print:shadow-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-red-600" />
        <div className="relative">
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
            <div>
              {companyConfig.logo ? <img src={companyConfig.logo} alt="logo" className="h-12 object-contain mb-2" /> : <h1 className="text-xl font-black uppercase">Pneuboat <span className="text-blue-700">SARL</span></h1>}
              <div className="text-[10px] text-slate-500 leading-tight">
                <p>{companyConfig.address}</p><p>Tél: {companyConfig.phone}</p><p>{companyConfig.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase border border-slate-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{labelDoc(subType)}
              </span>
              <div className="mt-3">
                <div className="font-mono text-base font-black text-slate-900">{docNumber}</div>
                <div className="text-[10px] font-semibold text-slate-400">Le {new Date(inv.date).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
          </div>

          <div className="mb-5 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Client</h3>
            <div className="text-[14px] font-black uppercase truncate text-slate-900">{inv.clientName || "—"}</div>
            <div className="text-[11px] text-slate-600 line-clamp-1">{inv.clientAddress || "—"}</div>
            <div className="mt-2 flex gap-2">
               {inv.clientPhone && <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><Phone size={12}/>{inv.clientPhone}</span>}
            </div>
          </div>

          <div className="min-h-[175px]">
            {subType === "attestation" ? (
              <div className="space-y-4">
                <p className="text-justify text-[11px]">Je soussigné, <b>{companyConfig.managerName}</b>, gérant de <b>{companyConfig.name}</b>, certifie que le navire a été construit à neuf pour le compte de <b>{inv.clientName || ".........."}</b>.</p>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-red-50 p-4">
                  <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Garantie</div>
                  <div className="text-[11px] font-bold text-slate-700">Garantie <span className="font-black text-slate-900">1 an</span> sur tout défaut de fabrication provenant d’usine.</div>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-2 text-[9px] font-black uppercase text-center tracking-widest">Détails du Bateau</div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg"><div className="text-[8px] text-slate-400">Modèle</div><div className="font-black">{inv.boatDetails.model || "—"}</div></div>
                    <div className="p-2 bg-slate-50 rounded-lg"><div className="text-[8px] text-slate-400">N° Série</div><div className="font-black text-blue-700">{inv.boatDetails.serialNumber || "—"}</div></div>
                  </div>
                </div>
              </div>
            ) : isCommande ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[9px] font-black text-slate-500 uppercase mb-2">Bon de commande</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg"><div className="text-[8px] text-slate-400">Modèle voulu</div><div className="font-black">{inv.orderDetails.modelWanted || inv.boatDetails.model || "—"}</div></div>
                    <div className="p-2 bg-slate-50 rounded-lg"><div className="text-[8px] text-slate-400">Options</div><div className="font-bold">{inv.orderDetails.options || "—"}</div></div>
                  </div>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-500 uppercase mb-2">Règlement</div>
                  <div className="grid grid-cols-3 gap-3 font-black">
                    <div><div className="text-[8px] text-slate-400">Total</div><div className="text-blue-700">{formatCurrency(subtotal)}</div></div>
                    <div><div className="text-[8px] text-slate-400">Versé</div><div>{formatCurrency(inv.orderDetails.amountPaid)}</div></div>
                    <div><div className="text-[8px] text-slate-400">Restant</div><div className="text-red-600">{formatCurrency(subtotal - inv.orderDetails.amountPaid)}</div></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-slate-700 font-black uppercase bg-slate-50 border-b border-slate-200">
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3 text-center w-16">Qté</th>
                      {subType !== "livraison" && <><th className="py-2.5 px-3 text-right w-24">P.U</th><th className="py-2.5 px-3 text-right w-28">Total</th></>}
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((it, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2.5 px-3 font-bold">{it.description}</td>
                        <td className="py-2.5 px-3 text-center font-black">{it.quantity}</td>
                        {subType !== "livraison" && (
                          <><td className="py-2.5 px-3 text-right">{Number(it.price).toLocaleString("fr-FR")}</td><td className="py-2.5 px-3 text-right font-black">{(it.quantity * it.price).toLocaleString("fr-FR")}</td></>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          {subType !== "livraison" && subType !== "attestation" && (
            <div className="flex justify-end mb-3">
              <div className="w-[58%] rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-white text-[10px] space-y-2">
                  <div className="flex justify-between text-slate-500 font-bold"><span>Sous-total HT</span><span>{formatCurrency(subtotal)}</span></div>
                  {inv.applyTva && <div className="flex justify-between text-slate-500 font-bold"><span>TVA {inv.tvaRate}%</span><span>{formatCurrency(subtotal * inv.tvaRate/100)}</span></div>}
                  <div className="pt-2 border-t flex justify-between font-black text-[13px] text-blue-700"><span>TOTAL TTC</span><span>{formatCurrency(total)}</span></div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="border border-dashed border-slate-200 rounded-2xl h-20 p-3 text-[9px] text-slate-400 uppercase font-black">Cachet Gérant</div>
            <div className="border border-dashed border-slate-200 rounded-2xl h-20 p-3 text-[9px] text-slate-400 uppercase font-black">Signature Client</div>
          </div>
          <div className="border-t pt-2 text-[8px] text-slate-400 grid grid-cols-3 gap-2 uppercase font-bold tracking-tighter">
            <div>RIB: {companyConfig.bankRib}</div><div>RC: {companyConfig.rc} NIF: {companyConfig.nif}</div><div className="text-right">{companyConfig.name}</div>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------ VUES INTERFACE ------------------ */
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center">
        <Anchor size={40} className="text-blue-600 mx-auto mb-6" /><h1 className="text-2xl font-black mb-6 uppercase">Pneuboat Login</h1>
        <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-center font-bold mb-4 focus:border-blue-500 outline-none" placeholder="••••••••" />
        <Button onClick={handleLogin} className="w-full justify-center">Déverrouiller</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] md:pl-64 pb-24 md:pb-0">
      <nav className="fixed bottom-0 left-0 w-full md:w-64 md:h-screen bg-slate-900 text-white z-50 flex md:flex-col p-2 md:p-4 gap-2 no-print">
        <div className="hidden md:flex items-center gap-3 p-4 border-b border-slate-800"><Anchor className="text-blue-500"/><span className="text-xl font-black uppercase">Pneuboat</span></div>
        <button onClick={() => setView("list")} className={`flex flex-1 md:flex-none flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all ${view === 'list' ? 'bg-blue-600' : 'text-slate-500 hover:text-white'}`}><Plus size={20}/><span className="text-[10px] md:text-sm font-bold">Nouveau</span></button>
        <button onClick={() => setView("history")} className={`flex flex-1 md:flex-none flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all ${view === 'history' ? 'bg-blue-600' : 'text-slate-500 hover:text-white'}`}><History size={20}/><span className="text-[10px] md:text-sm font-bold">Archives</span></button>
        <button onClick={() => setView("database")} className={`flex flex-1 md:flex-none flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all ${view === 'database' ? 'bg-blue-600' : 'text-slate-500 hover:text-white'}`}><Database size={20}/><span className="text-[10px] md:text-sm font-bold">Plans</span></button>
        <button onClick={() => setIsAuthenticated(false)} className="flex flex-1 md:flex-none flex-col md:flex-row items-center gap-2 p-3 rounded-xl text-red-400 md:mt-auto"><LogOut size={20}/><span className="text-[10px] md:text-sm font-bold">Sortir</span></button>
      </nav>

      <main className="p-4 md:p-10 max-w-7xl mx-auto">
        {view === "list" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["facture", "proforma", "commande", "livraison", "attestation", "dossier"].map(t => (
              <div key={t} onClick={() => startNew(t)} className="bg-white p-6 rounded-3xl border-2 hover:border-blue-500 cursor-pointer transition-all shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><FileText/></div>
                <h3 className="font-black text-xs uppercase">{labelDoc(t)}</h3>
              </div>
            ))}
          </div>
        )}

        {view === "edit" && currentInvoice && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <div className="bg-white p-6 rounded-3xl border shadow-sm no-print space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-black uppercase text-sm">Édition : {labelDoc(currentInvoice.type)}</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setView("list")}><X size={16}/> Fermer</Button>
                  <Button onClick={saveInvoiceToCloud} disabled={busy}><Save size={16}/> Sauvegarder</Button>
                  <Button variant="secondary" onClick={() => window.print()}><Printer size={16}/></Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <InputGroup label="✅ Date du Document (Modifiable)">
                  <Input type="date" value={currentInvoice.date} onChange={e => setCurrentInvoice({...currentInvoice, date: e.target.value})} />
                </InputGroup>
                <InputGroup label="Client"><Input value={currentInvoice.clientName || ""} onChange={e => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} placeholder="Nom complet" /></InputGroup>
                <InputGroup label="N° Document"><Input value={currentInvoice.number} readOnly className="bg-slate-50" /></InputGroup>
              </div>

              {/* ✅ NOUVEAU: CATALOGUE ACCESSOIRES 2026 */}
              {currentInvoice.type === "commande" && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black uppercase text-blue-700 mb-3 block flex items-center gap-2"><Plus size={12}/> Catalogue Tarifs Pneuboat 2026</label>
                  <div className="flex flex-wrap gap-2">
                    {TARIFS_ACCESSOIRES_2026.map(acc => (
                      <button key={acc.name} onClick={() => setCurrentInvoice({...currentInvoice, items: [...currentInvoice.items, {id: Date.now(), description: acc.name, quantity: 1, price: acc.price}]})} className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                        + {acc.name} ({acc.price.toLocaleString()} DA)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Articles & Tarifs (Modifiables)</label>
                {currentInvoice.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-sm font-bold" value={it.description} onChange={e => {const ni = [...currentInvoice.items]; ni[idx].description = e.target.value; setCurrentInvoice({...currentInvoice, items: ni});}} />
                    <input className="w-20 p-3 bg-slate-50 border rounded-xl text-sm text-center font-black" type="number" value={it.quantity} onChange={e => {const ni = [...currentInvoice.items]; ni[idx].quantity = e.target.value; setCurrentInvoice({...currentInvoice, items: ni});}} />
                    <input className="w-32 p-3 bg-slate-50 border rounded-xl text-sm text-right font-black" type="number" value={it.price} onChange={e => {const ni = [...currentInvoice.items]; ni[idx].price = e.target.value; setCurrentInvoice({...currentInvoice, items: ni});}} />
                    <button onClick={() => setCurrentInvoice({...currentInvoice, items: currentInvoice.items.filter((_, i) => i !== idx)})} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                ))}
                <button onClick={() => setCurrentInvoice({...currentInvoice, items: [...currentInvoice.items, {id: Date.now(), description: "", quantity: 1, price: 0}]})} className="text-[10px] font-black text-blue-600 uppercase">+ Ligne vide</button>
              </div>
            </div>

            <div className="bg-slate-200 p-4 rounded-3xl overflow-auto h-[700px] shadow-inner border-4 border-white flex justify-center">
               <div style={{ transform: `scale(${previewZoom})`, transformOrigin: "top center" }}>
                  {currentInvoice.type === "dossier" ? (
                    <div className="space-y-4">
                      <RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} />
                      <RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} />
                      <RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} />
                    </div>
                  ) : <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} />}
               </div>
            </div>
          </div>
        )}

        {view === "history" && (
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <h2 className="text-xl font-black uppercase flex items-center gap-3"><Cloud className="text-blue-400"/> Archives Cloud</h2>
                <div className="relative md:w-64"><Search className="absolute left-3 top-2.5 text-slate-500" size={16}/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-xl text-xs border-none" placeholder="Rechercher..." /></div>
              </div>
              {/* ✅ NOUVEAU: FILTRES PAR TYPE */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "Tout" },
                  { id: "facture", label: "Factures" },
                  { id: "proforma", label: "Proformas" },
                  { id: "commande", label: "Bons de Commande" },
                  { id: "livraison", label: "Bons de Livraison" },
                  { id: "attestation", label: "Attestations" }
                ].map(t => (
                  <button key={t.id} onClick={() => setArchiveTab(t.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${archiveTab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100">
                {invoiceHistory.filter(inv => (archiveTab === "all" || inv.type === archiveTab) && (inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.number?.toLowerCase().includes(searchTerm.toLowerCase()))).map(inv => (
                  <tr key={inv.db_id} className="hover:bg-blue-50/50 transition-all">
                    <td className="p-4"><div className="font-black text-slate-800 uppercase">{inv.clientName}</div><div className="text-[9px] font-bold text-slate-400">{inv.number} • {new Date(inv.date).toLocaleDateString()}</div></td>
                    <td className="p-4 text-right font-black text-blue-700">{formatCurrency(inv.total)}</td>
                    <td className="p-4 text-right"><button onClick={() => {setCurrentInvoice(inv); setView("edit")}} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FileText size={18}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Le reste de tes vues (Database, Settings, etc.) restent identiques à ton code initial... */}
      </main>
    </div>
  );
}
