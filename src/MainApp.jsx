import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Printer, Save, FileText, FolderOpen, ClipboardList,
  Database, History, Search, X, Upload, Settings, LayoutDashboard, Anchor,
  PackageCheck, ShieldCheck, LogOut, Lock, Cloud
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
  return "DOCUMENT";
};

/* ------------------ UI COMPONENTS ------------------ */
const Button = ({ children, onClick, variant = "primary", className = "", disabled }) => {
  const base = "inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-sm active:scale-95 disabled:opacity-50";
  const styles = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-200",
    secondary: "bg-white text-blue-900 border border-blue-100",
    danger: "bg-red-50 text-red-600",
    ghost: "text-slate-400 hover:bg-slate-100",
  };
  return <button disabled={disabled} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const Input = (props) => (
  <input {...props} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm text-slate-900 focus:border-blue-500 outline-none transition-all" />
);

/* ------------------ APP PRINCIPALE ------------------ */
export default function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("pb_auth") === "true");
  const [passwordInput, setPasswordInput] = useState("");
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
      { id: 1, name: "PNB-360", length: "3.60 m", type: "Semi-rigide" },
      { id: 2, name: "PNB-420", length: "4.20 m", type: "Semi-rigide" },
      { id: 3, name: "PNB-510", length: "5.10 m", type: "Semi-rigide" },
      { id: 4, name: "PNB 525 OPEN", length: "5.25 m", type: "Coque Open" },
      { id: 5, name: "PNB-550", length: "5.50 m", type: "Semi-rigide" },
      { id: 6, name: "PNB-650", length: "6.50 m", type: "Semi-rigide" },
      { id: 7, name: "PNB-700", length: "7.00 m", type: "Semi-rigide" },
    ],
  });

  // CHARGEMENT INITIAL
  useEffect(() => {
    if (isAuthenticated) loadData();
    const savedDocs = localStorage.getItem("pb_docs");
    if (savedDocs) setModelDocs(JSON.parse(savedDocs));
  }, [isAuthenticated]);

  const loadData = async () => {
    setBusy(true);
    try {
      const { data: cfg } = await supabase.from("app_settings").select("config").limit(1).maybeSingle();
      if (cfg?.config) setCompanyConfig(cfg.config);
      
      const { data: invs } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      setInvoiceHistory(invs || []);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleLogin = () => {
    if (passwordInput === import.meta.env.VITE_APP_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("pb_auth", "true");
    } else { alert("Mot de passe faux"); }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("pb_auth");
  };

  const saveConfig = async (nc) => {
    setCompanyConfig(nc);
    const { data: ex } = await supabase.from("app_settings").select("id").limit(1);
    if (ex?.length > 0) await supabase.from("app_settings").update({ config: nc }).eq("id", ex[0].id);
    else await supabase.from("app_settings").insert({ config: nc });
  };

  const saveInvoice = async () => {
    if (!currentInvoice?.clientName) return alert("Nom client ?");
    setBusy(true);
    const total = calculateTotal(currentInvoice.items, currentInvoice.tvaRate);
    const payload = { doc_number: currentInvoice.number, client_name: currentInvoice.clientName, total, data: { ...currentInvoice, total } };
    
    if (currentInvoice.db_id) {
      await supabase.from("invoices").update(payload).eq("id", currentInvoice.db_id);
    } else {
      await supabase.from("invoices").insert(payload);
      let nc = { ...companyConfig };
      if (currentInvoice.type === "dossier") { nc.nextInvoiceNumber++; nc.nextAttestationNumber++; nc.nextDeliveryNumber++; }
      else {
        if (currentInvoice.type === "facture") nc.nextInvoiceNumber++;
        if (currentInvoice.type === "proforma") nc.nextProformaNumber++;
        if (currentInvoice.type === "livraison") nc.nextDeliveryNumber++;
        if (currentInvoice.type === "attestation") nc.nextAttestationNumber++;
      }
      await saveConfig(nc);
    }
    await loadData();
    setView("history");
    setBusy(false);
  };

  const startNew = (type) => {
    const year = new Date().getFullYear();
    const { nextInvoiceNumber: nf, nextAttestationNumber: na, nextDeliveryNumber: nbl, nextProformaNumber: np } = companyConfig;
    let n = (type === "facture" || type === "dossier") ? nf : type === "proforma" ? np : type === "livraison" ? nbl : na;
    let pref = type === "facture" ? "FAC" : type === "proforma" ? "PRO" : type === "livraison" ? "BL" : type === "attestation" ? "ATT" : "DOS";
    
    setCurrentInvoice({
      type, date: new Date().toISOString().split("T")[0], clientName: "", clientAddress: "",
      number: `${pref}-${year}-${String(n).padStart(3, "0")}`,
      items: [{ id: Date.now(), description: "", quantity: 1, price: 0 }], tvaRate: 19,
      boatDetails: { model: "", serialNumber: "", length: "", approvalNumber: "", notes: "Construit à neuf." },
      invoiceNumber: `FAC-${year}-${String(nf).padStart(3, "0")}`,
      attestationNumber: `ATT-${year}-${String(na).padStart(3, "0")}`,
      deliveryNumber: `BL-${year}-${String(nbl).padStart(3, "0")}`
    });
    setView("edit");
  };

  const filteredHistory = useMemo(() => {
    return (invoiceHistory || []).filter(i => 
      i.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.doc_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoiceHistory, searchTerm]);

  /* ------------------ RENDU ------------------ */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white mb-6"><Anchor size={40}/></div>
          <h1 className="text-2xl font-black mb-8 uppercase">Pneuboat</h1>
          <input className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-lg font-bold mb-4 outline-none focus:border-blue-500" type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Mot de passe" />
          <Button onClick={handleLogin} className="w-full justify-center py-4">Déverrouiller</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-0 md:pl-64">
      {/* MENU NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full md:w-64 md:h-screen bg-slate-900 text-white z-50 no-print flex md:flex-col shadow-2xl">
        <div className="hidden md:block p-8 border-b border-slate-800"><div className="flex items-center gap-3"><Anchor className="text-blue-500"/><span className="text-xl font-black uppercase">Pneuboat</span></div></div>
        <div className="flex md:flex-col flex-1 justify-around md:justify-start p-2 md:p-4 gap-2">
          {[
            { id: "list", icon: <Plus/>, label: "Nouveau" },
            { id: "history", icon: <History/>, label: "Archives" },
            { id: "database", icon: <Database/>, label: "Plans" },
            { id: "settings", icon: <Settings/>, label: "Config" }
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all ${view === t.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}>
              {t.icon}<span className="text-[10px] md:text-sm font-bold">{t.label}</span>
            </button>
          ))}
          <button onClick={handleLogout} className="flex flex-col md:flex-row items-center gap-1 p-2 text-red-400 md:mt-auto"><LogOut size={20}/><span className="text-[10px] md:text-sm font-bold">Sortir</span></button>
        </div>
      </nav>

      {/* CONTENU SECTIONNÉ */}
      <main className="p-4 md:p-10 max-w-7xl mx-auto">
        
        {/* LISTE ACCUEIL */}
        {view === "list" && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex justify-between items-center relative overflow-hidden shadow-xl">
               <div className="relative z-10"><h2 className="text-2xl md:text-4xl font-black mb-1 uppercase">Pneuboat</h2><p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Logiciel de gestion</p></div>
               <Anchor size={80} className="text-slate-800 absolute -right-4 -bottom-4 opacity-50"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[{ t: "Dossier Complet", id: "dossier", icon: <FolderOpen/>, c: "bg-blue-600 text-white" }, { t: "Facture Client", id: "facture", icon: <FileText/> }, { t: "Facture Proforma", id: "proforma", icon: <ClipboardList/> }, { t: "Bon de Livraison", id: "livraison", icon: <PackageCheck/> }, { t: "Attestation", id: "attestation", icon: <Anchor/> }].map((item, i) => (
                  <div key={i} onClick={() => startNew(item.id)} className={`p-6 rounded-3xl border-2 border-white shadow-sm bg-white cursor-pointer hover:border-blue-200 flex items-center gap-5 active:scale-95`}>
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.c || "bg-slate-50 text-blue-600"}`}>{item.icon}</div>
                     <div className="font-black text-slate-800 uppercase text-sm">{item.t}</div>
                  </div>
               ))}
            </div>
          </div>
        )}

        {/* HISTORIQUE (ARCHIVES) */}
        {view === "history" && (
           <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between gap-4">
                 <h2 className="text-xl font-black uppercase flex items-center gap-3"><Cloud className="text-blue-500"/> Archives Cloud</h2>
                 <input className="px-4 py-3 bg-slate-800 rounded-2xl text-sm font-bold outline-none" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-50">
                       {filteredHistory.map((inv) => (
                          <tr key={inv.db_id} className="hover:bg-blue-50/50">
                             <td className="p-5 font-black text-slate-800 uppercase">{inv.client_name} <div className="text-[9px] text-slate-400">{inv.doc_number}</div></td>
                             <td className="p-5 text-right font-black text-blue-900">{formatCurrency(inv.total)}</td>
                             <td className="p-5 text-right space-x-2">
                                <Button variant="secondary" onClick={() => { setCurrentInvoice({...inv.data, db_id: inv.id}); setView("edit"); }} className="!p-3"><FileText size={16}/></Button>
                                <Button variant="ghost" onClick={() => deleteInvoice(inv)} className="!p-3 text-red-300 hover:text-red-500"><Trash2 size={16}/></Button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* ÉDITION */}
        {view === "edit" && currentInvoice && (
          <div className="flex flex-col lg:flex-row gap-6">
             <div className="w-full lg:w-96 bg-slate-100 rounded-[2rem] p-6 no-print space-y-4">
                <Input value={currentInvoice.clientName} onChange={e => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} placeholder="Nom Client" />
                <div className="bg-blue-600 p-5 rounded-[1.5rem] text-white space-y-3 shadow-xl">
                   <select className="w-full p-3 bg-blue-700 border-none rounded-xl text-sm font-bold outline-none" value={companyConfig.boatModels.find(m => m.name === currentInvoice.boatDetails.model)?.id || ""} onChange={e => {
                      const m = companyConfig.boatModels.find(x => x.id === parseInt(e.target.value));
                      setCurrentInvoice(p => ({...p, boatDetails: {...p.boatDetails, model: m.name, length: m.length}, items: [{...p.items[0], description: `Bateau ${m.type} ${m.name}`}]}));
                   }}>
                      <option value="">Modèle</option>
                      {companyConfig.boatModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                   <input className="w-full p-3 bg-blue-700 border-none rounded-xl text-sm font-bold" value={currentInvoice.boatDetails.serialNumber} onChange={e => setCurrentInvoice({...currentInvoice, boatDetails: {...currentInvoice.boatDetails, serialNumber: e.target.value.toUpperCase()}})} placeholder="Série"/>
                   <input className="w-full p-3 bg-blue-700 border-none rounded-xl text-sm font-bold" type="number" value={currentInvoice.items[0].price} onChange={e => {let ni = [...currentInvoice.items]; ni[0].price = parseFloat(e.target.value)||0; setCurrentInvoice({...currentInvoice, items: ni});}} placeholder="Prix DA"/>
                </div>
                <Button onClick={saveInvoice} disabled={busy} className="w-full justify-center py-4 uppercase text-xs tracking-widest"><Save/> Sauvegarder Online</Button>
                <Button onClick={() => window.print()} variant="secondary" className="w-full justify-center py-4 uppercase text-xs border-2"><Printer/> Imprimer</Button>
             </div>
             <div className="flex-1 bg-slate-200 rounded-[2rem] p-4 overflow-auto h-[60vh] md:h-[calc(100vh-10rem)] shadow-inner flex justify-center">
                <div id="printable-area" className="scale-[0.5] md:scale-90 origin-top">
                   {currentInvoice.type === "dossier" ? (
                      <div><div className="page-break"><RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} /></div><div className="page-break"><RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} /></div><div className="page-break"><RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} /></div></div>
                   ) : ( <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} /> )}
                </div>
             </div>
          </div>
        )}

        {/* PLANS */}
        {view === "database" && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyConfig.boatModels.map(m => (
                 <div key={m.id} className="bg-white rounded-[2rem] p-6 border-2 border-white shadow-sm space-y-4">
                    <h3 className="font-black text-lg uppercase tracking-tight">{m.name} <span className="text-[10px] text-blue-500 ml-2">{m.length}</span></h3>
                    <Button onClick={() => alert("Uploadez les images dans Config")} className="w-full justify-center py-4 rounded-2xl">Dossier Technique</Button>
                 </div>
              ))}
           </div>
        )}

        {/* CONFIGURATION */}
        {view === "settings" && (
           <div className="max-w-3xl mx-auto bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-4 uppercase"><Settings className="text-blue-600"/> Paramètres</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-bold text-slate-400">NOM SOCIÉTÉ</label><Input value={companyConfig.name} onChange={e => saveConfig({...companyConfig, name: e.target.value})}/></div>
                 <div><label className="text-[10px] font-bold text-slate-400">GÉRANT</label><Input value={companyConfig.managerName} onChange={e => saveConfig({...companyConfig, managerName: e.target.value})}/></div>
                 <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">ADRESSE</label><Input value={companyConfig.address} onChange={e => saveConfig({...companyConfig, address: e.target.value})}/></div>
                 <div><label className="text-[10px] font-bold text-slate-400">TÉLÉPHONE</label><Input value={companyConfig.phone} onChange={e => saveConfig({...companyConfig, phone: e.target.value})}/></div>
                 <div><label className="text-[10px] font-bold text-slate-400">EMAIL</label><Input value={companyConfig.email} onChange={e => saveConfig({...companyConfig, email: e.target.value})}/></div>
                 <div><label className="text-[10px] font-bold text-slate-400">RC</label><Input value={companyConfig.rc} onChange={e => saveConfig({...companyConfig, rc: e.target.value})}/></div>
                 <div><label className="text-[10px] font-bold text-slate-400">NIF</label><Input value={companyConfig.nif} onChange={e => saveConfig({...companyConfig, nif: e.target.value})}/></div>
                 <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">RIB</label><Input value={companyConfig.bankRib} onChange={e => saveConfig({...companyConfig, bankRib: e.target.value})}/></div>
              </div>
           </div>
        )}

      </main>
      
      {/* STYLE POUR L'IMPRESSION PDF DES PLANS */}
      <style>{`
        @media print {
          .page-break { page-break-after: always; break-after: page; display: block; min-height: 290mm; }
          #printable-area { transform: none !important; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
