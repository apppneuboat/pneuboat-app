import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Printer, Save, FileText, FolderOpen, ClipboardList,
  Database, History, Search, X, Upload, Settings, LayoutDashboard, Anchor,
  PackageCheck, ShieldCheck, LogOut, User
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
    if (c > 0) res += (c === 1 ? "" : unites[c] + " ") + "cent" + (r === 0 && c > 1 ? "s" : "");
    if (r > 0) res += (res ? " " : "") + conv99(r);
    return res;
  };
  if (nombre === 0) return "zéro";
  let n = Math.floor(nombre);
  let res = "";
  if (n >= 1000000) { let m = Math.floor(n / 1000000); res += (m === 1 ? "un million" : conv999(m) + " millions") + " "; n %= 1000000; }
  if (n >= 1000) { let k = Math.floor(n / 1000); res += (k === 1 ? "mille" : conv999(k) + " mille") + " "; n %= 1000; }
  if (n > 0) res += conv999(n);

  const ent = Math.floor(nombre);
  const dec = Math.round((nombre - ent) * 100);
  let final = res.trim() + " Dinars Algériens";
  if (dec > 0) final += " et " + conv99(dec) + " Centimes";
  return final.charAt(0).toUpperCase() + final.slice(1);
};

const calculateSubtotal = (items) => (items || []).reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
const calculateTotal = (items, tvaRate) => calculateSubtotal(items) * (1 + Number(tvaRate || 0) / 100);
const formatCurrency = (amount) => Number(amount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";

// CORRECTION DES NOMS ICI
const labelDoc = (t) => {
  if (t === "facture") return "FACTURE";
  if (t === "proforma") return "FACTURE PROFORMA";
  if (t === "livraison") return "BON DE LIVRAISON";
  if (t === "attestation") return "ATTESTATION DE CONSTRUCTION";
  if (t === "dossier") return "DOSSIER COMPLET";
  return String(t || "").toUpperCase();
};

/* ------------------ UI COMPONENTS ------------------ */
const Button = ({ children, onClick, variant = "primary", className = "", disabled }) => {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all duration-200 text-sm shadow-sm active:scale-95";
  const styles = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 border border-blue-900",
    secondary: "bg-white text-blue-900 border border-blue-200 hover:bg-blue-50 hover:border-blue-300",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-red-200",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
  };
  return (
    <button disabled={disabled} onClick={onClick} className={`${base} ${styles[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
};

const InputGroup = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium" />
);

const Select = (props) => (
  <select {...props} className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium cursor-pointer">
    {props.children}
  </select>
);

/* ------------------ APP PRINCIPALE ------------------ */
export default function MainApp() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authMsg, setAuthMsg] = useState("");

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

  /* ------------------ LOGIC (Inchangé) ------------------ */
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp() {
    setAuthMsg("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPass });
    if (error) setAuthMsg(error.message);
    else setAuthMsg("Compte créé. Vérifie ton email.");
  }

  async function signIn() {
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    if (error) setAuthMsg(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setView("list");
    setCurrentInvoice(null);
  }

  const loadHistory = async () => {
    if (!session?.user) return;
    setBusy(true);
    const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(200);
    setBusy(false);
    if (error) return alert(error.message);
    const mapped = (data || []).map((row) => {
      const d = row.data || {};
      return {
        ...d, db_id: row.id, type: row.doc_type || d.type || "facture",
        number: row.number, date: row.date, clientName: row.client_name,
        clientAddress: row.client_address, clientIdNumber: row.client_id_number,
        tvaRate: Number(row.tva_rate ?? d.tvaRate ?? 19),
        items: d.items || [{ id: Date.now(), description: "", quantity: 1, price: 0 }],
        boatDetails: d.boatDetails || { model: "", serialNumber: "", length: "", approvalNumber: "", year: "2026", notes: "Je certifie que le navire a été construit à neuf selon les spécifications techniques." },
        showPayment: d.showPayment ?? true, paymentMethod: d.paymentMethod || "virement", clientChequeNumber: d.clientChequeNumber || "",
        invoiceNumber: d.invoiceNumber, attestationNumber: d.attestationNumber, deliveryNumber: d.deliveryNumber,
      };
    });
    setInvoiceHistory(mapped);
  };

  useEffect(() => { if (session?.user) loadHistory(); }, [session?.user?.id]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { const nc = { ...companyConfig, logo: reader.result }; setCompanyConfig(nc); saveLocal(nc, modelDocs); };
    reader.readAsDataURL(file);
  };

  const handleDocUpload = (e, modelId, docKey) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { const next = { ...modelDocs, [modelId]: { ...(modelDocs[modelId] || {}), [docKey]: reader.result } }; setModelDocs(next); saveLocal(companyConfig, next); };
    reader.readAsDataURL(file);
  };

  const startNew = (type) => {
    const year = new Date().getFullYear();
    const { nextInvoiceNumber: nf, nextAttestationNumber: na, nextDeliveryNumber: nbl, nextProformaNumber: np } = companyConfig;
    let newDoc = {
      id: Date.now(), type, date: new Date().toISOString().split("T")[0],
      clientName: "", clientAddress: "", clientIdNumber: "",
      items: [{ id: Date.now(), description: "", quantity: 1, price: 0 }],
      tvaRate: 19, showPayment: true, paymentMethod: "virement", clientChequeNumber: "",
      boatDetails: { model: "", serialNumber: "", length: "", approvalNumber: "", year: "2026", notes: "Je certifie que le navire a été construit à neuf selon les spécifications techniques." },
    };
    if (type === "dossier") {
      newDoc.number = `DOS-${year}-${String(nf).padStart(3, "0")}`; newDoc.invoiceNumber = `FAC-${year}-${String(nf).padStart(3, "0")}`;
      newDoc.attestationNumber = `ATT-${year}-${String(na).padStart(3, "0")}`; newDoc.deliveryNumber = `BL-${year}-${String(nbl).padStart(3, "0")}`;
    } else {
      let pref = type === "facture" ? "FAC" : type === "proforma" ? "PRO" : type === "livraison" ? "BL" : "ATT";
      let num = type === "facture" ? nf : type === "proforma" ? np : type === "livraison" ? nbl : na;
      newDoc.number = `${pref}-${year}-${String(num).padStart(3, "0")}`;
    }
    setCurrentInvoice(newDoc); setView("edit");
  };

  const selectModel = (id) => {
    const m = companyConfig.boatModels.find((x) => x.id === parseInt(id));
    if (!m || !currentInvoice) return;
    const designation = `Bateau ${String(m.type || "").toLowerCase()} ${m.name}`.replace(/\s+/g, " ").trim();
    setCurrentInvoice((prev) => ({ ...prev, boatDetails: { ...prev.boatDetails, model: m.name, length: m.length, approvalNumber: m.approvalNumber }, items: [{ ...prev.items[0], description: designation }] }));
  };

  const saveInvoice = async () => {
    if (!session?.user) return; if (!currentInvoice?.clientName) return alert("Nom du client ?");
    setBusy(true);
    const subtotal = calculateSubtotal(currentInvoice.items || []);
    const total = calculateTotal(currentInvoice.items || [], Number(currentInvoice.tvaRate || 0));
    const doc_type = currentInvoice.type || "facture";
    const payload = {
      user_id: session.user.id, doc_type, number: currentInvoice.number, date: currentInvoice.date,
      client_name: currentInvoice.clientName, client_address: currentInvoice.clientAddress || "",
      client_id_number: currentInvoice.clientIdNumber || "", tva_rate: Number(currentInvoice.tvaRate || 0),
      subtotal, tva_amount: subtotal * (Number(currentInvoice.tvaRate || 0) / 100), total, data: { ...currentInvoice },
    };
    let invoiceId = currentInvoice.db_id || null;
    if (!invoiceId) {
      const { data, error } = await supabase.from("invoices").insert(payload).select("id").single();
      if (error) { setBusy(false); return alert(error.message); } invoiceId = data.id;
    } else {
      const { error } = await supabase.from("invoices").update(payload).eq("id", invoiceId);
      if (error) { setBusy(false); return alert(error.message); }
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
    }
    if (!currentInvoice.db_id) {
      let newConfig = { ...companyConfig };
      if (doc_type === "dossier") { newConfig.nextInvoiceNumber += 1; newConfig.nextAttestationNumber += 1; newConfig.nextDeliveryNumber += 1; }
      else { const keyMap = { facture: "nextInvoiceNumber", proforma: "nextProformaNumber", livraison: "nextDeliveryNumber", attestation: "nextAttestationNumber" }; newConfig[keyMap[doc_type]] += 1; }
      setCompanyConfig(newConfig); saveLocal(newConfig, modelDocs);
    }
    setBusy(false); await loadHistory(); setView("history");
  };

  const deleteInvoice = async (inv) => {
    if (!inv?.db_id) return; if (!window.confirm("Supprimer ?")) return;
    setBusy(true); const { error } = await supabase.from("invoices").delete().eq("id", inv.db_id);
    setBusy(false); if (error) return alert(error.message); await loadHistory();
  };

  const handlePrint = () => { setTimeout(() => window.print(), 50); };

  /* ------------------ RENDU DOCUMENT A4 (DESIGN PAPIER) ------------------ */
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;
    const total = calculateTotal(currentInvoice.items, currentInvoice.tvaRate);
    const subtotal = calculateSubtotal(currentInvoice.items);
    const tvaAmt = subtotal * (Number(currentInvoice.tvaRate || 0) / 100);
    const isAtt = subType === "attestation"; const isBL = subType === "livraison";
    const isFactOrPro = subType === "facture" || subType === "proforma";
    const paymentLabel = currentInvoice.paymentMethod === "virement" ? "Virement bancaire" : currentInvoice.paymentMethod === "espece" ? "Espèces" : "Chèque";

    return (
      <div className="print-area bg-white w-[210mm] min-h-[297mm] p-[20mm] mx-auto shadow-2xl mb-10 text-slate-900 relative text-sm leading-normal font-sans">
        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
          <div className="w-7/12">
            {companyConfig.logo ? ( <img src={companyConfig.logo} alt="logo" className="h-16 object-contain mb-3" /> ) : (
              <div className="mb-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Pneuboat <span className="text-red-600">SARL</span></h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{companyConfig.footerText}</p>
              </div>
            )}
            <div className="text-xs text-slate-500 font-medium leading-relaxed">
              <p>{companyConfig.address}</p><p>Tél: {companyConfig.phone} • Email: {companyConfig.email}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-black uppercase tracking-wider border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-red-500" />{labelDoc(subType)}
            </span>
            <div className="mt-3"><div className="font-mono text-lg font-bold text-slate-900">{docNumber}</div><div className="text-xs font-semibold text-slate-400">Fait le {new Date(currentInvoice.date).toLocaleDateString("fr-FR")}</div></div>
          </div>
        </div>
        <div className="mb-8">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-900 to-blue-600" />
            <div className="pl-3">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Client</h3>
              <div className="text-lg font-bold text-slate-900 uppercase">{currentInvoice.clientName || "—"}</div>
              <div className="text-sm text-slate-600 font-medium mt-1 leading-snug max-w-md">{currentInvoice.clientAddress || "—"}</div>
              {currentInvoice.clientIdNumber && ( <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm"><ShieldCheck size={12} className="text-blue-700" /><span className="text-xs font-bold text-slate-700">ID: <span className="font-mono text-red-600">{currentInvoice.clientIdNumber}</span></span></div> )}
            </div>
          </div>
        </div>
        <div className="min-h-[300px]">
          {isAtt ? (
            <div className="space-y-6">
              <p className="text-justify leading-relaxed text-slate-700">Je soussigné, <b className="text-slate-900">{companyConfig.managerName}</b>, gérant de la société <b className="text-slate-900">{companyConfig.name}</b>, certifie par la présente que le navire désigné ci-après a été entièrement construit à neuf dans nos ateliers pour le compte de <b className="text-slate-900 uppercase">{currentInvoice.clientName || ".........."}</b>.</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-center">Fiche Technique</div>
                <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-8 bg-white">
                  <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modèle</div><div className="font-bold text-slate-900">{currentInvoice.boatDetails.model}</div></div>
                  <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N° de série</div><div className="font-bold text-red-600 font-mono">{currentInvoice.boatDetails.serialNumber}</div></div>
                  <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Année</div><div className="font-bold text-slate-900">2026</div></div>
                  <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Homologation</div><div className="font-bold text-slate-900">{currentInvoice.boatDetails.approvalNumber}</div></div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 italic">Notes : {currentInvoice.boatDetails.notes}</div>
            </div>
          ) : (
            <div>
              <table className="w-full border-collapse">
                <thead><tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"><th className="py-3 pl-2">Désignation</th><th className="py-3 text-center w-20">Qté</th>{!isBL && (<><th className="py-3 text-right w-32">P.U</th><th className="py-3 text-right w-32">Total</th></>)}</tr></thead>
                <tbody className="text-sm">{(currentInvoice.items || []).map((it, i) => (<tr key={it.id || i} className="border-b border-slate-50"><td className="py-3 pl-2"><div className="font-bold text-slate-900">{it.description || "—"}</div>{i === 0 && currentInvoice.boatDetails?.serialNumber && (<div className="text-xs text-slate-500 mt-1 font-medium">N/S: <span className="font-mono text-red-600">{currentInvoice.boatDetails.serialNumber}</span></div>)}</td><td className="py-3 text-center font-bold text-slate-700">{Number(it.quantity || 0)}</td>{!isBL && (<><td className="py-3 text-right text-slate-500 font-medium">{Number(it.price || 0).toLocaleString("fr-FR")}</td><td className="py-3 text-right font-bold text-slate-900">{(Number(it.quantity || 0) * Number(it.price || 0)).toLocaleString("fr-FR")}</td></>)}</tr>))}</tbody>
              </table>
              {!isBL && (<div className="mt-8 flex justify-end"><div className="w-1/2 bg-slate-50 rounded-xl p-4 border border-slate-200 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-900 to-red-500" /><div className="pl-2 space-y-2"><div className="flex justify-between text-xs font-semibold text-slate-500"><span>Sous-total (HT)</span><span className="text-slate-900 font-bold">{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-xs font-semibold text-slate-500"><span>TVA ({currentInvoice.tvaRate}%)</span><span className="text-slate-900 font-bold">{formatCurrency(tvaAmt)}</span></div><div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-sm font-black text-slate-900"><span>TOTAL TTC</span><span className="text-blue-900">{formatCurrency(total)}</span></div></div></div></div>)}
              {isFactOrPro && (<div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-center"><div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Arrêté la présente facture à la somme de</div><div className="font-black text-slate-800 text-sm capitalize">{NumberToLetter(total)}</div></div>)}
              {!isBL && currentInvoice.showPayment && (<div className="mt-6 border-t border-dashed border-slate-200 pt-4"><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Conditions de règlement</div><div className="flex items-center gap-4 text-xs font-medium text-slate-700"><span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">{paymentLabel}</span>{currentInvoice.paymentMethod === "cheque" && (<span>N° Chèque : <span className="font-mono font-bold text-slate-900">{currentInvoice.clientChequeNumber || "—"}</span></span>)}</div></div>)}
            </div>
          )}
        </div>
        <div className="mt-12 mb-6 grid grid-cols-2 gap-8">
          <div className="border-2 border-dashed border-slate-300 rounded-xl h-32 p-4 flex flex-col justify-between"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cachet & Signature Gérant</span><span className="text-[10px] text-slate-300 text-center font-bold italic">Tampon ici</span></div>
          <div className="border-2 border-dashed border-slate-300 rounded-xl h-32 p-4 flex flex-col justify-between"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Signature Client</span><span className="text-[10px] text-slate-300 text-center font-bold italic">Lu et approuvé</span></div>
        </div>
        <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 leading-tight grid grid-cols-3 gap-4"><div><b className="block text-slate-900 mb-1">BANQUE</b>{companyConfig.bankName}<br/>RIB: <span className="font-mono text-slate-700">{companyConfig.bankRib}</span></div><div><b className="block text-slate-900 mb-1">FISCAL</b>RC: {companyConfig.rc}<br/>NIF: {companyConfig.nif}<br/>NIS: {companyConfig.nis}</div><div className="text-right"><b className="block text-slate-900 mb-1">{companyConfig.name}</b>Capital social: {companyConfig.capital}</div></div>
      </div>
    );
  };

  const filteredHistory = useMemo(() => { const q = (searchTerm || "").toLowerCase().trim(); if (!q) return invoiceHistory; return invoiceHistory.filter((i) => (i.clientName || "").toLowerCase().includes(q) || (i.number || "").toLowerCase().includes(q)); }, [invoiceHistory, searchTerm]);

  /* ------------------ VUES ------------------ */
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/50"><Anchor size={28} /></div>
            <div><h1 className="text-2xl font-black text-slate-900">Pneuboat</h1><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Administration</p></div>
          </div>
          <div className="space-y-4">
             <InputGroup label="Email"><Input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="admin@pneuboat.net" /></InputGroup>
             <InputGroup label="Mot de passe"><Input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} placeholder="••••••••" /></InputGroup>
            {authMsg && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg text-center">{authMsg}</div>}
            <div className="flex gap-3 pt-2"><Button onClick={signIn} className="w-full justify-center py-3 shadow-lg shadow-blue-200">Se connecter</Button><Button onClick={signUp} variant="secondary" className="w-full justify-center py-3">Créer compte</Button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans text-slate-900">
      
      {/* SIDEBAR NAVIGATION (NO PRINT) */}
      <nav className="w-64 bg-slate-900 text-white flex-col hidden md:flex no-print h-screen sticky top-0 overflow-y-auto">
        <div className="p-6">
           <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setView("list")}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50"><Anchor size={20} /></div>
              <span className="text-xl font-black tracking-tight">Pneuboat</span>
           </div>
           
           <div className="space-y-2">
              {[
                 { id: "list", icon: <LayoutDashboard size={18} />, label: "Tableau de bord" },
                 { id: "history", icon: <History size={18} />, label: "Historique" },
                 { id: "database", icon: <Database size={18} />, label: "Base & Plans" },
                 { id: "settings", icon: <Settings size={18} />, label: "Configuration" }
              ].map(tab => (
                 <button key={tab.id} onClick={() => setView(tab.id)} className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${view === tab.id || (tab.id === 'database' && view === 'print_tech_view') ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                    {tab.icon} {tab.label}
                 </button>
              ))}
           </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-200"><User size={14}/></div>
              <div className="overflow-hidden"><div className="text-xs font-bold text-white truncate">{session.user.email}</div><div className="text-[10px] font-bold text-green-400 uppercase">En ligne</div></div>
           </div>
           <button onClick={signOut} className="w-full py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-red-900/50 hover:text-red-200 transition-colors flex items-center justify-center gap-2">
              <LogOut size={14} /> Déconnexion
           </button>
        </div>
      </nav>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 p-4 flex justify-between items-center no-print shadow-md">
         <span className="font-black text-lg">Pneuboat</span>
         <button onClick={() => setView(view === 'list' ? 'history' : 'list')}><LayoutDashboard/></button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 w-full bg-[#f8fafc] p-4 md:p-8 pt-20 md:pt-8 min-h-screen">
        
        {/* VUE: ACCUEIL */}
        {view === "list" && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
               <div className="absolute right-0 top-0 h-full w-2/3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <h2 className="text-3xl font-black mb-2 relative z-10">Bonjour, Gérant 👋</h2>
               <p className="text-blue-100 font-medium relative z-10">Sélectionnez un document pour commencer la rédaction.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
               {[
                  { title: "Dossier Complet", icon: <FolderOpen size={24}/>, action: () => startNew("dossier"), primary: true },
                  { title: "Facture", icon: <FileText size={24}/>, action: () => startNew("facture") },
                  { title: "Proforma", icon: <ClipboardList size={24}/>, action: () => startNew("proforma") },
                  { title: "Bon de Livraison", icon: <PackageCheck size={24}/>, action: () => startNew("livraison") },
                  { title: "Attestation de Construction", icon: <Anchor size={24}/>, action: () => startNew("attestation") },
               ].map((card, i) => (
                  <div key={i} onClick={card.action} className={`group cursor-pointer rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col items-center justify-center gap-4 text-center h-48 bg-white ${card.primary ? "border-blue-300 shadow-md ring-4 ring-blue-50" : "border-slate-200 shadow-sm hover:border-blue-300"}`}>
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${card.primary ? "bg-blue-600 text-white group-hover:bg-blue-700" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"}`}>
                        {card.icon}
                     </div>
                     <span className="font-bold text-slate-700 group-hover:text-blue-900">{card.title}</span>
                  </div>
               ))}
            </div>
          </div>
        )}

        {/* VUE: ÉDITION */}
        {view === "edit" && currentInvoice && (
          <div className="flex flex-col xl:flex-row gap-6 items-start h-full">
             
             {/* --- COLONNE GAUCHE: FORMULAIRE (Fond coloré modifié) --- */}
             <div className="w-full xl:w-[400px] bg-slate-100 rounded-2xl shadow-lg border border-slate-200 p-6 no-print flex flex-col h-[calc(100vh-4rem)] sticky top-4">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                   <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><div className="w-2 h-6 bg-blue-600 rounded-full"/> Édition</h3>
                   <button onClick={() => setView("history")} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"><X size={18}/></button>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-6">
                   <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <InputGroup label="Client"><Input value={currentInvoice.clientName} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientName: e.target.value })} placeholder="Nom du client" /></InputGroup>
                      <InputGroup label="Adresse"><textarea className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium resize-none" rows={2} value={currentInvoice.clientAddress} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientAddress: e.target.value })} placeholder="Adresse..." /></InputGroup>
                      <InputGroup label="ID / Passeport"><Input value={currentInvoice.clientIdNumber} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientIdNumber: e.target.value })} /></InputGroup>
                   </div>

                   <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                      <div className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><Anchor size={14} className="text-blue-600"/> Navire</div>
                      <InputGroup label="Modèle">
                         <Select value={companyConfig.boatModels.find((m) => m.name === currentInvoice.boatDetails.model)?.id || ""} onChange={(e) => selectModel(e.target.value)}>
                            <option value="">— Choisir Modèle —</option>{companyConfig.boatModels.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                         </Select>
                      </InputGroup>
                      <div className="grid grid-cols-2 gap-3">
                         <InputGroup label="N° Série"><Input value={currentInvoice.boatDetails.serialNumber} onChange={(e) => setCurrentInvoice({ ...currentInvoice, boatDetails: { ...currentInvoice.boatDetails, serialNumber: e.target.value.toUpperCase() } })} placeholder="DZ-PNB..." /></InputGroup>
                         <InputGroup label="Prix (DA)"><Input type="number" value={currentInvoice.items?.[0]?.price || 0} onChange={(e) => { const ni = [...currentInvoice.items]; ni[0] = { ...ni[0], price: parseFloat(e.target.value) || 0 }; setCurrentInvoice({ ...currentInvoice, items: ni }); }} /></InputGroup>
                      </div>
                      <InputGroup label="TVA (%)"><Input type="number" value={currentInvoice.tvaRate} onChange={(e) => setCurrentInvoice({ ...currentInvoice, tvaRate: Number(e.target.value || 0) })} /></InputGroup>
                   </div>

                   <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-3"><span className="font-bold text-slate-800 text-sm uppercase tracking-wider">Paiement</span><label className="flex items-center gap-2 text-xs font-bold text-blue-600 cursor-pointer"><input type="checkbox" checked={!!currentInvoice.showPayment} onChange={(e) => setCurrentInvoice({ ...currentInvoice, showPayment: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" /> Afficher</label></div>
                      <InputGroup label="Méthode"><Select value={currentInvoice.paymentMethod} onChange={(e) => setCurrentInvoice({ ...currentInvoice, paymentMethod: e.target.value, clientChequeNumber: e.target.value === "cheque" ? currentInvoice.clientChequeNumber : "" })}><option value="virement">Virement Bancaire</option><option value="espece">Espèces</option><option value="cheque">Chèque</option></Select></InputGroup>
                      {currentInvoice.paymentMethod === "cheque" && (<InputGroup label="N° Chèque"><Input value={currentInvoice.clientChequeNumber} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientChequeNumber: e.target.value })} placeholder="000000" /></InputGroup>)}
                   </div>
                </div>

                <div className="pt-4 mt-auto border-t border-slate-200 grid grid-cols-2 gap-3">
                    <Button onClick={saveInvoice} disabled={busy} className="justify-center py-3 shadow-lg shadow-blue-200"><Save size={18}/> {busy ? "..." : "Enregistrer"}</Button>
                    <Button onClick={handlePrint} variant="secondary" className="justify-center py-3"><Printer size={18}/> Imprimer</Button>
                </div>
             </div>

             {/* Colonne Droite: Prévisualisation */}
             <div className="flex-1 w-full bg-slate-200 rounded-2xl p-8 border border-slate-300 shadow-inner overflow-auto flex justify-center custom-scrollbar h-[calc(100vh-4rem)]">
                <div id="printable-area" className="scale-90 origin-top">
                   {/* MODIFICATION ICI: Wrapper page-break pour séparer les feuilles */}
                   {currentInvoice.type === "dossier" ? (
                      <div>
                         <div className="page-break"><RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} /></div>
                         <div className="page-break"><RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} /></div>
                         <div className="page-break"><RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} /></div>
                      </div>
                   ) : ( 
                      <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} /> 
                   )}
                </div>
             </div>
          </div>
        )}

        {/* VUE: HISTORIQUE */}
        {view === "history" && (
          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-800">Historique des documents</h2>
                <div className="flex gap-2 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 text-blue-300" size={16}/><input className="w-full pl-9 pr-4 py-2 bg-white border-2 border-blue-50 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                   <Button variant="secondary" onClick={loadHistory} disabled={busy}>Actualiser</Button>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                   <thead className="bg-blue-50/50 text-xs uppercase font-bold text-blue-800"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Ref</th><th className="px-6 py-4">Client</th><th className="px-6 py-4 text-right">Montant</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((inv) => (
                         <tr key={inv.db_id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4 font-medium text-slate-500">{inv.date}</td>
                            <td className="px-6 py-4"><span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded group-hover:bg-white group-hover:text-blue-600 transition-colors">{inv.number}</span></td>
                            <td className="px-6 py-4 font-bold text-slate-900">{inv.clientName}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(calculateTotal(inv.items, inv.tvaRate))}</td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2"><Button variant="secondary" onClick={() => { setCurrentInvoice(inv); setView("edit"); }} className="!px-3 !py-1.5"><FileText size={14}/> Ouvrir</Button><Button variant="ghost" onClick={() => deleteInvoice(inv)} className="!px-2 !py-1.5 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></Button></td>
                         </tr>
                      ))}
                      {filteredHistory.length === 0 && (<tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Aucun document trouvé.</td></tr>)}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* VUE: PLANS */}
        {view === "database" && (
           <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companyConfig.boatModels.map((m) => (
                 <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="flex justify-between items-start">
                       <div><h3 className="font-black text-lg text-slate-900 group-hover:text-blue-800 transition-colors">{m.name}</h3><p className="text-xs font-bold text-slate-400 uppercase">{m.type}</p></div>
                       <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{m.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       {["fiche", "jauge", "plan", "approbation"].map((doc) => (
                          <label key={doc} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-2 border transition-all ${modelDocs[m.id]?.[doc] ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50"}`}><Upload size={14}/><span className="capitalize">{doc}</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocUpload(e, m.id, doc)} /></label>
                       ))}
                    </div>
                    <Button onClick={() => { if (!modelDocs[m.id]) return alert("Aucun plan."); setPrintModelId(m.id); setView("print_tech_view"); }} className="w-full justify-center mt-auto shadow-md shadow-blue-100">Imprimer Dossier</Button>
                 </div>
              ))}
           </div>
        )}

        {/* VUE: IMPRESSION PLANS */}
        {view === "print_tech_view" && (
           <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex justify-between items-center mb-8 no-print border-b border-slate-100 pb-4">
                 <h2 className="text-2xl font-black text-slate-900">Dossier Technique</h2>
                 <div className="flex gap-2"><Button variant="secondary" onClick={() => setView("database")}>Retour</Button><Button onClick={handlePrint}>Imprimer</Button></div>
              </div>
              <div className="space-y-12 print-area">{["fiche", "jauge", "plan", "approbation"].map((doc) => modelDocs[printModelId]?.[doc] && (<div key={doc} className="page-break flex flex-col items-center justify-center min-h-[90vh]"><img src={modelDocs[printModelId][doc]} alt={doc} className="max-w-full max-h-[250mm] object-contain" /></div>))}</div>
           </div>
        )}

        {/* VUE: CONFIG */}
        {view === "settings" && (
           <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><Settings className="text-blue-600"/> Paramètres</h2>
              <div className="space-y-6">
                 <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">{companyConfig.logo ? <img src={companyConfig.logo} alt="Logo" className="object-contain w-full h-full"/> : <span className="text-xs font-bold text-slate-300">LOGO</span>}</div>
                    <div><label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-blue-200 transition-all">Changer le logo<input type="file" onChange={handleLogoUpload} className="hidden" /></label><p className="text-[10px] text-slate-400 mt-2 font-medium">Recommandé : PNG transparent.</p></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup label="Gérant"><Input value={companyConfig.managerName} onChange={(e) => {const nc = { ...companyConfig, managerName: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs);}} /></InputGroup>
                    <InputGroup label="Banque"><Input value={companyConfig.bankName} onChange={(e) => {const nc = { ...companyConfig, bankName: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs);}} /></InputGroup>
                    <InputGroup label="RIB"><Input value={companyConfig.bankRib} onChange={(e) => {const nc = { ...companyConfig, bankRib: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs);}} /></InputGroup>
                    <InputGroup label="N° RC"><Input value={companyConfig.rc} onChange={(e) => {const nc = { ...companyConfig, rc: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs);}} /></InputGroup>
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}
