import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Printer, Save, FileText, FolderOpen, ClipboardList, Database, History,
  Search, X, Upload, Settings, LayoutDashboard, Anchor, PackageCheck, ShieldCheck
} from "lucide-react";
import { supabase } from "./supabase";

// --- UTILITAIRES ---
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

const calculateSubtotal = (items) => items.reduce((acc, item) => acc + (item.quantity * (item.price || 0)), 0);
const calculateTotal = (items, tvaRate) => calculateSubtotal(items) * (1 + tvaRate / 100);
const formatCurrency = (amount) => (Number(amount || 0)).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";

export default function App() {
  // AUTH
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  // APP STATE
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
    nextInvoiceNumber: 1, nextProformaNumber: 1, nextDeliveryNumber: 1, nextAttestationNumber: 1,
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

  // PERSISTENCE LOCAL (CONFIG + MODELS DOCS)
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

  // AUTH session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // LOAD HISTORY FROM SUPABASE
  const loadHistory = async () => {
    if (!session?.user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, number, date, client_name, client_address, client_id_number, tva_rate, subtotal, total, doc_type, data, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    setBusy(false);
    if (error) {
      console.error(error);
      return;
    }

    // Rehydrate to your Gemini-like object shape
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
        boatDetails: d.boatDetails || { model: "", serialNumber: "", length: "", approvalNumber: "", year: String(new Date().getFullYear()), notes: "" },
        paymentMethod: d.paymentMethod || "virement",
        showPayment: d.showPayment ?? true,
        clientChequeNumber: d.clientChequeNumber || "",
        invoiceNumber: d.invoiceNumber,
        attestationNumber: d.attestationNumber,
        deliveryNumber: d.deliveryNumber,
      };
    });

    setInvoiceHistory(mapped);
  };

  useEffect(() => {
    if (session?.user) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // AUTH actions
  async function signUp() {
    setAuthMsg("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPass });
    if (error) setAuthMsg(error.message);
    else setAuthMsg("Compte créé. Vérifie ton email si Supabase demande confirmation.");
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

  // Upload Logo
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const nc = { ...companyConfig, logo: reader.result };
      setCompanyConfig(nc);
      saveLocal(nc, modelDocs);
    };
    reader.readAsDataURL(file);
  };

  // Upload model docs (missing in your paste -> added here)
  const handleDocUpload = (e, modelId, docKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const next = {
        ...modelDocs,
        [modelId]: { ...(modelDocs[modelId] || {}), [docKey]: reader.result },
      };
      setModelDocs(next);
      saveLocal(companyConfig, next);
    };
    reader.readAsDataURL(file);
  };

  // Create new docs (same spirit as your code)
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
      paymentMethod: "virement",
      showPayment: true,
      clientChequeNumber: "",
      boatDetails: {
        model: "",
        serialNumber: "",
        length: "",
        approvalNumber: "",
        year: year.toString(),
        notes: "Je certifie que le navire a été construit à neuf selon les spécifications techniques.",
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

  const selectModel = (id) => {
    const m = companyConfig.boatModels.find((x) => x.id === parseInt(id));
    if (!m || !currentInvoice) return;
    setCurrentInvoice((prev) => ({
      ...prev,
      boatDetails: { ...prev.boatDetails, model: m.name, length: m.length, approvalNumber: m.approvalNumber },
      items: [{ ...prev.items[0], description: `BATEAU CONSTRUCTION NAVALE ${m.type.toUpperCase()} - MODÈLE ${m.name.toUpperCase()}` }],
    }));
  };

  // SAVE TO SUPABASE (archives)
  const saveInvoice = async () => {
    if (!session?.user) return;
    if (!currentInvoice?.clientName) return alert("Veuillez saisir le nom du client.");
    if (!currentInvoice?.number) return alert("Numéro manquant.");

    setBusy(true);

    const subtotal = calculateSubtotal(currentInvoice.items || []);
    const total = calculateTotal(currentInvoice.items || [], Number(currentInvoice.tvaRate || 0));

    const doc_type = currentInvoice.type || "facture";

    const payload = {
      user_id: session.user.id,
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
      data: {
        ...currentInvoice,
        // we keep full doc here
      },
    };

    // INSERT or UPDATE
    let invoiceId = currentInvoice.db_id || null;
    if (!invoiceId) {
      const { data, error } = await supabase.from("invoices").insert(payload).select("id").single();
      if (error) {
        setBusy(false);
        alert(error.message);
        return;
      }
      invoiceId = data.id;
    } else {
      const { error } = await supabase.from("invoices").update(payload).eq("id", invoiceId);
      if (error) {
        setBusy(false);
        alert(error.message);
        return;
      }
      // delete old items then re-insert
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
    }

    // store items table (optional but useful)
    const itemsPayload = (currentInvoice.items || []).map((it) => ({
      invoice_id: invoiceId,
      description: it.description || "",
      qty: Number(it.quantity || 0),
      price: Number(it.price || 0),
      line_total: Number(it.quantity || 0) * Number(it.price || 0),
    }));
    if (itemsPayload.length) {
      const { error: itemsErr } = await supabase.from("invoice_items").insert(itemsPayload);
      if (itemsErr) {
        setBusy(false);
        alert(itemsErr.message);
        return;
      }
    }

    // increment counters locally (only when new)
    if (!currentInvoice.db_id) {
      let newConfig = { ...companyConfig };
      if (doc_type === "dossier") {
        newConfig.nextInvoiceNumber += 1;
        newConfig.nextAttestationNumber += 1;
        newConfig.nextDeliveryNumber += 1;
      } else {
        const keyMap = { facture: "nextInvoiceNumber", proforma: "nextProformaNumber", livraison: "nextDeliveryNumber", attestation: "nextAttestationNumber" };
        newConfig[keyMap[doc_type]] += 1;
      }
      setCompanyConfig(newConfig);
      saveLocal(newConfig, modelDocs);
    }

    setBusy(false);
    await loadHistory();
    setView("history");
  };

  const deleteInvoice = async (inv) => {
    if (!inv?.db_id) return;
    if (!window.confirm("Détruire l'archive ?")) return;
    setBusy(true);
    const { error } = await supabase.from("invoices").delete().eq("id", inv.db_id);
    setBusy(false);
    if (error) return alert(error.message);
    await loadHistory();
  };

  const handlePrint = () => window.print();

  // --- RENDU DOC A4 (ton style, gardé)
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;
    const total = calculateTotal(currentInvoice.items, currentInvoice.tvaRate);
    const isAtt = subType === "attestation";
    const isBL = subType === "livraison";
    const isFactOrPro = subType === "facture" || subType === "proforma";

    return (
      <div className="bg-white p-8 md:p-10 mx-auto mb-10 print:m-0 print:p-8 w-[21cm] min-h-[29.7cm] flex flex-col font-sans text-slate-800 border shadow-md rounded-2xl overflow-hidden print:border-none print:shadow-none antialiased">
        <div className="flex justify-between border-b-2 border-blue-900 pb-6 mb-8 items-start">
          <div className="w-1/2">
            {companyConfig.logo ? (
              <img src={companyConfig.logo} className="h-16 object-contain mb-3" />
            ) : (
              <div className="mb-3">
                <h1 className="text-2xl font-black text-blue-900 leading-none">
                  PNEUBOAT <span className="text-red-600">AT</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Élite Naval Oran</p>
              </div>
            )}
            <div className="text-[10px] uppercase font-bold text-slate-500 space-y-0.5">
              <p>{companyConfig.address}</p>
              <p>Tél: {companyConfig.phone} • Email: {companyConfig.email}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="bg-blue-900 text-white px-5 py-2 rounded-xl mb-4 text-xs font-black uppercase tracking-[0.2em]">{subType}</div>
            <div className="space-y-0.5">
              <p className="font-mono text-lg font-black text-slate-900">REF: {docNumber}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Fait le {new Date(currentInvoice.date).toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 mb-8">
          <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100 relative shadow-inner">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-[0.3em]">Destinataire / Partenaire</p>
            <h2 className="text-xl font-black uppercase text-slate-900 leading-none mb-1">{currentInvoice.clientName || "---"}</h2>
            <p className="text-slate-500 font-medium text-sm leading-tight italic">{currentInvoice.clientAddress || "---"}</p>
            {currentInvoice.clientIdNumber && (
              <div className="mt-3 flex items-center gap-2 bg-white px-4 py-1 rounded-full border shadow-sm w-max">
                <ShieldCheck size={12} className="text-blue-900" />
                <span className="text-[9px] font-black text-slate-700 uppercase">
                  IDENTITÉ N° : <span className="font-mono">{currentInvoice.clientIdNumber}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {isAtt ? (
          <div className="flex-1 px-2 text-sm leading-relaxed">
            <p className="mb-8 text-slate-700 text-justify">
              Je soussigné, <strong>{companyConfig.managerName}</strong>, gérant de la société <strong>{companyConfig.name}</strong>, certifie par la présente que le navire désigné ci-après a été entièrement construit à neuf dans nos ateliers pour le compte de <strong>{currentInvoice.clientName || ".........."}</strong>.
            </p>

            <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden mb-8 shadow-sm">
              <div className="bg-slate-900 px-8 py-3 border-b font-bold uppercase text-[10px] tracking-[0.3em] text-white italic text-center">
                Fiche Technique de l'unité navale
              </div>
              <div className="p-8 grid grid-cols-2 gap-y-10 gap-x-12">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1 tracking-widest">Modèle Naval</span>
                  <span className="text-lg font-black uppercase text-slate-900">{currentInvoice.boatDetails.model}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1 tracking-widest">Coque (HIN)</span>
                  <span className="text-lg font-mono font-bold text-red-600 tracking-tighter">{currentInvoice.boatDetails.serialNumber}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1 tracking-widest">Millésime</span>
                  <span className="text-lg font-bold text-slate-900">{currentInvoice.boatDetails.year}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1 tracking-widest">Homologation Officielle</span>
                  <span className="text-[11px] font-bold text-blue-900 leading-tight block mt-1 uppercase italic">{currentInvoice.boatDetails.approvalNumber}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl text-slate-500 text-xs italic border border-slate-100 italic">
              Notes : {currentInvoice.boatDetails.notes}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 uppercase text-slate-400 font-black tracking-widest">
                  <th className="py-4 px-2">Désignation</th>
                  <th className="py-4 text-center w-24">Quantité</th>
                  {!isBL && (
                    <>
                      <th className="py-4 text-right w-40">P.U (DA)</th>
                      <th className="py-4 text-right pr-2 w-40">Total Net</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium italic">
                {currentInvoice.items.map((it, i) => (
                  <tr key={it.id || i}>
                    <td className="py-8 px-2">
                      <div className="text-base font-bold uppercase not-italic">{it.description}</div>
                      {i === 0 && !isAtt && currentInvoice.boatDetails.model && (
                        <div className="text-[10px] mt-2 font-bold text-blue-900 uppercase flex items-center gap-2 tracking-widest italic">
                          Coque N° :{" "}
                          <span className="text-red-600 font-mono text-xs bg-slate-50 px-2 rounded-lg border border-slate-100 shadow-sm">
                            {currentInvoice.boatDetails.serialNumber}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-8 text-center font-bold text-base">{it.quantity}</td>
                    {!isBL && (
                      <>
                        <td className="py-8 text-right font-medium text-slate-500 italic">{(it.price || 0).toLocaleString("fr-FR")}</td>
                        <td className="py-8 text-right pr-2 font-black text-lg text-slate-900">{((it.quantity || 0) * (it.price || 0)).toLocaleString("fr-FR")}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col">
          {!isAtt && !isBL && (
            <div className="flex justify-between items-start mb-8 px-2">
              <div className="w-1/2">
                {currentInvoice.showPayment && (
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 inline-block px-10 text-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1 block tracking-widest italic">Règlement par</span>
                    <div className="text-slate-900 font-bold text-[11px] uppercase italic leading-tight">
                      {currentInvoice.paymentMethod === "virement" ? "Virement Bancaire" : currentInvoice.paymentMethod === "cheque" ? "Chèque Bancaire" : "Espèces"}
                      {currentInvoice.paymentMethod === "cheque" && currentInvoice.clientChequeNumber && (
                        <p className="text-red-600 text-[10px] mt-1 font-black">N° {currentInvoice.clientChequeNumber}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-2/5 space-y-2">
                <div className="flex justify-between text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <span>Net HT</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(calculateSubtotal(currentInvoice.items))}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100 pb-2">
                  <span>TVA {currentInvoice.tvaRate}%</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(calculateSubtotal(currentInvoice.items) * (Number(currentInvoice.tvaRate || 0) / 100))}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 pt-2 tracking-tighter uppercase leading-none italic pl-1 border-b-4 border-slate-900 pb-1">
                  <span>Total TTC</span>
                  <span className="text-red-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}

          {isFactOrPro && (
            <div className="mb-10 bg-slate-50/50 p-6 rounded-3xl flex flex-col gap-1 items-start pl-6 border-l-8 border-slate-900 italic">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] italic mb-1">Arrêté la présente facture à la somme de :</p>
              <p className="text-xs font-bold text-slate-700 uppercase leading-snug tracking-wider">{NumberToLetter(total)}</p>
            </div>
          )}

          <div className="flex justify-between text-center font-black text-[9px] uppercase tracking-widest gap-20 mb-16 mt-8 px-4">
            <div className="flex-1 h-32 flex flex-col justify-between p-4 border border-dashed border-slate-200 rounded-[2.5rem] italic text-slate-300">
              <span>Cachet et signature Gérant</span>
              <div className="h-0.5 w-full bg-slate-50"></div>
            </div>
            <div className="flex-1 h-32 flex flex-col justify-between p-4 border border-dashed border-slate-200 rounded-[2.5rem] italic text-slate-300">
              <span>Signature Client</span>
              <div className="h-0.5 w-full bg-slate-50"></div>
            </div>
          </div>

          <div className="grid grid-cols-3 items-end pt-8 border-t border-slate-200 text-[8px] uppercase font-black text-slate-400 tracking-widest gap-8 px-2 text-center">
            <div className="text-left space-y-1 border-r border-slate-100 pr-4">
              <p className="text-blue-900 text-[9px] mb-2 font-black italic underline decoration-red-600 decoration-2">Registre Bancaire</p>
              <p>BANQUE: <span className="text-slate-900 font-bold">{companyConfig.bankName}</span></p>
              <p>RIB: <span className="text-slate-900 font-mono text-[8px] font-bold">{companyConfig.bankRib}</span></p>
            </div>
            <div className="text-center space-y-1 border-r border-slate-100 px-4">
              <p className="mb-2 italic text-slate-900">Identification Fiscale</p>
              <p>RC: <span className="text-slate-900 font-bold">{companyConfig.rc}</span> • NIF: <span className="text-slate-900 font-bold">{companyConfig.nif}</span></p>
              <p>NIS: <span className="text-slate-900 font-bold">{companyConfig.nis}</span> • CAP: <span className="text-slate-900 font-bold">{companyConfig.capital}</span></p>
            </div>
            <div className="text-right flex flex-col items-end gap-1 leading-none pl-4">
              <span className="text-blue-900 italic text-[11px] font-black tracking-tighter">{companyConfig.footerText}</span>
              <span className="text-slate-300 font-black uppercase">Pneuboat Industrie Naval Oran</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- UI VIEWS (Gemini style) ---
  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in duration-500">
      <h2 className="text-4xl font-black uppercase italic text-slate-900 tracking-tighter border-l-8 border-blue-900 pl-8 leading-none">
        Management Naval
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <button
          onClick={() => startNew("dossier")}
          className="group bg-blue-900 text-white p-10 rounded-[50px] shadow-2xl flex flex-col items-center gap-8 font-black transition-all hover:scale-105 active:scale-95 border-b-[12px] border-blue-950 border-r-4"
        >
          <div className="p-7 bg-blue-800 rounded-[2.5rem] shadow-2xl group-hover:rotate-12 transition-transform border border-blue-700 shadow-red-500/20">
            <FolderOpen size={48} />
          </div>
          <span className="text-lg tracking-tighter uppercase italic text-center">Dossier<br />Complet</span>
        </button>

        {[
          { t: "facture", l: "FACTURE", i: <FileText size={32} /> },
          { t: "proforma", l: "PROFORMA", i: <ClipboardList size={32} /> },
          { t: "livraison", l: "LIVRAISON", i: <PackageCheck size={32} /> },
          { t: "attestation", l: "ATTEST.", i: <Anchor size={32} /> },
        ].map((item) => (
          <button
            key={item.t}
            onClick={() => startNew(item.t)}
            className="group bg-white p-10 rounded-[50px] shadow-xl flex flex-col items-center justify-center gap-8 font-black transition-all hover:scale-105 border border-slate-100 hover:border-red-600 hover:shadow-2xl"
          >
            <div className="text-slate-100 group-hover:text-blue-900 transition-all p-7 bg-slate-50 rounded-full group-hover:bg-blue-50 shadow-inner group-active:scale-90">
              {item.i}
            </div>
            <span className="text-slate-900 text-[10px] tracking-[0.4em] uppercase font-black">{item.l}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderEdit = () => {
    if (!currentInvoice) return null;

    return (
      <div className="flex flex-col xl:flex-row gap-12 items-start animate-in fade-in duration-500">
        <div className="w-full xl:w-[450px] space-y-6 print:hidden shrink-0">
          <div className="bg-white p-10 rounded-[4.5rem] shadow-2xl border border-slate-100 space-y-10">
            <div className="flex justify-between items-center border-b-4 border-blue-900 pb-4">
              <h3 className="font-black uppercase italic text-blue-900 tracking-tighter text-3xl leading-none">Saisie</h3>
              <button onClick={() => setView("history")} className="p-3 bg-slate-50 hover:bg-red-600 hover:text-white rounded-full text-slate-400 transition-all shadow-md">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 font-black uppercase italic tracking-widest text-[10px]">
              <div className="space-y-1">
                <label className="text-slate-400 block pl-6 italic">Client</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border-none p-5 rounded-[2.5rem] text-blue-900 focus:ring-4 focus:ring-blue-100 outline-none shadow-inner"
                  placeholder="NOM COMPLET"
                  value={currentInvoice.clientName}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientName: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block pl-6 italic">Adresse</label>
                <textarea
                  className="w-full bg-slate-50 border-none p-5 rounded-[2.5rem] h-20 text-slate-500 text-[11px] focus:ring-4 focus:ring-blue-100 outline-none shadow-inner leading-relaxed"
                  placeholder="COORDONNÉES"
                  value={currentInvoice.clientAddress}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientAddress: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-blue-900 block pl-10 border-l-4 border-red-600">ID / Passeport</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border-none p-5 rounded-[2rem] font-mono text-red-600 shadow-inner text-center italic"
                  placeholder="N° DE PIÈCE"
                  value={currentInvoice.clientIdNumber}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientIdNumber: e.target.value })}
                />
              </div>

              <div className="p-8 bg-blue-50/50 rounded-[4.5rem] space-y-8 border-2 border-blue-100 shadow-inner">
                <div className="space-y-3 font-black uppercase text-[10px] tracking-widest text-blue-900 italic pl-2 border-b border-blue-100 pb-2">
                  Configuration Technique
                </div>

                <div className="space-y-1">
                  <label className="text-blue-900 pl-4">Modèle naval</label>
                  <select
                    value={companyConfig.boatModels.find((m) => m.name === currentInvoice.boatDetails.model)?.id || ""}
                    onChange={(e) => selectModel(e.target.value)}
                    className="w-full bg-white border-none p-5 rounded-[2.5rem] font-black text-blue-900 outline-none appearance-none text-center shadow-xl hover:scale-105 transition-all cursor-pointer"
                  >
                    <option value="">-- Sélection --</option>
                    {companyConfig.boatModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 pl-4 font-mono">Matricule HIN</label>
                  <input
                    type="text"
                    className="w-full bg-white border-none p-5 rounded-[2.5rem] font-mono font-black text-slate-900 outline-none text-center shadow-xl focus:ring-4 focus:ring-red-600 transition-all uppercase"
                    placeholder="DZ-PNB-0000"
                    value={currentInvoice.boatDetails.serialNumber}
                    onChange={(e) => setCurrentInvoice({ ...currentInvoice, boatDetails: { ...currentInvoice.boatDetails, serialNumber: e.target.value.toUpperCase() } })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-red-600 pl-8 font-black underline decoration-blue-900 decoration-2">Valeur (DA)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900 border-none p-6 rounded-[3.5rem] font-black text-white text-3xl text-right focus:ring-8 focus:ring-red-600/30 outline-none shadow-2xl font-mono"
                    placeholder="0.00"
                    value={currentInvoice.items?.[0]?.price || 0}
                    onChange={(e) => {
                      const ni = [...currentInvoice.items];
                      ni[0] = { ...ni[0], price: parseFloat(e.target.value) || 0 };
                      setCurrentInvoice({ ...currentInvoice, items: ni });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-blue-900 pl-8 font-black">TVA (%)</label>
                  <input
                    type="number"
                    className="w-full bg-white border-none p-5 rounded-[2.5rem] font-black text-blue-900 outline-none text-center shadow-xl focus:ring-4 focus:ring-blue-200 transition-all"
                    value={currentInvoice.tvaRate}
                    onChange={(e) => setCurrentInvoice({ ...currentInvoice, tvaRate: Number(e.target.value || 0) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 italic font-black uppercase">
              <button
                onClick={saveInvoice}
                disabled={busy}
                className="w-full bg-blue-900 disabled:opacity-60 text-white py-8 rounded-[4rem] text-[10px] tracking-[0.5em] shadow-2xl hover:bg-blue-800 transition-all active:scale-95 border-b-[16px] border-blue-950 flex items-center justify-center gap-4"
              >
                <Save size={22} /> ARCHIVER
              </button>

              <button
                onClick={handlePrint}
                className="w-full bg-red-600 text-white py-8 rounded-[4rem] text-[10px] tracking-[0.5em] shadow-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-5 border-b-[16px] border-red-900 active:scale-95 italic"
              >
                <Printer size={24} /> IMPRIMER PDF
              </button>
            </div>
          </div>
        </div>

        <div id="printable-area" className="flex-1 bg-white rounded-[80px] p-12 shadow-2xl border border-slate-100 overflow-x-auto min-w-[21cm]">
          {currentInvoice.type === "dossier" ? (
            <div className="space-y-32">
              <RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} />
              <RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} />
              <RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} />
            </div>
          ) : (
            <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} />
          )}
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="bg-white p-20 rounded-[100px] shadow-2xl border border-slate-100 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-20 border-b-4 border-blue-900 pb-10">
        <h2 className="text-6xl font-black uppercase italic tracking-tighter text-slate-900 pl-6 border-l-[16px] border-blue-900 leading-none">
          Archives <span className="text-slate-200">Docs</span>
        </h2>

        <div className="relative w-[450px]">
          <Search className="absolute left-6 top-5 text-slate-300" size={24} />
          <input
            type="text"
            placeholder="RECHERCHER..."
            className="w-full bg-slate-50 border-none p-5 pl-16 rounded-[32px] focus:ring-2 focus:ring-red-600 outline-none font-black text-sm shadow-inner uppercase tracking-widest italic"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[40px] border border-slate-50 shadow-inner">
        <table className="w-full text-left font-bold uppercase tracking-widest italic text-[11px]">
          <thead className="bg-blue-900 text-white font-black tracking-[0.5em]">
            <tr>
              <th className="p-10 text-center">Émis le</th>
              <th>Référence</th>
              <th>Client / Société</th>
              <th className="text-right pr-16 font-black">Montant (DA)</th>
              <th className="text-center pr-8">Gestion</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-[10px] font-black">
            {invoiceHistory
              .filter((i) => (i.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()))
              .map((inv) => (
                <tr key={inv.db_id} className="hover:bg-slate-50 transition-all group border-l-[14px] border-transparent hover:border-blue-900">
                  <td className="p-10 text-slate-300 font-mono text-center text-xs">{inv.date}</td>
                  <td className="text-blue-900 font-black text-base italic">{inv.number}</td>
                  <td className="text-slate-900 text-sm uppercase font-black">{inv.clientName}</td>
                  <td className="text-right text-red-600 font-black text-2xl pr-16 tracking-tighter italic underline decoration-slate-900 decoration-2">
                    {formatCurrency(calculateTotal(inv.items, inv.tvaRate))}
                  </td>
                  <td className="text-center pr-10">
                    <div className="flex justify-center gap-6">
                      <button
                        onClick={() => { setCurrentInvoice(inv); setView("edit"); }}
                        className="bg-blue-900 text-white px-10 py-3 rounded-full hover:scale-110 transition-all font-black text-[9px] shadow-2xl tracking-[0.3em] uppercase italic border-b-4 border-blue-950"
                      >
                        OUVRIR
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv)}
                        className="text-slate-200 hover:text-red-500 transition-all p-4 rounded-full bg-slate-50"
                        title="Supprimer"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {busy && <div className="p-8 text-center text-slate-400 font-black uppercase tracking-widest italic">Chargement...</div>}
      </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in duration-700">
      <div className="border-l-[20px] border-blue-900 pl-16 leading-none">
        <h2 className="text-7xl md:text-9xl font-black uppercase italic text-slate-900 tracking-tighter leading-none mb-6 underline decoration-red-600 decoration-[16px] underline-offset-[24px]">
          Unités
        </h2>
        <p className="text-slate-400 text-base font-black uppercase tracking-[0.8em] italic pl-2 border-b-[10px] border-slate-100 pb-6 inline-block tracking-tighter">
          Architecture & Plans PDF
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20 uppercase font-black italic tracking-widest text-[11px]">
        {companyConfig.boatModels.map((m) => (
          <div key={m.id} className="bg-white p-14 rounded-[100px] shadow-2xl border border-slate-50 flex flex-col hover:border-blue-900 transition-all hover:-translate-y-6 group overflow-hidden relative border-t-8 border-t-red-600">
            <h3 className="text-6xl font-black text-slate-900 mb-2 tracking-tighter leading-none italic group-hover:text-blue-900 transition-colors uppercase">{m.name}</h3>
            <p className="text-slate-200 mb-16 border-b-4 border-slate-50 pb-6 tracking-[0.4em] text-xs font-bold uppercase">{m.type} • {m.length}</p>

            <div className="grid grid-cols-2 gap-8 mb-16 flex-1">
              {["fiche", "jauge", "plan", "approbation"].map((doc) => (
                <label
                  key={doc}
                  className={`border-4 rounded-[3.5rem] p-10 text-center cursor-pointer transition-all flex flex-col items-center gap-6 ${
                    modelDocs[m.id]?.[doc]
                      ? "bg-blue-900 border-blue-900 text-white shadow-2xl scale-105"
                      : "bg-slate-50 border-slate-50 hover:bg-white hover:shadow-2xl hover:border-blue-900"
                  }`}
                >
                  <Upload size={40} className={modelDocs[m.id]?.[doc] ? "text-white" : "text-slate-200"} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{doc}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocUpload(e, m.id, doc)} />
                </label>
              ))}
            </div>

            <button
              onClick={() => { if (!modelDocs[m.id]) return alert("Plans manquants."); setPrintModelId(m.id); setView("print_tech_view"); }}
              className="w-full bg-blue-900 text-white py-10 rounded-[5rem] font-black uppercase shadow-xl hover:scale-105 active:scale-95 transition-all tracking-[0.5em] text-[10px] border-b-[20px] border-blue-950 italic"
            >
              VOIR DOSSIER COMPLET
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrintTechView = () => (
    <div className="bg-zinc-100 min-h-screen p-20 animate-in fade-in">
      <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-blue-900 px-24 py-8 rounded-[5rem] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.7)] flex items-center gap-20 print:hidden z-[100] border-8 border-blue-800 text-white backdrop-blur-xl italic uppercase">
        <button onClick={() => setView("database")} className="flex items-center gap-6 text-slate-400 hover:text-white font-black uppercase text-[12px] tracking-[0.6em] transition-all italic underline underline-offset-8 decoration-slate-700 decoration-4">
          Retour
        </button>
        <div className="w-px h-20 bg-blue-800"></div>
        <h2 className="font-black uppercase italic tracking-tighter text-3xl md:text-5xl leading-none underline decoration-red-600 decoration-8 underline-offset-[12px]">
          Unité : {companyConfig.boatModels.find((x) => x.id === printModelId)?.name}
        </h2>
        <div className="w-px h-20 bg-blue-800"></div>
        <button onClick={handlePrint} className="bg-white text-blue-900 px-20 py-6 rounded-full font-black uppercase text-[12px] tracking-[0.6em] shadow-2xl hover:scale-110 transition-all active:scale-95 flex items-center gap-6 italic border-b-[16px] border-slate-200">
          <Printer size={28} /> Imprimer
        </button>
      </div>

      <div className="pt-52 space-y-32 print:pt-0 print:space-y-0">
        {["fiche", "jauge", "plan", "approbation"].map((doc) => (
          modelDocs[printModelId]?.[doc] && (
            <div key={doc} className="bg-white mx-auto max-w-[21cm] shadow-2xl print:shadow-none print:max-w-full print:w-full print:h-[29.7cm] print:break-after-page overflow-hidden flex items-center justify-center p-16 rounded-[8rem] border-4 border-slate-100 italic font-black uppercase">
              <img src={modelDocs[printModelId][doc]} alt={doc} className="max-w-full max-h-full object-contain" />
            </div>
          )
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-6xl mx-auto bg-white p-24 rounded-[120px] shadow-2xl border border-slate-100 animate-in zoom-in duration-500 font-black italic uppercase">
      <div className="flex justify-between items-end mb-24 border-b-[8px] border-blue-900 pb-12">
        <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-slate-900 pl-8 border-l-[20px] border-blue-900 leading-none underline decoration-red-600 decoration-[16px] underline-offset-[24px]">
          Configuration
        </h2>
        <button onClick={() => setView("list")} className="p-7 bg-blue-900 text-white rounded-full hover:scale-110 transition-all duration-300 shadow-2xl active:rotate-180">
          <X size={44} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 font-black">
        <div className="space-y-20">
          <div className="p-16 bg-slate-50 rounded-[100px] border-4 border-dashed border-slate-100 flex flex-col items-center shadow-inner">
            <label className="text-[12px] font-black text-slate-300 uppercase mb-8 tracking-[0.5em] italic underline decoration-blue-900">
              Emblème de la compagnie (Logo)
            </label>
            <input type="file" onChange={handleLogoUpload} className="block w-full text-xs text-slate-500 file:py-5 file:px-12 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-900 file:text-white hover:file:bg-red-600 cursor-pointer bg-white p-6 rounded-[40px] shadow-xl border border-slate-100" />
          </div>

          <div className="space-y-12 px-8 italic">
            <div>
              <label className="text-[12px] font-black text-slate-400 uppercase mb-5 block tracking-[0.4em] pl-8 italic underline decoration-red-600">Gérant / Direction</label>
              <input
                type="text"
                value={companyConfig.managerName}
                onChange={(e) => {
                  const nc = { ...companyConfig, managerName: e.target.value };
                  setCompanyConfig(nc);
                  saveLocal(nc, modelDocs);
                }}
                className="w-full bg-slate-50 border-none p-8 rounded-[4rem] font-black text-3xl focus:ring-8 focus:ring-blue-50 transition-all shadow-inner uppercase tracking-tighter text-blue-900 italic"
              />
            </div>

            <div className="bg-blue-900 p-20 rounded-[6rem] text-white space-y-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-l-[16px] border-blue-950 border-r-4">
              <h4 className="text-[12px] font-black text-red-500 uppercase tracking-[0.6em] border-b border-blue-800 pb-5 italic underline decoration-white decoration-2">
                Registre Bancaire
              </h4>

              <div className="space-y-8">
                <label className="text-[10px] text-blue-400 font-bold uppercase block pl-2 tracking-widest italic">Agence / Succursale</label>
                <input
                  type="text"
                  value={companyConfig.bankName}
                  onChange={(e) => { const nc = { ...companyConfig, bankName: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-blue-800 border-none p-8 rounded-[3rem] font-black text-white focus:ring-4 focus:ring-red-600 transition-all uppercase italic text-xl shadow-2xl"
                />
              </div>

              <div className="space-y-8">
                <label className="text-[10px] text-blue-400 font-bold uppercase block pl-2 tracking-widest italic font-mono underline decoration-white decoration-4 underline-offset-8">
                  Code RIB / Compte
                </label>
                <input
                  type="text"
                  value={companyConfig.bankRib}
                  onChange={(e) => { const nc = { ...companyConfig, bankRib: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-blue-800 border-none p-8 rounded-[3rem] font-mono font-black text-white focus:ring-4 focus:ring-red-600 transition-all text-2xl tracking-[0.2em] shadow-2xl text-center"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-20 font-black uppercase italic tracking-widest">
          <div className="space-y-12 bg-white border-2 border-slate-50 p-16 rounded-[100px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden">
            <h3 className="text-blue-900 font-black uppercase text-[12px] tracking-[0.5em] border-b-4 border-blue-900 pb-8 mb-10 italic">
              Fiscalité & Enregistrements
            </h3>

            <div className="grid grid-cols-1 gap-12 font-black italic">
              <div className="space-y-4">
                <label className="text-[10px] text-slate-400 font-black tracking-widest italic pl-4 underline decoration-slate-100">Registre du commerce (RC)</label>
                <input
                  type="text"
                  value={companyConfig.rc}
                  onChange={(e) => { const nc = { ...companyConfig, rc: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-slate-50 border-none p-6 rounded-[2.5rem] text-sm font-black shadow-inner tracking-widest text-slate-900 uppercase italic"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-slate-400 font-black tracking-widest italic pl-4 underline decoration-slate-100">Identifiant Fiscal (NIF)</label>
                <input
                  type="text"
                  value={companyConfig.nif}
                  onChange={(e) => { const nc = { ...companyConfig, nif: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-slate-50 border-none p-6 rounded-[2.5rem] text-sm font-black shadow-inner tracking-widest text-slate-900 uppercase italic"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-slate-400 font-black tracking-widest italic pl-4 underline decoration-slate-100">Identifiant Statistique (NIS)</label>
                <input
                  type="text"
                  value={companyConfig.nis}
                  onChange={(e) => { const nc = { ...companyConfig, nis: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-slate-50 border-none p-6 rounded-[2.5rem] text-sm font-black shadow-inner tracking-widest text-slate-900 uppercase italic"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] pl-10 italic underline decoration-red-600 decoration-[6px]">Capital Social (DA)</label>
                <input
                  type="text"
                  value={companyConfig.capital}
                  onChange={(e) => { const nc = { ...companyConfig, capital: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-slate-50 border-none p-8 rounded-[3.5rem] font-black shadow-inner uppercase tracking-tighter text-blue-900 text-3xl text-center italic"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] pl-10 italic underline decoration-slate-100">Siège Social & Adresse</label>
                <textarea
                  value={companyConfig.address}
                  onChange={(e) => { const nc = { ...companyConfig, address: e.target.value }; setCompanyConfig(nc); saveLocal(nc, modelDocs); }}
                  className="w-full bg-slate-50 border-none p-10 rounded-[4rem] h-48 text-base font-black shadow-inner leading-relaxed uppercase italic text-slate-500 border-b-8 border-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setView("list")}
        className="w-full bg-blue-900 text-white py-10 md:py-16 rounded-[100px] uppercase italic shadow-[0_60px_120px_-20px_rgba(0,0,0,0.5)] mt-20 hover:bg-blue-800 active:scale-95 transition-all font-black tracking-[0.3em] md:tracking-[0.6em] text-xl md:text-4xl border-b-[20px] border-blue-950 border-r-4"
      >
        CONSERVER LES MODIFICATIONS
      </button>
    </div>
  );

  // LOGIN SCREEN (same vibe)
  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white rounded-[64px] p-14 shadow-2xl border border-slate-100">
          <div className="flex items-center gap-6 mb-10">
            <div className="bg-red-600 p-4 rounded-2xl shadow-2xl border-b-4 border-red-900">
              <LayoutDashboard size={34} className="text-white" />
            </div>
            <div className="leading-none">
              <div className="font-black text-4xl tracking-tighter uppercase italic text-blue-900">PNEUBOAT</div>
              <div className="text-[11px] font-black tracking-[0.6em] text-slate-300 uppercase italic mt-2">Admin Access</div>
            </div>
          </div>

          <div className="space-y-6 uppercase font-black italic tracking-widest text-[10px]">
            <div className="space-y-2">
              <label className="text-slate-400 pl-6">Email</label>
              <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-slate-50 p-5 rounded-[2.5rem] outline-none shadow-inner focus:ring-4 focus:ring-blue-100" placeholder="you@example.com" />
            </div>

            <div className="space-y-2">
              <label className="text-slate-400 pl-6">Mot de passe</label>
              <input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} className="w-full bg-slate-50 p-5 rounded-[2.5rem] outline-none shadow-inner focus:ring-4 focus:ring-red-100" placeholder="••••••••" />
            </div>

            {authMsg && <div className="text-red-600 font-black text-xs tracking-normal normal-case">{authMsg}</div>}

            <div className="flex gap-4 pt-2">
              <button onClick={signIn} className="flex-1 bg-blue-900 text-white py-6 rounded-[3rem] shadow-2xl border-b-[12px] border-blue-950 hover:bg-blue-800 active:scale-95 transition-all">
                SE CONNECTER
              </button>
              <button onClick={signUp} className="flex-1 bg-red-600 text-white py-6 rounded-[3rem] shadow-2xl border-b-[12px] border-red-900 hover:bg-red-700 active:scale-95 transition-all">
                CRÉER COMPTE
              </button>
            </div>
          </div>

          <p className="mt-10 text-slate-300 font-black uppercase tracking-[0.4em] text-[10px] italic">
            Pneuboat • Naval Engineering Management
          </p>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-slate-900 antialiased overflow-x-hidden selection:bg-red-100 selection:text-red-900">
      <nav className="bg-blue-900 text-white px-12 py-6 flex justify-between items-center print:hidden sticky top-0 z-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-b-8 border-blue-950">
        <div className="flex items-center gap-6 cursor-pointer group" onClick={() => setView("list")}>
          <div className="bg-red-600 p-3 rounded-2xl shadow-2xl group-hover:rotate-[360deg] transition-all duration-1000 border-b-4 border-red-900">
            <LayoutDashboard size={32} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-4xl tracking-tighter uppercase italic text-white group-hover:text-red-500 transition-colors duration-500">PNEUBOAT</span>
            <span className="text-[11px] font-black tracking-[0.7em] text-blue-400 uppercase italic mt-1">Naval Engineering Management</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 italic">connecté</div>
            <div className="text-sm font-black tracking-tight">{session.user.email}</div>
          </div>
          <button onClick={signOut} className="bg-blue-950/50 border-2 border-blue-800 px-8 py-3 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] italic hover:bg-red-600 hover:border-red-600 transition-all">
            Déconnexion
          </button>
        </div>

        <div className="hidden lg:flex bg-blue-950/50 p-2 rounded-[3rem] border-2 border-blue-800 shadow-2xl backdrop-blur-md italic font-black ml-6">
          <button onClick={() => setView("list")} className={`px-10 py-3 rounded-full transition-all flex items-center gap-4 font-black uppercase text-[11px] tracking-widest italic ${view === "list" ? "bg-white shadow-2xl text-blue-900 scale-105 underline decoration-red-600 decoration-2 underline-offset-4" : "text-blue-200 hover:text-white hover:bg-blue-800/50"}`}><Plus size={20} /> Station</button>
          <button onClick={() => setView("history")} className={`px-10 py-3 rounded-full transition-all flex items-center gap-4 font-black uppercase text-[11px] tracking-widest italic ${view === "history" ? "bg-white shadow-2xl text-blue-900 scale-105 underline decoration-red-600 decoration-2 underline-offset-4" : "text-blue-200 hover:text-white hover:bg-blue-800/50"}`}><History size={20} /> Archives</button>
          <button onClick={() => setView("database")} className={`px-10 py-3 rounded-full transition-all flex items-center gap-4 font-black uppercase text-[11px] tracking-widest italic ${view === "database" || view === "print_tech_view" ? "bg-white shadow-2xl text-blue-900 scale-105 underline decoration-red-600 decoration-2 underline-offset-4" : "text-blue-200 hover:text-white hover:bg-blue-800/50"}`}><Database size={20} /> Plans PDF</button>
          <button onClick={() => setView("settings")} className={`px-10 py-3 rounded-full transition-all flex items-center gap-4 font-black uppercase text-[11px] tracking-widest italic ${view === "settings" ? "bg-white shadow-2xl text-blue-900 scale-105 underline decoration-red-600 decoration-2 underline-offset-4" : "text-blue-200 hover:text-white hover:bg-blue-800/50"}`}><Settings size={20} /> Config</button>
        </div>
      </nav>

      <div className={(view === "print_tech_view" || view === "edit") ? "" : "max-w-[1700px] mx-auto p-16"}>
        <div className={(view === "edit") ? "px-16" : ""}>
          {view === "list" && renderHome()}
          {view === "edit" && renderEdit()}
          {view === "history" && renderHistory()}
          {view === "database" && renderDatabase()}
          {view === "print_tech_view" && renderPrintTechView()}
          {view === "settings" && renderSettings()}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          nav, .print\\:hidden, .fixed, .sr-only { display: none !important; }
          .shadow-2xl, .shadow-xl, .shadow-md, .shadow-inner, .shadow-sm { box-shadow: none !important; }
          #printable-area { border: none !important; margin: 0 !important; padding: 0 !important; background: white !important; width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
          @page { size: A4; margin: 0; }
          div { border-radius: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #dc2626; }
      `}</style>
    </div>
  );
}
