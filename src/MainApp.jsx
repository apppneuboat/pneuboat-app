import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus, Trash2, Printer, Save, FileText, FolderOpen, ClipboardList,
  Database, History, Search, X, Upload, Settings, LayoutDashboard, Anchor,
  PackageCheck, ShieldCheck, LogOut, Lock, Cloud, AlertTriangle
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
  const base = "inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-sm shadow-sm active:scale-95 disabled:opacity-50";
  const styles = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-800 text-white border border-blue-900",
    secondary: "bg-white text-blue-900 border border-blue-200",
    danger: "bg-red-500 text-white",
    ghost: "text-slate-500 hover:bg-slate-100",
  };
  return <button disabled={disabled} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const InputGroup = ({ label, children }) => (
  <div className="mb-3"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">{label}</label>{children}</div>
);

const Input = (props) => (
  <input {...props} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all font-medium" />
);

/* ------------------ APP PRINCIPALE ------------------ */
export default function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState("list");
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [modelDocs, setModelDocs] = useState({});
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [printModelId, setPrintModelId] = useState(null);
  const [busy, setBusy] = useState(false);

  const [companyConfig, setCompanyConfig] = useState({
    name: "PNEUBOAT SARL", managerName: "Sekkal Gherbi Youcef", address: "Hai el Badr Oran",
    email: "info@pneuboat.net", phone: "0563269639", nextInvoiceNumber: 1, nextProformaNumber: 1, 
    nextDeliveryNumber: 1, nextAttestationNumber: 1, logo: null, boatModels: [
      { id: 1, name: "PNB-360", length: "3.60 m", approvalNumber: "N° 689", type: "Semi-rigide" },
      { id: 2, name: "PNB-420", length: "4.20 m", approvalNumber: "N° 689", type: "Semi-rigide" },
      { id: 3, name: "PNB-510", length: "5.10 m", approvalNumber: "N° 689", type: "Semi-rigide" },
      { id: 4, name: "PNB 525 OPEN", length: "5.25 m", approvalNumber: "N° 689", type: "Coque Open" },
      { id: 5, name: "PNB-550", length: "5.50 m", approvalNumber: "N° 1565", type: "Semi-rigide" },
      { id: 6, name: "PNB-650", length: "6.50 m", approvalNumber: "N° 689", type: "Semi-rigide" },
      { id: 7, name: "PNB-700", length: "7.00 m", approvalNumber: "N° 750", type: "Semi-rigide" },
    ],
  });

  /* ------------------ GESTION HISTORIQUE NAVIGATEUR (POUR BOUTON RETOUR) ------------------ */
  const changeView = useCallback((newView) => {
    setView(newView);
    // On ajoute un état dans l'historique du navigateur
    window.history.pushState({ view: newView }, "");
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      // Quand l'utilisateur appuie sur "Retour"
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView("list"); // Retour par défaut à l'accueil
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* ------------------ LOGIQUE SUPABASE ------------------ */
  useEffect(() => {
    const storedAuth = localStorage.getItem("pb_is_authenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
      setTimeout(() => loadOnlineData(), 500); 
    }
    const savedDocs = localStorage.getItem("pb_model_docs");
    if (savedDocs) setModelDocs(JSON.parse(savedDocs));
  }, []);

  const loadOnlineData = async () => {
    setBusy(true);
    try {
      const { data: configData } = await supabase.from("app_settings").select("config").limit(1).maybeSingle();
      if (configData?.config) setCompanyConfig(configData.config);
      const { data: invData } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(200);
      const mapped = (invData || []).map(row => ({ ...row.data, db_id: row.id, created_at: row.created_at }));
      setInvoiceHistory(mapped);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const saveConfigOnline = async (nc) => {
    setCompanyConfig(nc);
    const { data: existing } = await supabase.from("app_settings").select("id").limit(1);
    if (existing && existing.length > 0) await supabase.from("app_settings").update({ config: nc }).eq("id", existing[0].id);
    else await supabase.from("app_settings").insert({ config: nc });
  };

  const handleLogin = () => {
    if (passwordInput === import.meta.env.VITE_APP_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("pb_is_authenticated", "true");
      loadOnlineData();
    } else { setAuthError("Mot de passe incorrect"); }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("pb_is_authenticated");
    setPasswordInput("");
  };

  const saveInvoiceToCloud = async () => {
    if (!currentInvoice?.clientName) return alert("Nom du client ?");
    setBusy(true);
    const total = calculateTotal(currentInvoice.items, currentInvoice.tvaRate);
    const payload = { doc_number: currentInvoice.number, client_name: currentInvoice.clientName, total: total, data: { ...currentInvoice, total } };
    if (currentInvoice.db_id) {
      await supabase.from("invoices").update(payload).eq("id", currentInvoice.db_id);
    } else {
      await supabase.from("invoices").insert(payload);
      let nc = { ...companyConfig };
      const dt = currentInvoice.type;
      if (dt === "dossier") { nc.nextInvoiceNumber++; nc.nextAttestationNumber++; nc.nextDeliveryNumber++; }
      else { const keyMap = { facture: "nextInvoiceNumber", proforma: "nextProformaNumber", livraison: "nextDeliveryNumber", attestation: "nextAttestationNumber" }; nc[keyMap[dt]]++; }
      await saveConfigOnline(nc);
    }
    await loadOnlineData();
    changeView("history");
    setBusy(false);
  };

  const deleteInvoice = async (inv) => {
    if (window.confirm("Supprimer ?")) { await supabase.from("invoices").delete().eq("id", inv.db_id); loadOnlineData(); }
  };

  const startNew = (type) => {
    const year = new Date().getFullYear();
    const { nextInvoiceNumber: nf, nextAttestationNumber: na, nextDeliveryNumber: nbl, nextProformaNumber: np } = companyConfig;
    let newDoc = {
      type, date: new Date().toISOString().split("T")[0], clientName: "", clientAddress: "", clientIdNumber: "",
      items: [{ id: Date.now(), description: "", quantity: 1, price: 0 }], tvaRate: 19, showPayment: true, paymentMethod: "virement", clientChequeNumber: "",
      boatDetails: { model: "", serialNumber: "", length: "", approvalNumber: "", year: "2026", notes: "Certifié construit à neuf." },
    };
    const n = type === "facture" ? nf : type === "proforma" ? np : type === "livraison" ? nbl : na;
    const pref = type === "facture" ? "FAC" : type === "proforma" ? "PRO" : type === "livraison" ? "BL" : "ATT";
    newDoc.number = type === "dossier" ? `DOS-${year}-${String(nf).padStart(3, "0")}` : `${pref}-${year}-${String(n).padStart(3, "0")}`;
    if (type === "dossier") { newDoc.invoiceNumber = `FAC-${year}-${String(nf).padStart(3, "0")}`; newDoc.attestationNumber = `ATT-${year}-${String(na).padStart(3, "0")}`; newDoc.deliveryNumber = `BL-${year}-${String(nbl).padStart(3, "0")}`; }
    setCurrentInvoice(newDoc); changeView("edit");
  };

  const selectModel = (id) => {
    const m = companyConfig.boatModels.find((x) => x.id === parseInt(id));
    if (!m) return;
    setCurrentInvoice(p => ({ ...p, boatDetails: { ...p.boatDetails, model: m.name, length: m.length, approvalNumber: m.approvalNumber }, items: [{ ...p.items[0], description: `Bateau ${m.type} ${m.name}` }] }));
  };

  /* ------------------ RENDU DOCUMENT ------------------ */
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;
    const total = calculateTotal(currentInvoice.items, currentInvoice.tvaRate);
    const subtotal = calculateSubtotal(currentInvoice.items);
    return (
      <div className="bg-white w-[210mm] h-[297mm] p-[15mm] mx-auto shadow-2xl mb-10 text-slate-900 relative text-[12px] leading-snug font-sans flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
            <div>{companyConfig.logo ? <img src={companyConfig.logo} alt="logo" className="h-12 object-contain mb-2" /> : <h1 className="text-xl font-black uppercase">Pneuboat <span className="text-red-600">SARL</span></h1>}
            <div className="text-[10px] text-slate-500 leading-tight"><p>{companyConfig.address}</p><p>Tél: {companyConfig.phone}</p></div></div>
            <div className="text-right"><span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-900 text-[10px] font-black uppercase border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{labelDoc(subType)}</span>
            <div className="mt-2"><div className="font-mono text-sm font-bold">{docNumber}</div><div className="text-[10px] font-semibold text-slate-400">Le {new Date(currentInvoice.date).toLocaleDateString("fr-FR")}</div></div></div>
          </div>
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" /><h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Client</h3><div className="text-md font-bold uppercase truncate">{currentInvoice.clientName || "—"}</div><div className="text-[11px] text-slate-600 line-clamp-1">{currentInvoice.clientAddress || "—"}</div></div>
          <div className="min-h-[150px]">
            {subType === "attestation" ? (
              <div className="space-y-4">
                <p className="text-justify text-[11px]">Je soussigné, <b>{companyConfig.managerName}</b>, gérant de <b>{companyConfig.name}</b>, certifie que le navire a été construit à neuf dans nos ateliers pour le compte de <b>{currentInvoice.clientName || ".........."}</b>.</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden"><div className="bg-slate-900 text-white px-3 py-1 text-[9px] font-bold uppercase text-center">Fiche Technique</div><div className="p-3 grid grid-cols-2 gap-2 bg-white"><div><div className="text-[8px] text-slate-400 uppercase">Modèle</div><div className="font-bold">{currentInvoice.boatDetails.model}</div></div><div><div className="text-[8px] text-slate-400 uppercase">N° de série</div><div className="font-bold text-red-600 font-mono">{currentInvoice.boatDetails.serialNumber}</div></div></div></div>
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-slate-200 text-left text-slate-400 font-bold uppercase"><th className="py-2">Désignation</th><th className="py-2 text-center">Qté</th>{subType !== "livraison" && <><th className="py-2 text-right">P.U</th><th className="py-2 text-right">Total</th></>}</tr></thead>
                <tbody>{currentInvoice.items.map((it, i) => (<tr key={i} className="border-b border-slate-50"><td className="py-2 font-bold">{it.description}</td><td className="py-2 text-center font-bold">{it.quantity}</td>{subType !== "livraison" && <><td className="py-2 text-right">{it.price.toLocaleString()}</td><td className="py-2 text-right font-bold">{(it.quantity * it.price).toLocaleString()}</td></>}</tr>))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div>
          {subType !== "livraison" && subType !== "attestation" && <div className="flex justify-end mb-4"><div className="w-1/2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] space-y-1"><div className="flex justify-between text-slate-500"><span>Sous-total HT</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between font-black text-blue-900 text-[12px] pt-1 border-t"><span>TOTAL TTC</span><span>{formatCurrency(total)}</span></div></div></div>}
          <div className="grid grid-cols-2 gap-4 mb-4"><div className="border border-dashed border-slate-200 rounded-lg h-20 p-2 text-[9px] text-slate-400 uppercase font-bold flex flex-col justify-between">Cachet Gérant<span>....................</span></div><div className="border border-dashed border-slate-200 rounded-lg h-20 p-2 text-[9px] text-slate-400 uppercase font-bold flex flex-col justify-between">Signature Client<span>....................</span></div></div>
          <div className="border-t pt-2 text-[8px] text-slate-400 grid grid-cols-3 gap-2"><div><b>BANQUE</b> {companyConfig.bankName}<br/>RIB: {companyConfig.bankRib}</div><div><b>RC:</b> {companyConfig.rc}<br/><b>NIF:</b> {companyConfig.nif}</div><div className="text-right uppercase font-bold text-slate-900">{companyConfig.name}</div></div>
        </div>
      </div>
    );
  };

  /* ------------------ VUES ------------------ */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/50"><Anchor size={40} /></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">Pneuboat</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Accès Gestionnaire</p>
          <input className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-lg font-bold mb-4 focus:border-blue-500 outline-none transition-all" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" />
          {authError && <p className="text-red-500 text-xs font-bold mb-4">{authError}</p>}
          <Button onClick={handleLogin} className="w-full justify-center py-5 rounded-2xl text-md uppercase tracking-wider shadow-xl shadow-blue-100">Déverrouiller</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 md:pb-0 md:pl-64">
      
      {/* MENU NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full md:w-64 md:h-screen bg-slate-900 text-white z-50 no-print flex md:flex-col shadow-2xl md:shadow-none">
        <div className="hidden md:block p-8 border-b border-slate-800">
           <div className="flex items-center gap-3"><Anchor className="text-blue-500"/> <span className="text-xl font-black uppercase">Pneuboat</span></div>
        </div>
        
        <div className="flex md:flex-col flex-1 justify-around md:justify-start p-2 md:p-4 gap-1 md:gap-2">
           {[
              { id: "list", icon: <Plus/>, label: "Nouveau" },
              { id: "history", icon: <History/>, label: "Archives" },
              { id: "database", icon: <Database/>, label: "Plans" },
              { id: "settings", icon: <Settings/>, label: "Config" }
           ].map(tab => (
              <button key={tab.id} onClick={() => changeView(tab.id)} className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all ${view === tab.id || (tab.id === 'database' && view === 'print_tech_view') ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 hover:text-white"}`}>
                 <span className="md:w-5">{tab.icon}</span>
                 <span className="text-[10px] md:text-sm font-bold">{tab.label}</span>
              </button>
           ))}
           <button onClick={handleLogout} className="flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 text-red-400 md:mt-auto md:border-t md:border-slate-800">
              <LogOut size={20}/><span className="text-[10px] md:text-sm font-bold">Sortir</span>
           </button>
        </div>
      </nav>

      {/* CONTENU */}
      <main className="p-4 md:p-10 max-w-7xl mx-auto">
        
        {view === "list" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl flex justify-between items-center overflow-hidden relative">
               <div className="relative z-10">
                  <h2 className="text-2xl md:text-4xl font-black mb-2 uppercase tracking-tight">Espace Gestion</h2>
                  <p className="text-blue-400 text-xs md:text-sm font-bold uppercase tracking-[0.3em]">Chantier Naval Pneuboat</p>
               </div>
               <Anchor size={120} className="text-slate-800 absolute -right-8 -bottom-8 md:static md:opacity-10 opacity-20"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[
                  { title: "Dossier Complet", icon: <FolderOpen className="text-white"/>, action: () => startNew("dossier"), desc: "Facture + Attestation + BL", color: "bg-blue-600" },
                  { title: "Facture Client", icon: <FileText/>, action: () => startNew("facture"), desc: "Document de vente simple" },
                  { title: "Facture Proforma", icon: <ClipboardList/>, action: () => startNew("proforma"), desc: "Devis / Facture proforma" },
                  { title: "Bon de Livraison", icon: <PackageCheck/>, action: () => startNew("livraison"), desc: "Preuve de livraison" },
                  { title: "Attestation", icon: <Anchor/>, action: () => startNew("attestation"), desc: "Attestation de construction" },
               ].map((card, i) => (
                  <div key={i} onClick={card.action} className={`p-6 rounded-3xl border-2 border-white shadow-sm bg-white cursor-pointer hover:border-blue-200 transition-all flex items-center gap-5 active:scale-95`}>
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${card.color || "bg-slate-50 text-blue-600"}`}>{card.icon}</div>
                     <div><div className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1 text-sm">{card.title}</div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{card.desc}</div></div>
                  </div>
               ))}
            </div>
          </div>
        )}

        {view === "edit" && currentInvoice && (
          <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-right duration-300">
             <div className="w-full lg:w-96 bg-white rounded-[2rem] shadow-xl p-6 no-print space-y-5 border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                   <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Édition en cours</h3>
                   <button onClick={() => changeView("list")} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><X size={16}/></button>
                </div>
                
                <div className="space-y-4">
                   <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                      <InputGroup label="Client"><Input value={currentInvoice.clientName} onChange={(e) => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} placeholder="Nom complet"/></InputGroup>
                      <InputGroup label="ID / Passport"><Input value={currentInvoice.clientIdNumber} onChange={(e) => setCurrentInvoice({...currentInvoice, clientIdNumber: e.target.value})}/></InputGroup>
                   </div>

                   <div className="bg-blue-600 p-5 rounded-[1.5rem] shadow-xl shadow-blue-100 text-white space-y-3">
                      <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle size={10}/> Sélection Unité</div>
                      <select className="w-full px-4 py-3 bg-blue-700/50 border-2 border-blue-500 rounded-xl text-sm font-bold outline-none" value={companyConfig.boatModels.find(m => m.name === currentInvoice.boatDetails.model)?.id || ""} onChange={(e) => selectModel(e.target.value)}>
                         <option value="">Choisir Modèle</option>
                         {companyConfig.boatModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="w-full px-4 py-3 bg-blue-700/50 border-2 border-blue-500 rounded-xl text-sm font-bold placeholder-blue-300 outline-none" value={currentInvoice.boatDetails.serialNumber} onChange={(e) => setCurrentInvoice({...currentInvoice, boatDetails: {...currentInvoice.boatDetails, serialNumber: e.target.value.toUpperCase()}})} placeholder="Série"/>
                        <input className="w-full px-4 py-3 bg-blue-700/50 border-2 border-blue-500 rounded-xl text-sm font-bold outline-none" type="number" value={currentInvoice.items[0].price} onChange={(e) => {let ni = [...currentInvoice.items]; ni[0].price = parseFloat(e.target.value)||0; setCurrentInvoice({...currentInvoice, items: ni});}} placeholder="Prix"/>
                      </div>
                   </div>

                   <div className="flex flex-col gap-2 pt-2">
                      <Button onClick={saveInvoiceToCloud} disabled={busy} className="w-full py-4 rounded-2xl justify-center uppercase tracking-widest text-xs"><Save size={18}/> {busy ? "Envoi..." : "Sauvegarder Online"}</Button>
                      <Button onClick={() => setTimeout(()=>window.print(), 100)} variant="secondary" className="w-full py-4 rounded-2xl justify-center uppercase tracking-widest text-xs border-2 border-blue-50"><Printer size={18}/> Imprimer Direct</Button>
                   </div>
                </div>
             </div>

             <div className="flex-1 bg-slate-200 rounded-[2rem] p-4 md:p-8 overflow-auto h-[60vh] md:h-[calc(100vh-10rem)] flex justify-center shadow-inner border-4 border-white">
                <div id="printable-area" className="scale-[0.45] md:scale-90 origin-top">
                   {currentInvoice.type === "dossier" ? (
                      <div><div className="page-break"><RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} /></div><div className="page-break"><RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} /></div><div className="page-break"><RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} /></div></div>
                   ) : ( <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} /> )}
                </div>
             </div>
          </div>
        )}

        {view === "history" && (
           <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div><h2 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter"><Cloud className="text-blue-500"/> Archives Cloud</h2><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Base de données en temps réel</p></div>
                 <div className="relative md:w-80"><Search className="absolute left-4 top-3.5 text-slate-500" size={18}/><input className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nom ou N° de facture..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-50">
                       {(filteredHistory || []).map((inv) => (
                          <tr key={inv.db_id} className="hover:bg-blue-50/50 transition-all group">
                             <td className="p-5 md:p-7"><div className="font-black text-slate-800 uppercase tracking-tight">{inv.client_name}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{inv.doc_number} • {new Date(inv.created_at).toLocaleDateString()}</div></td>
                             <td className="p-5 md:p-7 text-right font-black text-blue-900">{formatCurrency(inv.total)}</td>
                             <td className="p-5 md:p-7 text-right space-x-2 whitespace-nowrap">
                                <Button variant="secondary" onClick={() => { setCurrentInvoice(inv); changeView("edit"); }} className="!p-3 border-2"><FileText size={16}/></Button>
                                <Button variant="ghost" onClick={() => deleteInvoice(inv)} className="!p-3 text-red-300 hover:text-red-600 hover:bg-red-50"><Trash2 size={16}/></Button>
                             </td>
                          </tr>
                       ))}
                       {(!filteredHistory || filteredHistory.length === 0) && (<tr><td colSpan={3} className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.2em]">Aucune donnée trouvée</td></tr>)}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {view === "database" && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
              {companyConfig.boatModels.map((m) => (
                 <div key={m.id} className="bg-white rounded-[2rem] p-6 border-2 border-white shadow-sm space-y-5">
                    <div className="flex justify-between items-start"><div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{m.name}</h3><p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em]">{m.type}</p></div><span className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-500">{m.length}</span></div>
                    <div className="grid grid-cols-2 gap-2">{["fiche", "jauge", "plan", "approbation"].map(doc => (
                       <label key={doc} className={`cursor-pointer rounded-2xl p-4 text-[9px] font-black flex items-center justify-center gap-3 border-2 transition-all ${modelDocs[m.id]?.[doc] ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-50 text-slate-400 hover:border-blue-200 hover:bg-white"}`}><Upload size={14}/> {doc.toUpperCase()}<input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocUpload(e, m.id, doc)} /></label>
                    ))}</div>
                    <Button onClick={() => { if(!modelDocs[m.id]) return alert("Aucun plan"); setPrintModelId(m.id); changeView("print_tech_view"); }} className="w-full justify-center py-4 rounded-2xl uppercase tracking-widest text-xs">Imprimer Dossier</Button>
                 </div>
              ))}
           </div>
        )}

        {view === "settings" && (
           <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-400">
              <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-100">
                 <h2 className="text-2xl font-black mb-10 flex items-center gap-4 uppercase tracking-tight"><Settings className="text-blue-600" size={28}/> Configuration</h2>
                 <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-slate-50 rounded-[2rem] mb-10">
                    <div className="w-24 h-24 bg-white rounded-[1.5rem] border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">{companyConfig.logo ? <img src={companyConfig.logo} alt="Logo" className="object-contain w-full h-full"/> : <Anchor size={32} className="text-slate-200"/>}</div>
                    <div className="text-center md:text-left"><label className="cursor-pointer bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black shadow-xl shadow-blue-200 uppercase tracking-widest inline-block mb-3">Changer le logo<input type="file" onChange={handleLogoUpload} className="hidden" /></label><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Format PNG transparent recommandé</p></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <InputGroup label="Société"><Input value={companyConfig.name} onChange={(e) => saveConfigOnline({ ...companyConfig, name: e.target.value })}/></InputGroup>
                    <InputGroup label="Gérant"><Input value={companyConfig.managerName} onChange={(e) => saveConfigOnline({ ...companyConfig, managerName: e.target.value })}/></InputGroup>
                    <div className="md:col-span-2"><InputGroup label="Adresse"><Input value={companyConfig.address} onChange={(e) => saveConfigOnline({ ...companyConfig, address: e.target.value })}/></InputGroup></div>
                    <InputGroup label="Email"><Input value={companyConfig.email} onChange={(e) => saveConfigOnline({ ...companyConfig, email: e.target.value })}/></InputGroup>
                    <InputGroup label="Téléphone"><Input value={companyConfig.phone} onChange={(e) => saveConfigOnline({ ...companyConfig, phone: e.target.value })}/></InputGroup>
                    <InputGroup label="RC"><Input value={companyConfig.rc} onChange={(e) => saveConfigOnline({ ...companyConfig, rc: e.target.value })}/></InputGroup>
                    <InputGroup label="NIF"><Input value={companyConfig.nif} onChange={(e) => saveConfigOnline({ ...companyConfig, nif: e.target.value })}/></InputGroup>
                    <InputGroup label="NIS"><Input value={companyConfig.nis} onChange={(e) => saveConfigOnline({ ...companyConfig, nis: e.target.value })}/></InputGroup>
                    <InputGroup label="Banque"><Input value={companyConfig.bankName} onChange={(e) => saveConfigOnline({ ...companyConfig, bankName: e.target.value })}/></InputGroup>
                    <div className="md:col-span-2"><InputGroup label="RIB"><Input value={companyConfig.bankRib} onChange={(e) => saveConfigOnline({ ...companyConfig, bankRib: e.target.value })}/></InputGroup></div>
                 </div>
              </div>
           </div>
        )}

        {view === "print_tech_view" && (
           <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-2xl p-6 md:p-10 border border-slate-100">
              <div className="flex justify-between items-center mb-8 no-print"><Button variant="secondary" onClick={() => changeView("database")} className="!px-6 rounded-2xl uppercase text-[10px] tracking-widest"><X size={16}/> Fermer</Button><Button onClick={() => setTimeout(()=>window.print(), 100)} className="!px-8 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200"><Printer size={16}/> Tout Imprimer</Button></div>
              <div className="space-y-10 print-area">{["fiche", "jauge", "plan", "approbation"].map((doc) => { const fileData = modelDocs[printModelId]?.[doc]; if (!fileData) return null; const isPdf = fileData.startsWith("data:application/pdf"); return (<div key={doc} className="page-break flex flex-col items-center justify-center min-h-[90vh]">{isPdf ? (<embed src={fileData} type="application/pdf" className="w-full h-[290mm]" />) : (<img src={fileData} alt={doc} className="max-w-full max-h-[290mm] object-contain" />)}</div>); })}</div>
           </div>
        )}

      </main>
    </div>
  );
}
