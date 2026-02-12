import React, { useEffect, useMemo, useState } from "react";
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
  LayoutDashboard,
  Anchor,
  PackageCheck,
  ShieldCheck,
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

const calculateSubtotal = (items) => items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
const calculateTotal = (items, tvaRate) => calculateSubtotal(items) * (1 + Number(tvaRate || 0) / 100);
const formatCurrency = (amount) => (Number(amount || 0)).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";

/* ------------------ APP ------------------ */
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

  // CONFIG
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

  /* ------------------ PERSISTENCE LOCAL ------------------ */
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

  /* ------------------ AUTH SESSION ------------------ */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

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

  /* ------------------ LOAD HISTORY (SUPABASE) ------------------ */
  const loadHistory = async () => {
    if (!session?.user) return;
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

  /* ------------------ UPLOADS ------------------ */
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

  // Désignation = juste le nom du modèle
  const selectModel = (id) => {
    const m = companyConfig.boatModels.find((x) => x.id === parseInt(id));
    if (!m || !currentInvoice) return;

    setCurrentInvoice((prev) => ({
      ...prev,
      boatDetails: { ...prev.boatDetails, model: m.name, length: m.length, approvalNumber: m.approvalNumber },
      items: [{ ...prev.items[0], description: `${m.name}` }],
    }));
  };

  /* ------------------ SAVE / DELETE (SUPABASE) ------------------ */
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
    if (!window.confirm("Supprimer ce document ?")) return;
    setBusy(true);
    const { error } = await supabase.from("invoices").delete().eq("id", inv.db_id);
    setBusy(false);
    if (error) return alert(error.message);
    await loadHistory();
  };

  const handlePrint = () => {
    requestAnimationFrame(() => window.print());
  };

  /* ------------------ RENDER DOC A4 ------------------ */
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;

    const total = calculateTotal(currentInvoice.items, currentInvoice.tvaRate);
    const subtotal = calculateSubtotal(currentInvoice.items);
    const tvaAmt = subtotal * (Number(currentInvoice.tvaRate || 0) / 100);

    const isAtt = subType === "attestation";
    const isBL = subType === "livraison";
    const isFactOrPro = subType === "facture" || subType === "proforma";

    const safe = (s, max = 160) =>
      String(s || "").length > max ? String(s || "").slice(0, max) + "…" : String(s || "");

    return (
      <div
        className="
          pb-doc
          bg-white mx-auto
          w-[21cm] min-h-[29.7cm]
          border border-slate-200 overflow-hidden
          flex flex-col relative
        "
      >
        {/* Bande verticale Pneuboat */}
        <div className="pb-ribbon" />

        {/* Contenu décalé pour ne pas passer sous la bande */}
        <div className="pl-[16mm] flex flex-col min-h-[29.7cm] relative">
          {/* Déco haut (premium) */}
          <div className="relative">
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-blue-700 to-red-600" />
            <div className="absolute -top-10 -left-10 h-28 w-28 rounded-[36px] bg-indigo-50 border border-indigo-100 rotate-12" />
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-[44px] bg-red-50 border border-red-100 -rotate-12" />
          </div>

          {/* Filigrane léger */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] flex items-center justify-center">
            <div className="text-[110px] font-black tracking-tight text-slate-900 rotate-[-18deg]">
              PNEUBOAT
            </div>
          </div>

          {/* Header */}
          <div className="relative px-8 py-6 border-b border-slate-200">
            <div className="flex justify-between items-start gap-6">
              <div className="w-1/2">
                {companyConfig.logo ? (
                  <img src={companyConfig.logo} className="h-12 object-contain mb-3" />
                ) : (
                  <div className="mb-2">
                    <h1 className="text-xl font-extrabold text-slate-900 leading-none">
                      PNEUBOAT <span className="text-red-600">AT</span>
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">{companyConfig.footerText}</p>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 leading-snug">
                  <div className="font-semibold text-slate-800">{companyConfig.address}</div>
                  <div>Tél: {companyConfig.phone} • Email: {companyConfig.email}</div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                  <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase shadow-sm">
                    {subType}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="font-mono text-base font-black text-slate-900">REF: {docNumber}</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Fait le {new Date(currentInvoice.date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="relative px-8 pt-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-600 to-red-600" />
              <div className="pl-3">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Client</p>
                <div className="mt-1 text-lg font-extrabold text-slate-900 break-words">
                  {safe(currentInvoice.clientName, 80) || "---"}
                </div>
                <div className="text-sm text-slate-600 mt-1 break-words">
                  {safe(currentInvoice.clientAddress, 180) || "---"}
                </div>

                {currentInvoice.clientIdNumber && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    <span className="text-[11px] font-bold text-slate-700">
                      ID: <span className="font-mono">{safe(currentInvoice.clientIdNumber, 32)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="relative flex-1 px-8 py-6">
            {isAtt ? (
              <>
                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                  Je soussigné, <strong>{companyConfig.managerName}</strong>, gérant de la société{" "}
                  <strong>{companyConfig.name}</strong>, certifie par la présente que le navire désigné
                  ci-après a été entièrement construit à neuf dans nos ateliers pour le compte de{" "}
                  <strong>{currentInvoice.clientName || ".........."}</strong>.
                </p>

                <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-center">
                    Fiche Technique
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-5 text-sm">
                    <Info label="Modèle" value={currentInvoice.boatDetails.model} />
                    <Info label="Numéro de série" value={currentInvoice.boatDetails.serialNumber} mono accent />
                    <Info label="Millésime" value={currentInvoice.boatDetails.year} />
                    <Info label="Homologation" value={currentInvoice.boatDetails.approvalNumber} />
                  </div>
                </div>

                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-600 italic">
                  Notes : {safe(currentInvoice.boatDetails.notes, 260)}
                </div>
              </>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[12px] font-extrabold">
                      <th className="py-3 text-left">Désignation</th>
                      <th className="py-3 text-center w-24">Qté</th>
                      {!isBL && (
                        <>
                          <th className="py-3 text-right w-32">P.U</th>
                          <th className="py-3 text-right w-40">Total</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {currentInvoice.items.map((it, i) => (
                      <tr key={it.id || i} className="align-top">
                        <td className="py-4 pr-4">
                          <div className="font-bold text-slate-900 break-words">
                            {safe(it.description, 60)}
                          </div>

                          {i === 0 && currentInvoice.boatDetails?.serialNumber && (
                            <div className="text-[12px] text-slate-500 mt-1">
                              Numéro de série:{" "}
                              <span className="font-mono text-red-600 font-bold">
                                {safe(currentInvoice.boatDetails.serialNumber, 32)}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 text-center font-bold">{Number(it.quantity || 0)}</td>

                        {!isBL && (
                          <>
                            <td className="py-4 text-right text-slate-600">
                              {Number(it.price || 0).toLocaleString("fr-FR")}
                            </td>
                            <td className="py-4 text-right font-extrabold text-slate-900">
                              {(Number(it.quantity || 0) * Number(it.price || 0)).toLocaleString("fr-FR")}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!isAtt && !isBL && (
                  <div className="mt-5 flex justify-end">
                    <div className="w-[340px] bg-slate-50 border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-600 to-red-600" />
                      <div className="pl-3">
                        <KRow label="Sous-total (HT)" value={formatCurrency(subtotal)} />
                        <KRow label={`TVA (${currentInvoice.tvaRate}%)`} value={formatCurrency(tvaAmt)} />
                        <div className="h-px bg-slate-200 my-2" />
                        <KRow label="TOTAL TTC" value={formatCurrency(total)} strong />
                      </div>
                    </div>
                  </div>
                )}

                {isFactOrPro && (
                  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-100 rounded-bl-[32px]" />
                    <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Arrêté la présente facture à la somme de :
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800 break-words">
                      {NumberToLetter(total)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* FOOTER collé en bas */}
          <div className="relative mt-auto border-t border-slate-200 px-8 py-5">
            <div className="grid grid-cols-3 gap-4 text-[11px] text-slate-500">
              <div className="border border-slate-200 rounded-2xl p-3">
                <div className="font-extrabold text-slate-700 mb-1">Banque</div>
                <div>BANQUE: <span className="font-semibold text-slate-800">{companyConfig.bankName}</span></div>
                <div>RIB: <span className="font-mono text-slate-800">{companyConfig.bankRib}</span></div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-3">
                <div className="font-extrabold text-slate-700 mb-1">Fiscal</div>
                <div>RC: <span className="font-semibold text-slate-800">{companyConfig.rc}</span></div>
                <div>NIF: <span className="font-semibold text-slate-800">{companyConfig.nif}</span></div>
                <div>NIS: <span className="font-semibold text-slate-800">{companyConfig.nis}</span></div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-3">
                <div className="font-extrabold text-slate-700 mb-1">Société</div>
                <div className="font-semibold text-slate-800">{companyConfig.footerText}</div>
                <div className="text-slate-400">Pneuboat • Oran</div>
              </div>
            </div>

            <div className="mt-4 flex justify-between gap-4 text-[10px] text-slate-400">
              <div className="flex-1 border border-dashed border-slate-200 rounded-2xl p-3 text-center">
                Cachet & Signature gérant
              </div>
              <div className="flex-1 border border-dashed border-slate-200 rounded-2xl p-3 text-center">
                Signature client
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------ UI SECTIONS ------------------ */
  const renderHome = () => (
    <div className="pb-container">
      <div className="pb-card p-6">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Station <span className="text-red-600">•</span> Documents
        </h2>
        <p className="pb-muted mt-1">Créer rapidement un document.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
          <ActionCard title="Dossier complet" icon={<FolderOpen size={18} />} primary onClick={() => startNew("dossier")} />
          <ActionCard title="Facture" icon={<FileText size={18} />} onClick={() => startNew("facture")} />
          <ActionCard title="Proforma" icon={<ClipboardList size={18} />} onClick={() => startNew("proforma")} />
          <ActionCard title="Livraison" icon={<PackageCheck size={18} />} onClick={() => startNew("livraison")} />
          <ActionCard title="Attestation" icon={<Anchor size={18} />} onClick={() => startNew("attestation")} />
        </div>
      </div>
    </div>
  );

  const renderEdit = () => {
    if (!currentInvoice) return null;

    return (
      <div className="pb-container">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
          {/* Form = caché au print */}
          <div className="pb-card p-6 print-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold tracking-tight">
                Saisie <span className="text-indigo-600">•</span> {currentInvoice.type}
              </h3>
              <button className="pb-btn pb-btn-ghost" onClick={() => setView("history")} title="Fermer">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Client">
                <input className="pb-input" value={currentInvoice.clientName} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientName: e.target.value })} />
              </Field>

              <Field label="Adresse">
                <textarea className="pb-input" rows={3} value={currentInvoice.clientAddress} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientAddress: e.target.value })} />
              </Field>

              <Field label="ID / Passeport">
                <input className="pb-input font-mono" value={currentInvoice.clientIdNumber} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientIdNumber: e.target.value })} />
              </Field>

              <div className="pb-card-soft p-4">
                <div className="text-sm font-extrabold text-slate-800">
                  Configuration <span className="text-red-600">•</span> Unité
                </div>

                <div className="mt-3 space-y-3">
                  <Field label="Modèle naval">
                    <select
                      className="pb-input"
                      value={companyConfig.boatModels.find((m) => m.name === currentInvoice.boatDetails.model)?.id || ""}
                      onChange={(e) => selectModel(e.target.value)}
                    >
                      <option value="">— Sélection —</option>
                      {companyConfig.boatModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} • {m.length}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Numéro de série">
                    <input
                      className="pb-input font-mono"
                      value={currentInvoice.boatDetails.serialNumber}
                      onChange={(e) => setCurrentInvoice({ ...currentInvoice, boatDetails: { ...currentInvoice.boatDetails, serialNumber: e.target.value.toUpperCase() } })}
                      placeholder="DZ-PNB-0000"
                    />
                  </Field>

                  <Field label="Valeur (DA)">
                    <input
                      type="number"
                      className="pb-input"
                      value={currentInvoice.items?.[0]?.price || 0}
                      onChange={(e) => {
                        const ni = [...currentInvoice.items];
                        ni[0] = { ...ni[0], price: parseFloat(e.target.value) || 0 };
                        setCurrentInvoice({ ...currentInvoice, items: ni });
                      }}
                    />
                  </Field>

                  <Field label="TVA (%)">
                    <input
                      type="number"
                      className="pb-input"
                      value={currentInvoice.tvaRate}
                      onChange={(e) => setCurrentInvoice({ ...currentInvoice, tvaRate: Number(e.target.value || 0) })}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={saveInvoice} disabled={busy} className="pb-btn pb-btn-primary flex-1 py-3">
                <Save size={16} /> {busy ? "En cours..." : "Archiver"}
              </button>
              <button onClick={handlePrint} className="pb-btn pb-btn-ghost py-3">
                <Printer size={16} /> Imprimer
              </button>
            </div>
          </div>

          {/* Preview = imprimable */}
          <div className="pb-card p-4 bg-white min-w-0">
            <div className="flex justify-center">
              <div className="w-full overflow-auto">
                <div className="flex justify-center origin-top scale-[0.86] xl:scale-100">
                  <div id="printable-area">
                    {currentInvoice.type === "dossier" ? (
                      <div className="space-y-10">
                        <RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} />
                        <RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} />
                        <RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} />
                      </div>
                    ) : (
                      <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <style>{`
              @media print {
                .scale-\\[0\\.86\\] { transform: none !important; }
                #printable-area { transform: none !important; }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  };

  const filteredHistory = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return invoiceHistory;
    return invoiceHistory.filter((i) => (i.clientName || "").toLowerCase().includes(q) || (i.number || "").toLowerCase().includes(q));
  }, [invoiceHistory, searchTerm]);

  const renderHistory = () => (
    <div className="pb-container">
      <div className="pb-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Archives</h2>
            <p className="pb-muted mt-1">Documents enregistrés sur la base de données.</p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative w-full md:w-[420px]">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input className="pb-input pl-9" placeholder="Rechercher (client, numéro…)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button className="pb-btn pb-btn-ghost" onClick={loadHistory} disabled={busy}>
              ↻
            </button>
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

        {busy && <div className="mt-3 text-sm text-slate-500">Chargement…</div>}
      </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="pb-container">
      <div className="pb-card p-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Plans</h2>
          <p className="pb-muted mt-1">Uploader et imprimer les documents techniques par modèle.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {companyConfig.boatModels.map((m) => (
            <div key={m.id} className="pb-card p-5">
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {m.name} <span className="text-red-600">•</span>
                </div>
                <div className="text-sm pb-muted">{m.type} • {m.length}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {["fiche", "jauge", "plan", "approbation"].map((doc) => (
                  <label
                    key={doc}
                    className={`cursor-pointer border rounded-2xl p-3 text-center text-sm font-bold transition ${
                      modelDocs[m.id]?.[doc]
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Upload size={16} />
                      <span className="capitalize">{doc}</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocUpload(e, m.id, doc)} />
                  </label>
                ))}
              </div>

              <button
                className="pb-btn pb-btn-primary w-full mt-4 py-3"
                onClick={() => {
                  if (!modelDocs[m.id]) return alert("Plans manquants.");
                  setPrintModelId(m.id);
                  setView("print_tech_view");
                }}
              >
                Voir dossier
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrintTechView = () => (
    <div className="pb-container">
      <div className="pb-card p-6 print-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm pb-muted">Unité</div>
            <div className="text-xl font-extrabold">
              {companyConfig.boatModels.find((x) => x.id === printModelId)?.name}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="pb-btn pb-btn-ghost" onClick={() => setView("database")}>
              ← Retour
            </button>
            <button className="pb-btn pb-btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {["fiche", "jauge", "plan", "approbation"].map((doc) => (
          modelDocs[printModelId]?.[doc] && (
            <div key={doc} className="pb-card p-6 bg-white flex items-center justify-center">
              <img src={modelDocs[printModelId][doc]} alt={doc} className="max-w-full max-h-[80vh] object-contain" />
            </div>
          )
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="pb-container">
      <div className="pb-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Configuration</h2>
            <p className="pb-muted mt-1">Modifier les infos société + modèles.</p>
          </div>
          <button className="pb-btn pb-btn-ghost" onClick={() => setView("list")}>
            Fermer
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="pb-card-soft p-5">
            <div className="text-sm font-extrabold text-slate-800 mb-3">Logo</div>
            <input type="file" onChange={handleLogoUpload} className="pb-input" />
            <div className="text-xs pb-muted mt-2">Le logo reste sur ton navigateur (localStorage).</div>
          </div>

          <div className="pb-card-soft p-5 space-y-3">
            <Field label="Gérant">
              <input
                className="pb-input"
                value={companyConfig.managerName}
                onChange={(e) => {
                  const nc = { ...companyConfig, managerName: e.target.value };
                  setCompanyConfig(nc);
                  saveLocal(nc, modelDocs);
                }}
              />
            </Field>

            <Field label="Banque">
              <input
                className="pb-input"
                value={companyConfig.bankName}
                onChange={(e) => {
                  const nc = { ...companyConfig, bankName: e.target.value };
                  setCompanyConfig(nc);
                  saveLocal(nc, modelDocs);
                }}
              />
            </Field>

            <Field label="RIB">
              <input
                className="pb-input font-mono"
                value={companyConfig.bankRib}
                onChange={(e) => {
                  const nc = { ...companyConfig, bankRib: e.target.value };
                  setCompanyConfig(nc);
                  saveLocal(nc, modelDocs);
                }}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 pb-card-soft p-5">
          <div className="text-sm font-extrabold text-slate-800 mb-3">Modèles</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyConfig.boatModels.map((m, idx) => (
              <div key={m.id} className="pb-card p-4">
                <Field label="Nom">
                  <input
                    className="pb-input"
                    value={m.name}
                    onChange={(e) => {
                      const next = [...companyConfig.boatModels];
                      next[idx] = { ...next[idx], name: e.target.value };
                      const nc = { ...companyConfig, boatModels: next };
                      setCompanyConfig(nc);
                      saveLocal(nc, modelDocs);
                    }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Field label="Type">
                    <input
                      className="pb-input"
                      value={m.type}
                      onChange={(e) => {
                        const next = [...companyConfig.boatModels];
                        next[idx] = { ...next[idx], type: e.target.value };
                        const nc = { ...companyConfig, boatModels: next };
                        setCompanyConfig(nc);
                        saveLocal(nc, modelDocs);
                      }}
                    />
                  </Field>
                  <Field label="Longueur">
                    <input
                      className="pb-input"
                      value={m.length}
                      onChange={(e) => {
                        const next = [...companyConfig.boatModels];
                        next[idx] = { ...next[idx], length: e.target.value };
                        const nc = { ...companyConfig, boatModels: next };
                        setCompanyConfig(nc);
                        saveLocal(nc, modelDocs);
                      }}
                    />
                  </Field>
                </div>
                <div className="mt-2">
                  <Field label="Homologation">
                    <input
                      className="pb-input"
                      value={m.approvalNumber}
                      onChange={(e) => {
                        const next = [...companyConfig.boatModels];
                        next[idx] = { ...next[idx], approvalNumber: e.target.value };
                        const nc = { ...companyConfig, boatModels: next };
                        setCompanyConfig(nc);
                        saveLocal(nc, modelDocs);
                      }}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="pb-btn pb-btn-primary" onClick={() => setView("list")}>
            OK
          </button>
        </div>
      </div>
    </div>
  );

  /* ------------------ AUTH SCREEN ------------------ */
  if (!session) {
    return (
      <div className="pb-page flex items-center justify-center">
        <div className="pb-container w-full flex justify-center">
          <div className="pb-card p-8 w-full max-w-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight">
                  Pneuboat <span className="text-red-600">•</span>
                </div>
                <div className="text-sm pb-muted">Connexion admin (Supabase)</div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Email">
                <input className="pb-input" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field label="Mot de passe">
                <input className="pb-input" type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} placeholder="••••••••" />
              </Field>

              {authMsg && <div className="text-sm text-red-600 font-bold">{authMsg}</div>}

              <div className="flex gap-2">
                <button onClick={signIn} className="pb-btn pb-btn-primary flex-1 py-3">
                  Se connecter
                </button>
                <button onClick={signUp} className="pb-btn pb-btn-ghost flex-1 py-3">
                  Créer compte
                </button>
              </div>

              <div className="text-xs pb-muted">
                Si tu as “Email not confirmed”, règle Auth dans Supabase (confirmation email).
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------ MAIN ------------------ */
  return (
    <div className="pb-page font-sans antialiased">
      <nav className="pb-nav print-hidden">
        <div className="pb-container flex items-center justify-between">
          <button onClick={() => setView("list")} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <LayoutDashboard size={18} />
            </div>
            <div className="leading-tight text-left">
              <div className="font-extrabold tracking-tight">
                Pneuboat <span className="text-red-600">•</span>
              </div>
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
            <button onClick={() => setView("database")} className={`pb-tab ${view === "database" || view === "print_tech_view" ? "pb-tab-active" : ""}`}>
              <Database size={16} /> Plans
            </button>
            <button onClick={() => setView("settings")} className={`pb-tab ${view === "settings" ? "pb-tab-active" : ""}`}>
              <Settings size={16} /> Config
            </button>

            <div className="w-px h-7 bg-slate-200 mx-2" />

            <button onClick={signOut} className="pb-btn pb-btn-ghost">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {view === "list" && renderHome()}
      {view === "edit" && renderEdit()}
      {view === "history" && renderHistory()}
      {view === "database" && renderDatabase()}
      {view === "print_tech_view" && renderPrintTechView()}
      {view === "settings" && renderSettings()}
    </div>
  );
}

/* ------------------ SMALL COMPONENTS ------------------ */
function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-extrabold text-slate-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

function ActionCard({ title, icon, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`text-left pb-card p-4 hover:bg-slate-50 transition ${
        primary ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${
          primary ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
        }`}>
          {icon}
        </div>
        <div className="font-extrabold">{title}</div>
      </div>
      <div className="text-sm pb-muted mt-2">Créer</div>
    </button>
  );
}

function Info({ label, value, mono, accent }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`${mono ? "font-mono" : "font-semibold"} ${accent ? "text-indigo-600 font-extrabold" : "text-slate-900"} mt-1 break-words`}>
        {value || "—"}
      </div>
    </div>
  );
}

function KRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <div className={`text-sm ${strong ? "font-extrabold text-slate-900" : "text-slate-600 font-semibold"}`}>{label}</div>
      <div className={`text-sm ${strong ? "font-extrabold text-slate-900" : "text-slate-800 font-bold"}`}>{value}</div>
    </div>
  );
}
