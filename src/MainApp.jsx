import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Printer, Save, FileText, FolderOpen, ClipboardList,
  Database, History, Search, X, Upload, Settings, LayoutDashboard, Anchor,
  PackageCheck, ShieldCheck
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

const calculateSubtotal = (items) =>
  (items || []).reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

const calculateTotal = (items, tvaRate) =>
  calculateSubtotal(items) * (1 + Number(tvaRate || 0) / 100);

const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";

const labelDoc = (t) => {
  if (t === "facture") return "FACTURE";
  if (t === "proforma") return "FACTURE PROFORMA";
  if (t === "livraison") return "BON DE LIVRAISON";
  if (t === "attestation") return "ATTESTATION DE CONSTRUCTION";
  if (t === "dossier") return "DOSSIER";
  return String(t || "").toUpperCase();
};

/* ------------------ APP ------------------ */
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
    if (error) return alert(error.message);

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
        boatDetails: d.boatDetails || {
          model: "",
          serialNumber: "",
          length: "",
          approvalNumber: "",
          year: "2026",
          notes: "Je certifie que le navire a été construit à neuf selon les spécifications techniques.",
        },
        showPayment: d.showPayment ?? true,
        paymentMethod: d.paymentMethod || "virement",
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
      const next = { ...modelDocs, [modelId]: { ...(modelDocs[modelId] || {}), [docKey]: reader.result } };
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

      showPayment: true,
      paymentMethod: "virement",
      clientChequeNumber: "",

      boatDetails: {
        model: "",
        serialNumber: "",
        length: "",
        approvalNumber: "",
        year: "2026",
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

    const designation =
      `Bateau ${String(m.type || "").toLowerCase()} ${m.name}`.replace(/\s+/g, " ").trim();

    setCurrentInvoice((prev) => ({
      ...prev,
      boatDetails: { ...prev.boatDetails, model: m.name, length: m.length, approvalNumber: m.approvalNumber },
      items: [{ ...prev.items[0], description: designation }],
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
      if (error) { setBusy(false); return alert(error.message); }
      invoiceId = data.id;
    } else {
      const { error } = await supabase.from("invoices").update(payload).eq("id", invoiceId);
      if (error) { setBusy(false); return alert(error.message); }
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
      if (itemsErr) { setBusy(false); return alert(itemsErr.message); }
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
    // petit délai = Safari iPad + Vercel + styles print
    setTimeout(() => window.print(), 50);
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

    const paymentLabel =
      currentInvoice.paymentMethod === "virement"
        ? "Virement bancaire"
        : currentInvoice.paymentMethod === "espece"
          ? "Espèces"
          : "Chèque";

    return (
      <div className="pb-doc pb-print-page">
        <div className="pb-ribbon" />
        <div className="pb-doc-inner">

          {/* HEADER */}
          <div style={{ padding: "18px 22px 12px 22px", borderBottom: "1px solid var(--pb-line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: "60%" }}>
                {companyConfig.logo ? (
                  <img src={companyConfig.logo} alt="logo" style={{ height: 44, objectFit: "contain", marginBottom: 8 }} />
                ) : (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>
                      PNEUBOAT <span style={{ color: "var(--pb-red)" }}>AT</span>
                    </div>
                    <div className="pb-muted pb-clamp-1" style={{ fontSize: 12, fontWeight: 700 }}>
                      {companyConfig.footerText}
                    </div>
                  </div>
                )}

                <div className="pb-muted" style={{ fontSize: 11, lineHeight: 1.3 }}>
                  <div className="pb-clamp-2" style={{ fontWeight: 700, color: "#111827" }}>{companyConfig.address}</div>
                  <div className="pb-clamp-1">Tél: {companyConfig.phone} • Email: {companyConfig.email}</div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, var(--pb-blue2), var(--pb-blue))",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 11,
                  letterSpacing: 0.6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--pb-red)" }} />
                  {labelDoc(subType)}
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 900 }}>
                    REF: {docNumber}
                  </div>
                  <div className="pb-muted" style={{ fontSize: 11, fontWeight: 700 }}>
                    Fait le {new Date(currentInvoice.date).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CLIENT */}
          <div style={{ padding: "14px 22px 0 22px" }}>
            <div style={{
              border: "1px solid var(--pb-line)",
              borderRadius: 18,
              background: "#fbfbfe",
              padding: 14,
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: 8,
                background: "linear-gradient(180deg, var(--pb-blue2), var(--pb-red))"
              }} />
              <div style={{ paddingLeft: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 900, color: "var(--pb-muted)" }}>
                  CLIENT
                </div>
                <div className="pb-clamp-1" style={{ fontSize: 18, fontWeight: 900, marginTop: 3 }}>
                  {currentInvoice.clientName || "—"}
                </div>
                <div className="pb-clamp-2" style={{ marginTop: 4, fontSize: 12, color: "#475569", fontWeight: 700, lineHeight: 1.25 }}>
                  {currentInvoice.clientAddress || "—"}
                </div>

                {currentInvoice.clientIdNumber && (
                  <div style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid var(--pb-line)",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "#fff"
                  }}>
                    <ShieldCheck size={14} color={"#123b9a"} />
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#334155" }} className="pb-clamp-1">
                      ID: <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--pb-red)" }}>{currentInvoice.clientIdNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BODY (bloqué A4) */}
          <div className="pb-doc-body" style={{ padding: "12px 22px 0 22px" }}>
            {isAtt ? (
              <div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.35 }} className="pb-clamp-3">
                  Je soussigné, <b>{companyConfig.managerName}</b>, gérant de la société <b>{companyConfig.name}</b>,
                  certifie par la présente que le navire désigné ci-après a été entièrement construit à neuf
                  dans nos ateliers pour le compte de <b>{currentInvoice.clientName || ".........."}</b>.
                </div>

                <div style={{ marginTop: 12, border: "1px solid var(--pb-line)", borderRadius: 18, overflow: "hidden" }}>
                  <div style={{
                    background: "#0b1220",
                    color: "#fff",
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1,
                    textAlign: "center"
                  }}>
                    FICHE TECHNIQUE
                  </div>
                  <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Info label="Modèle" value={currentInvoice.boatDetails.model} />
                    <Info label="Numéro de série" value={currentInvoice.boatDetails.serialNumber} mono accent />
                    <Info label="Année 2026" value={"2026"} />
                    <Info label="Homologation" value={currentInvoice.boatDetails.approvalNumber} />
                  </div>
                </div>

                <div style={{
                  marginTop: 12,
                  border: "1px solid var(--pb-line)",
                  borderRadius: 18,
                  padding: 12,
                  background: "#fbfbfe",
                  fontSize: 12,
                  color: "#475569"
                }} className="pb-clamp-3">
                  Notes : {currentInvoice.boatDetails.notes}
                </div>
              </div>
            ) : (
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--pb-line)", color: "#64748b" }}>
                      <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 900 }}>Désignation</th>
                      <th style={{ textAlign: "center", width: 60, padding: "8px 0", fontWeight: 900 }}>Qté</th>
                      {!isBL && (
                        <>
                          <th style={{ textAlign: "right", width: 90, padding: "8px 0", fontWeight: 900 }}>P.U</th>
                          <th style={{ textAlign: "right", width: 100, padding: "8px 0", fontWeight: 900 }}>Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(currentInvoice.items || []).map((it, i) => (
                      <tr key={it.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 0" }}>
                          <div className="pb-clamp-1" style={{ fontWeight: 900, color: "#0f172a" }}>
                            {it.description || "—"}
                          </div>

                          {i === 0 && currentInvoice.boatDetails?.serialNumber && (
                            <div className="pb-clamp-1" style={{ marginTop: 4, color: "#64748b", fontWeight: 800 }}>
                              Numéro de série:{" "}
                              <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--pb-red)" }}>
                                {currentInvoice.boatDetails.serialNumber}
                              </span>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "10px 0", textAlign: "center", fontWeight: 900 }}>
                          {Number(it.quantity || 0)}
                        </td>

                        {!isBL && (
                          <>
                            <td style={{ padding: "10px 0", textAlign: "right", color: "#475569", fontWeight: 800 }}>
                              {Number(it.price || 0).toLocaleString("fr-FR")}
                            </td>
                            <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 900 }}>
                              {(Number(it.quantity || 0) * Number(it.price || 0)).toLocaleString("fr-FR")}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paiement + Totaux */}
                {!isBL && (
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      {currentInvoice.showPayment && (
                        <div style={{
                          border: "1px solid var(--pb-line)",
                          borderRadius: 18,
                          padding: 12,
                          background: "#fbfbfe",
                          position: "relative",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            position: "absolute",
                            left: 0, top: 0, bottom: 0,
                            width: 8,
                            background: "linear-gradient(180deg, var(--pb-blue2), var(--pb-red))"
                          }} />
                          <div style={{ paddingLeft: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", letterSpacing: 1 }}>
                              MODE DE PAIEMENT
                            </div>
                            <div className="pb-clamp-1" style={{ marginTop: 4, fontWeight: 900 }}>
                              {paymentLabel}
                            </div>
                            {currentInvoice.paymentMethod === "cheque" && (
                              <div className="pb-clamp-1" style={{ marginTop: 4, fontSize: 12, fontWeight: 900, color: "#334155" }}>
                                N° chèque :{" "}
                                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--pb-red)" }}>
                                  {currentInvoice.clientChequeNumber || "—"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{
                        width: "100%",
                        border: "1px solid var(--pb-line)",
                        borderRadius: 18,
                        padding: 12,
                        background: "#fbfbfe",
                        position: "relative",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          position: "absolute",
                          left: 0, top: 0, bottom: 0,
                          width: 8,
                          background: "linear-gradient(180deg, var(--pb-blue2), var(--pb-red))"
                        }} />
                        <div style={{ paddingLeft: 10 }}>
                          <KRow label="Sous-total (HT)" value={formatCurrency(subtotal)} />
                          <KRow label={`TVA (${currentInvoice.tvaRate}%)`} value={formatCurrency(tvaAmt)} />
                          <div style={{ height: 1, background: "var(--pb-line)", margin: "8px 0" }} />
                          <KRow label="TOTAL TTC" value={formatCurrency(total)} strong />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isFactOrPro && (
                  <div style={{
                    marginTop: 10,
                    border: "1px solid var(--pb-line)",
                    borderRadius: 18,
                    padding: 12,
                    background: "#fbfbfe",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      position: "absolute",
                      top: 0, right: 0,
                      width: 90, height: 90,
                      background: "rgba(18,59,154,.10)",
                      borderBottomLeftRadius: 26
                    }} />
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", letterSpacing: 1 }}>
                      ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE :
                    </div>
                    <div className="pb-clamp-2" style={{ marginTop: 4, fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                      {NumberToLetter(total)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER + SIGNATURES (toujours en bas) */}
          <div className="pb-doc-footer" style={{ padding: "10px 22px 16px 22px" }}>
            {/* Signatures GRANDES */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{
                border: "2px dashed #cbd5e1",
                borderRadius: 18,
                height: 120,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#475569", letterSpacing: 1 }}>
                  CACHET & SIGNATURE GÉRANT
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>Tampon / Signature ici</div>
              </div>

              <div style={{
                border: "2px dashed #cbd5e1",
                borderRadius: 18,
                height: 120,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#475569", letterSpacing: 1 }}>
                  SIGNATURE CLIENT
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>Signature ici</div>
              </div>
            </div>

            {/* Footer fiscal/bancaire (tout en bas) */}
            <div style={{ borderTop: "1px solid var(--pb-line)", paddingTop: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 11, color: "#64748b" }}>
                <FootCard title="Banque">
                  <div>BANQUE: <b style={{ color: "#0f172a" }}>{companyConfig.bankName}</b></div>
                  <div>RIB: <span style={{ fontFamily: "ui-monospace, monospace", color: "#0f172a", fontWeight: 900 }}>{companyConfig.bankRib}</span></div>
                </FootCard>

                <FootCard title="Fiscal">
                  <div>RC: <b style={{ color: "#0f172a" }}>{companyConfig.rc}</b></div>
                  <div>NIF: <b style={{ color: "#0f172a" }}>{companyConfig.nif}</b></div>
                  <div>NIS: <b style={{ color: "#0f172a" }}>{companyConfig.nis}</b></div>
                </FootCard>

                <FootCard title="Société">
                  <div className="pb-clamp-2" style={{ color: "#0f172a", fontWeight: 900 }}>{companyConfig.footerText}</div>
                  <div style={{ color: "#94a3b8", fontWeight: 900 }}>Pneuboat • Oran</div>
                </FootCard>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  /* ------------------ UI ------------------ */
  const renderHome = () => (
    <div className="pb-container">
      <div className="pb-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.4 }}>
              Station <span style={{ color: "var(--pb-red)" }}>•</span> Documents
            </div>
            <div className="pb-muted" style={{ marginTop: 2, fontWeight: 700 }}>
              Créer rapidement un document (dossier = 3 pages).
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
          <ActionCard title="Dossier complet" icon={<FolderOpen size={18} />} primary onClick={() => startNew("dossier")} />
          <ActionCard title="Facture" icon={<FileText size={18} />} onClick={() => startNew("facture")} />
          <ActionCard title="Proforma" icon={<ClipboardList size={18} />} onClick={() => startNew("proforma")} />
          <ActionCard title="Bon de livraison" icon={<PackageCheck size={18} />} onClick={() => startNew("livraison")} />
          <ActionCard title="Attestation" icon={<Anchor size={18} />} onClick={() => startNew("attestation")} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="pb-btn pb-btn-primary" onClick={() => setView("history")}>
            <History size={16} /> Voir archives
          </button>
          <button className="pb-btn pb-btn-ghost" onClick={() => setView("settings")}>
            <Settings size={16} /> Configuration
          </button>
        </div>
      </div>
    </div>
  );

  const renderEdit = () => {
    if (!currentInvoice) return null;

    const modelId = companyConfig.boatModels.find((m) => m.name === currentInvoice.boatDetails.model)?.id || "";

    return (
      <div className="pb-container">
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "start" }}>
          {/* Form */}
          <div className="pb-card print-hidden" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                Saisie <span style={{ color: "var(--pb-blue2)" }}>•</span> {labelDoc(currentInvoice.type)}
              </div>
              <button className="pb-btn pb-btn-ghost" onClick={() => setView("history")} title="Fermer">
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <Field label="Client">
                <input className="pb-input" value={currentInvoice.clientName} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientName: e.target.value })} />
              </Field>

              <Field label="Adresse">
                <textarea className="pb-input" rows={3} value={currentInvoice.clientAddress} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientAddress: e.target.value })} />
              </Field>

              <Field label="ID / Passeport">
                <input className="pb-input" value={currentInvoice.clientIdNumber} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientIdNumber: e.target.value })} />
              </Field>

              <div className="pb-card-soft" style={{ padding: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  Unité <span style={{ color: "var(--pb-red)" }}>•</span>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <Field label="Modèle naval">
                    <select className="pb-input" value={modelId} onChange={(e) => selectModel(e.target.value)}>
                      <option value="">— Sélection —</option>
                      {companyConfig.boatModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} • {m.length}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Numéro de série">
                    <input
                      className="pb-input"
                      value={currentInvoice.boatDetails.serialNumber}
                      onChange={(e) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          boatDetails: { ...currentInvoice.boatDetails, serialNumber: e.target.value.toUpperCase() },
                        })
                      }
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

              {/* Paiement */}
              <div className="pb-card-soft" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>
                    Paiement <span style={{ color: "var(--pb-red)" }}>•</span>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, color: "#475569", fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={!!currentInvoice.showPayment}
                      onChange={(e) => setCurrentInvoice({ ...currentInvoice, showPayment: e.target.checked })}
                    />
                    Afficher sur document
                  </label>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <Field label="Mode de paiement">
                    <select
                      className="pb-input"
                      value={currentInvoice.paymentMethod}
                      onChange={(e) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          paymentMethod: e.target.value,
                          clientChequeNumber: e.target.value === "cheque" ? currentInvoice.clientChequeNumber : "",
                        })
                      }
                    >
                      <option value="virement">Virement bancaire</option>
                      <option value="espece">Espèces</option>
                      <option value="cheque">Chèque</option>
                    </select>
                  </Field>

                  {currentInvoice.paymentMethod === "cheque" && (
                    <Field label="Numéro de chèque">
                      <input
                        className="pb-input"
                        value={currentInvoice.clientChequeNumber}
                        onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientChequeNumber: e.target.value })}
                        placeholder="000000"
                      />
                    </Field>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveInvoice} disabled={busy} className="pb-btn pb-btn-primary" style={{ flex: 1, padding: "12px 12px" }}>
                  <Save size={16} /> {busy ? "En cours..." : "Archiver"}
                </button>
                <button onClick={handlePrint} className="pb-btn pb-btn-ghost" style={{ padding: "12px 12px" }}>
                  <Printer size={16} /> Imprimer
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="pb-card" style={{ padding: 10, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 6 }}>
              <div style={{ fontWeight: 900 }}>
                Aperçu A4 <span style={{ color: "var(--pb-red)" }}>•</span>
              </div>
              <div className="pb-muted" style={{ fontWeight: 800, fontSize: 12 }}>
                1 doc = 1 page
              </div>
            </div>

            <div style={{ overflow: "auto", padding: 6 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div id="printable-area">
                  {currentInvoice.type === "dossier" ? (
                    <div>
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

        </div>
      </div>
    );
  };

  const filteredHistory = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return invoiceHistory;
    return invoiceHistory.filter((i) =>
      (i.clientName || "").toLowerCase().includes(q) || (i.number || "").toLowerCase().includes(q)
    );
  }, [invoiceHistory, searchTerm]);

  const renderHistory = () => (
    <div className="pb-container">
      <div className="pb-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Archives</div>
            <div className="pb-muted" style={{ fontWeight: 800 }}>Documents enregistrés (Supabase).</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", width: 380, maxWidth: "70vw" }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
              <input className="pb-input" style={{ paddingLeft: 34 }} placeholder="Rechercher (client, numéro…)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button className="pb-btn pb-btn-ghost" onClick={loadHistory} disabled={busy} title="Rafraîchir">↻</button>
          </div>
        </div>

        <div style={{ marginTop: 12, border: "1px solid var(--pb-line)", borderRadius: 18, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#fbfbfe", color: "#64748b" }}>
              <tr>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 900 }}>Date</th>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 900 }}>Référence</th>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 900 }}>Client</th>
                <th style={{ textAlign: "right", padding: 12, fontWeight: 900 }}>Total</th>
                <th style={{ textAlign: "right", padding: 12, fontWeight: 900 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((inv) => (
                <tr key={inv.db_id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 12, color: "#475569", fontWeight: 800 }}>{inv.date}</td>
                  <td style={{ padding: 12, fontFamily: "ui-monospace, monospace", fontWeight: 900 }}>{inv.number}</td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{inv.clientName}</td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatCurrency(calculateTotal(inv.items, inv.tvaRate))}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
                  <td colSpan={5} style={{ padding: 18, textAlign: "center", color: "#64748b", fontWeight: 900 }}>
                    {busy ? "Chargement..." : "Aucun document."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {busy && <div style={{ marginTop: 10 }} className="pb-muted">Chargement…</div>}
      </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="pb-container">
      <div className="pb-card" style={{ padding: 18 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Plans</div>
          <div className="pb-muted" style={{ fontWeight: 800 }}>Uploader et imprimer les documents techniques par modèle.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
          {companyConfig.boatModels.map((m) => (
            <div key={m.id} className="pb-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>
                {m.name} <span style={{ color: "var(--pb-red)" }}>•</span>
              </div>
              <div className="pb-muted" style={{ fontWeight: 800, fontSize: 12 }}>
                {m.type} • {m.length}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                {["fiche", "jauge", "plan", "approbation"].map((doc) => (
                  <label
                    key={doc}
                    style={{
                      cursor: "pointer",
                      border: "1px solid var(--pb-line)",
                      borderRadius: 16,
                      padding: 10,
                      background: modelDocs[m.id]?.[doc] ? "rgba(18,59,154,.08)" : "#fff",
                      fontWeight: 900,
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Upload size={16} />
                      <span style={{ textTransform: "capitalize" }}>{doc}</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocUpload(e, m.id, doc)} />
                  </label>
                ))}
              </div>

              <button
                className="pb-btn pb-btn-primary"
                style={{ width: "100%", marginTop: 10, padding: "12px 12px" }}
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
      <div className="pb-card print-hidden" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="pb-muted" style={{ fontWeight: 900 }}>Unité</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {companyConfig.boatModels.find((x) => x.id === printModelId)?.name}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pb-btn pb-btn-ghost" onClick={() => setView("database")}>← Retour</button>
            <button className="pb-btn pb-btn-primary" onClick={handlePrint}><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {["fiche", "jauge", "plan", "approbation"].map((doc) => (
          modelDocs[printModelId]?.[doc] && (
            <div key={doc} className="pb-card" style={{ padding: 18, background: "#fff", display: "flex", justifyContent: "center" }}>
              <img src={modelDocs[printModelId][doc]} alt={doc} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
            </div>
          )
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="pb-container">
      <div className="pb-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Configuration</div>
            <div className="pb-muted" style={{ fontWeight: 800 }}>Logo, banque, modèles.</div>
          </div>
          <button className="pb-btn pb-btn-ghost" onClick={() => setView("list")}>Fermer</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div className="pb-card-soft" style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Logo</div>
            <input type="file" onChange={handleLogoUpload} className="pb-input" />
            <div className="pb-muted" style={{ marginTop: 8, fontWeight: 800, fontSize: 12 }}>Le logo reste sur ton navigateur (localStorage).</div>
          </div>

          <div className="pb-card-soft" style={{ padding: 14, display: "grid", gap: 10 }}>
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
                className="pb-input"
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

        <div className="pb-card-soft" style={{ padding: 14, marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Modèles</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {companyConfig.boatModels.map((m, idx) => (
              <div key={m.id} className="pb-card" style={{ padding: 12 }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
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

                <div style={{ marginTop: 8 }}>
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

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button className="pb-btn pb-btn-primary" onClick={() => setView("list")}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ------------------ AUTH ------------------ */
  if (!session) {
    return (
      <div className="pb-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="pb-container" style={{ display: "flex", justifyContent: "center" }}>
          <div className="pb-card" style={{ padding: 20, width: "100%", maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: "linear-gradient(135deg, var(--pb-blue2), var(--pb-blue))",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <LayoutDashboard size={18} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  Pneuboat <span style={{ color: "var(--pb-red)" }}>•</span>
                </div>
                <div className="pb-muted" style={{ fontWeight: 800, fontSize: 12 }}>Connexion admin (Supabase)</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <Field label="Email">
                <input className="pb-input" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field label="Mot de passe">
                <input className="pb-input" type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} placeholder="••••••••" />
              </Field>

              {authMsg && <div style={{ color: "var(--pb-red)", fontWeight: 900, fontSize: 13 }}>{authMsg}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={signIn} className="pb-btn pb-btn-primary" style={{ flex: 1, padding: "12px 12px" }}>
                  Se connecter
                </button>
                <button onClick={signUp} className="pb-btn pb-btn-ghost" style={{ flex: 1, padding: "12px 12px" }}>
                  Créer compte
                </button>
              </div>

              <div className="pb-muted" style={{ fontSize: 12, fontWeight: 800 }}>
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
    <div className="pb-page">
      <nav className="pb-nav print-hidden">
        <div className="pb-container">
          <button onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", cursor: "pointer" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 14,
              background: "linear-gradient(135deg, var(--pb-blue2), var(--pb-blue))",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <LayoutDashboard size={18} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 900 }}>
                Pneuboat <span style={{ color: "var(--pb-red)" }}>•</span>
              </div>
              <div className="pb-muted" style={{ fontWeight: 800, fontSize: 12 }}>Facturation & Documents</div>
            </div>
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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

            <div style={{ width: 1, height: 26, background: "var(--pb-line)", margin: "0 6px" }} />

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

/* ------------------ COMPONENTS ------------------ */
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ActionCard({ title, icon, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className="pb-card"
      style={{
        padding: 12,
        textAlign: "left",
        cursor: "pointer",
        border: primary ? "1px solid rgba(18,59,154,.25)" : "1px solid var(--pb-line)",
        background: primary ? "rgba(18,59,154,.06)" : "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: primary ? "linear-gradient(135deg, var(--pb-blue2), var(--pb-blue))" : "#f1f5f9",
          color: primary ? "#fff" : "#0f172a"
        }}>
          {icon}
        </div>
        <div style={{ fontWeight: 900 }}>{title}</div>
      </div>
      <div className="pb-muted" style={{ marginTop: 8, fontWeight: 800, fontSize: 12 }}>Créer</div>
    </button>
  );
}

function Info({ label, value, mono, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div
        className="pb-clamp-2"
        style={{
          marginTop: 4,
          fontWeight: 900,
          fontFamily: mono ? "ui-monospace, monospace" : "inherit",
          color: accent ? "var(--pb-red)" : "#0f172a",
          fontSize: 12
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function KRow({ label, value, strong }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 12, fontWeight: strong ? 900 : 800, color: strong ? "#0f172a" : "#475569" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function FootCard({ title, children }) {
  return (
    <div style={{ border: "1px solid var(--pb-line)", borderRadius: 16, padding: 10, background: "#fff" }}>
      <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gap: 2 }}>{children}</div>
    </div>
  );
}