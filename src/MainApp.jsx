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
} from "lucide-react";
import { supabase } from "./supabase";

/* ------------------ UTILITAIRES ------------------ */
const NumberToLetter = (nombre) => {
  const unites = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const dizaines = [
    "",
    "dix",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante-dix",
    "quatre-vingt",
    "quatre-vingt-dix",
  ];

  const conv99 = (n) => {
    if (n < 20) return unites[n];
    let d = Math.floor(n / 10);
    let u = n % 10;
    if (d === 7 || d === 9) {
      d -= 1;
      u += 10;
    }
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
      res +=
        (c === 1 ? "" : unites[c] + " ") +
        "cent" +
        (r === 0 && c > 1 ? "s" : "");
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

const calculateSubtotal = (items) =>
  (items || []).reduce(
    (acc, item) => acc + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );

const calculateTotal = (items, tvaRate, applyTva = true) => {
  const sub = calculateSubtotal(items);
  const rate = applyTva ? Number(tvaRate || 0) : 0;
  return sub * (1 + rate / 100);
};

const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " DA";

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

/* ------------------ UI COMPONENTS ------------------ */
const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
}) => {
  const base =
    "inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-sm shadow-sm active:scale-95 disabled:opacity-50";
  const styles = {
    primary:
      "bg-gradient-to-r from-blue-600 to-blue-800 text-white border border-blue-900",
    secondary: "bg-white text-blue-900 border border-blue-200",
    danger: "bg-red-500 text-white",
    ghost: "text-slate-500 hover:bg-slate-100",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const InputGroup = ({ label, children, compact }) => (
  <div className={`${compact ? "mb-0" : "mb-3"}`}>
    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">
      {label}
    </label>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all font-semibold"
  />
);

/* ------------------ HELPERS FICHIERS ------------------ */
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const isPdfLike = (src) => {
  const s = String(src || "");
  return (
    s.startsWith("data:application/pdf") ||
    s.toLowerCase().includes(".pdf") ||
    s.includes("application/pdf")
  );
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
  const [printModelId, setPrintModelId] = useState(null);
  const [busy, setBusy] = useState(false);

  const [modelDocs, setModelDocs] = useState({});
  const [pdfLibrary, setPdfLibrary] = useState([]);
  const [pdfSelected, setPdfSelected] = useState(null);

  const [previewZoom, setPreviewZoom] = useState(1.12);

  const [companyConfig, setCompanyConfig] = useState({
    name: "PNEUBOAT SARL",
    managerName: "Sekkal Gherbi Youcef",
    address: "Hai el Badr Oran",
    email: "info@pneuboat.net",
    phone: "0563269639",
    nextInvoiceNumber: 1,
    nextProformaNumber: 1,
    nextDeliveryNumber: 1,
    nextAttestationNumber: 1,
    nextOrderNumber: 1, // ✅ Bon de commande
    rc: "",
    nif: "",
    nis: "",
    bankName: "",
    bankRib: "",
    logo: null,
    favicon: null,
    boatModels: [
      {
        id: 1,
        name: "PNB-360",
        length: "3.60 m",
        approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP",
        type: "Semi-rigide",
      },
      {
        id: 2,
        name: "PNB-420",
        length: "4.20 m",
        approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP",
        type: "Semi-rigide",
      },
      {
        id: 3,
        name: "PNB-510",
        length: "5.10 m",
        approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP",
        type: "Semi-rigide",
      },
      {
        id: 4,
        name: "PNB 525 OPEN",
        length: "5.25 m",
        approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP",
        type: "Coque Open",
      },
      {
        id: 5,
        name: "PNB-550",
        length: "5.50 m",
        approvalNumber: "Numéro 1565 du 10/07/2025 délivrée par DMMP",
        type: "Semi-rigide",
      },
      {
        id: 6,
        name: "PNB-650",
        length: "6.50 m",
        approvalNumber: "Numéro 689 DU 15/04/2021 délivrée par DMMP",
        type: "Semi-rigide",
      },
      {
        id: 7,
        name: "PNB-700",
        length: "7.00 m",
        approvalNumber: "Numéro 750/145 du 11/03/2019 délivrée par DMMP",
        type: "Semi-rigide",
      },
    ],
  });

  /* ------------------ PRINT RULES (évite page blanche + coupe droite) ------------------ */
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-pb-print", "1");
    style.innerHTML = `
      @media print {
        .no-print { display: none !important; }
        .page-break { page-break-after: always; break-after: page; }
        .page-break-last { page-break-after: auto; break-after: auto; }
        body { background: white !important; }
        html, body { width: 210mm; }
        @page { size: A4; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  /* ------------------ NAV ------------------ */
  const changeView = useCallback((newView) => {
    setView(newView);
    window.history.pushState({ view: newView }, "");
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view) setView(event.state.view);
      else setView("list");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* ------------------ CHARGEMENT LOCAL ------------------ */
  useEffect(() => {
    const storedAuth = localStorage.getItem("pb_is_authenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
      setTimeout(() => loadOnlineData(), 250);
    }

    const savedDocs = localStorage.getItem("pb_model_docs");
    if (savedDocs) {
      try {
        setModelDocs(JSON.parse(savedDocs));
      } catch {}
    }

    const savedPdf = localStorage.getItem("pb_pdf_library");
    if (savedPdf) {
      try {
        setPdfLibrary(JSON.parse(savedPdf));
      } catch {}
    }

    try {
      if (window.innerWidth >= 1024) setPreviewZoom(1.18);
      else setPreviewZoom(0.8);
    } catch {}
  }, []);

  const rememberLocal = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  /* ------------------ FAVICON DYNAMIQUE ------------------ */
  useEffect(() => {
    if (!companyConfig?.favicon) return;
    try {
      let link =
        document.querySelector("link[rel='icon']") ||
        document.querySelector("link[rel='shortcut icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = companyConfig.favicon;
    } catch {}
  }, [companyConfig?.favicon]);

  /* ------------------ SUPABASE ------------------ */
  const loadOnlineData = async () => {
    setBusy(true);
    try {
      const { data: configData } = await supabase
        .from("app_settings")
        .select("config")
        .limit(1)
        .maybeSingle();

      if (configData?.config) {
        setCompanyConfig((prev) => ({ ...prev, ...configData.config }));
      }

      const { data: invData } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const mapped = (invData || []).map((row) => ({
        ...row.data,
        db_id: row.id,
        created_at: row.created_at,
      }));
      setInvoiceHistory(mapped);
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  const saveConfigOnline = async (nc) => {
    setCompanyConfig(nc);
    try {
      const { data: existing } = await supabase.from("app_settings").select("id").limit(1);
      if (existing && existing.length > 0) {
        await supabase.from("app_settings").update({ config: nc }).eq("id", existing[0].id);
      } else {
        await supabase.from("app_settings").insert({ config: nc });
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ------------------ AUTH ------------------ */
  const handleLogin = () => {
    const expected = import.meta.env.VITE_APP_PASSWORD;
    if (!expected) {
      setAuthError("VITE_APP_PASSWORD non défini (.env)");
      return;
    }
    if (passwordInput === expected) {
      setIsAuthenticated(true);
      localStorage.setItem("pb_is_authenticated", "true");
      setAuthError("");
      loadOnlineData();
    } else {
      setAuthError("Mot de passe incorrect");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("pb_is_authenticated");
    setPasswordInput("");
    setAuthError("");
    setView("list");
  };

  /* ------------------ FACTURES ------------------ */
  const normalizeInvoice = (inv) => {
    const items =
      Array.isArray(inv?.items) && inv.items.length
        ? inv.items
        : [{ id: Date.now(), description: "", quantity: 1, price: 0 }];

    const boatDetails =
      inv?.boatDetails || {
        model: "",
        serialNumber: "",
        length: "",
        approvalNumber: "",
        year: "2026",
        notes: "Certifié construit à neuf.",
      };

    const orderDetails =
      inv?.orderDetails || {
        modelWanted: "",
        colors: "",
        options: "",
        accessories: "",
        amountPaid: 0,
      };

    return {
      ...inv,
      items,
      boatDetails,
      orderDetails,
      clientPhone: inv?.clientPhone ?? "",
      applyTva: inv?.applyTva ?? true,
      tvaRate: inv?.tvaRate ?? 19,
      showPayment: inv?.showPayment ?? true,
      paymentMethod: inv?.paymentMethod ?? "virement",
      clientChequeNumber: inv?.clientChequeNumber ?? "",
      date: inv?.date || new Date().toISOString().split("T")[0],
    };
  };

  const saveInvoiceToCloud = async () => {
    if (!currentInvoice?.clientName) return alert("Nom du client ?");
    setBusy(true);

    try {
      const normalized = normalizeInvoice(currentInvoice);
      const total = calculateTotal(normalized.items, normalized.tvaRate, normalized.applyTva);

      const payload = {
        doc_number: normalized.number,
        client_name: normalized.clientName,
        total,
        data: { ...normalized, total },
      };

      if (normalized.db_id) {
        await supabase.from("invoices").update(payload).eq("id", normalized.db_id);
      } else {
        await supabase.from("invoices").insert(payload);

        let nc = { ...companyConfig };
        const dt = normalized.type;

        if (dt === "dossier") {
          nc.nextInvoiceNumber = Number(nc.nextInvoiceNumber || 1) + 1;
          nc.nextAttestationNumber = Number(nc.nextAttestationNumber || 1) + 1;
          nc.nextDeliveryNumber = Number(nc.nextDeliveryNumber || 1) + 1;
        } else {
          const keyMap = {
            facture: "nextInvoiceNumber",
            proforma: "nextProformaNumber",
            livraison: "nextDeliveryNumber",
            attestation: "nextAttestationNumber",
            commande: "nextOrderNumber", // ✅
          };
          const k = keyMap[dt];
          if (k) nc[k] = Number(nc[k] || 1) + 1;
        }

        await saveConfigOnline(nc);
      }

      await loadOnlineData();
      changeView("history");
    } catch (e) {
      console.error(e);
      alert("Erreur sauvegarde: " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  };

  const deleteInvoice = async (inv) => {
    if (!inv?.db_id) return;
    if (!window.confirm("Supprimer ?")) return;
    setBusy(true);
    try {
      await supabase.from("invoices").delete().eq("id", inv.db_id);
      await loadOnlineData();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const startNew = (type) => {
    const year = new Date().getFullYear();
    const {
      nextInvoiceNumber: nf,
      nextAttestationNumber: na,
      nextDeliveryNumber: nbl,
      nextProformaNumber: np,
      nextOrderNumber: noc,
    } = companyConfig;

    let newDoc = normalizeInvoice({
      type,
      clientName: "",
      clientAddress: "",
      clientIdNumber: "",
      clientPhone: "",
      items: [{ id: Date.now(), description: "", quantity: 1, price: 0 }],
      boatDetails: {
        model: "",
        serialNumber: "",
        length: "",
        approvalNumber: "",
        year: String(year),
        notes: "Certifié construit à neuf.",
      },
      orderDetails: {
        modelWanted: "",
        colors: "",
        options: "",
        accessories: "",
        amountPaid: 0,
      },
      applyTva: true,
      tvaRate: 19,
      showPayment: true,
      paymentMethod: "virement",
      clientChequeNumber: "",
    });

    const n =
      type === "facture"
        ? nf
        : type === "proforma"
        ? np
        : type === "livraison"
        ? nbl
        : type === "commande"
        ? noc
        : na;

    const pref =
      type === "facture"
        ? "FAC"
        : type === "proforma"
        ? "PRO"
        : type === "livraison"
        ? "BL"
        : type === "commande"
        ? "BC"
        : "ATT";

    newDoc.number =
      type === "dossier"
        ? `DOS-${year}-${String(nf).padStart(3, "0")}`
        : `${pref}-${year}-${String(n).padStart(3, "0")}`;

    if (type === "dossier") {
      newDoc.invoiceNumber = `FAC-${year}-${String(nf).padStart(3, "0")}`;
      newDoc.attestationNumber = `ATT-${year}-${String(na).padStart(3, "0")}`;
      newDoc.deliveryNumber = `BL-${year}-${String(nbl).padStart(3, "0")}`;
    }

    setCurrentInvoice(newDoc);
    changeView("edit");
  };

  const selectModel = (id) => {
    const m = companyConfig.boatModels.find((x) => x.id === parseInt(id, 10));
    if (!m) return;

    setCurrentInvoice((p) => {
      const prev = normalizeInvoice(p || {});
      const firstItem =
        prev.items?.[0] || { id: Date.now(), description: "", quantity: 1, price: 0 };

      return {
        ...prev,
        boatDetails: {
          ...prev.boatDetails,
          model: m.name,
          length: m.length,
          approvalNumber: m.approvalNumber, // ✅ numéro d’approbation auto
          year: prev.boatDetails?.year || "2026",
        },
        items: [
          {
            ...firstItem,
            description: `${m.name}`, // ✅ juste le nom du modèle
          },
          ...prev.items.slice(1),
        ],
      };
    });
  };

  /* ------------------ UPLOAD LOGO / FAVICON / DOCS ------------------ */
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await toBase64(file);
      const nc = { ...companyConfig, logo: b64 };
      await saveConfigOnline(nc);
    } catch (err) {
      console.error(err);
      alert("Erreur logo");
    } finally {
      setBusy(false);
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await toBase64(file);
      const nc = { ...companyConfig, favicon: b64 };
      await saveConfigOnline(nc);
    } catch (err) {
      console.error(err);
      alert("Erreur favicon");
    } finally {
      setBusy(false);
    }
  };

  const handleDocUpload = async (e, modelId, docKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await toBase64(file);
      setModelDocs((prev) => {
        const next = { ...prev, [modelId]: { ...(prev[modelId] || {}), [docKey]: b64 } };
        rememberLocal("pb_model_docs", next);
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Erreur upload document");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveModelDoc = (modelId, docKey) => {
    setModelDocs((prev) => {
      const next = { ...prev };
      if (!next[modelId]) return prev;
      next[modelId] = { ...next[modelId] };
      delete next[modelId][docKey];
      rememberLocal("pb_model_docs", next);
      return next;
    });
  };

  /* ------------------ BIBLIOTHÈQUE PDF ------------------ */
  const addPdfToLibrary = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Merci de choisir un fichier PDF.");
      return;
    }
    setBusy(true);
    try {
      const b64 = await toBase64(file);
      const entry = {
        id: Date.now(),
        name: file.name,
        createdAt: new Date().toISOString(),
        data: b64,
      };
      setPdfLibrary((prev) => {
        const next = [entry, ...(prev || [])];
        rememberLocal("pb_pdf_library", next);
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Erreur ajout PDF");
    } finally {
      setBusy(false);
    }
  };

  const removePdf = (id) => {
    setPdfLibrary((prev) => {
      const next = (prev || []).filter((x) => x.id !== id);
      rememberLocal("pb_pdf_library", next);
      if (pdfSelected?.id === id) setPdfSelected(null);
      return next;
    });
  };

  /* ------------------ HISTORY FILTER ------------------ */
  const filteredHistory = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    const list = invoiceHistory || [];
    if (!q) return list;
    return list.filter((inv) => {
      const name = String(inv.client_name || inv.clientName || "").toLowerCase();
      const num = String(inv.doc_number || inv.number || "").toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }, [invoiceHistory, searchTerm]);

  /* ------------------ RENDU DOCUMENT ------------------ */
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;
    const inv = normalizeInvoice(currentInvoice);

    const isCommande = subType === "commande";

    const subtotal = calculateSubtotal(inv.items);
    const total = calculateTotal(inv.items, inv.tvaRate, inv.applyTva);
    const totalWords = NumberToLetter(total);

    const showTotals =
      subType !== "livraison" && subType !== "attestation" && subType !== "commande";
    const showPayBlock =
      showTotals && !!inv.showPayment && subType !== "proforma"; // ✅ proforma = pas paiement

    const approvalShown = inv.boatDetails?.approvalNumber || "—";

    return (
      <div className="bg-white w-[210mm] h-[297mm] p-[14mm] mx-auto shadow-2xl text-slate-900 relative text-[12px] leading-snug font-sans flex flex-col justify-between overflow-hidden print:shadow-none">
        {/* Bande couleur haut */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-red-600" />
        <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-blue-50" />
        <div className="absolute -left-24 -bottom-24 w-64 h-64 rounded-full bg-red-50" />

        <div className="relative">
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
            <div>
              {companyConfig.logo ? (
                <img src={companyConfig.logo} alt="logo" className="h-12 object-contain mb-2" />
              ) : (
                <h1 className="text-xl font-black uppercase tracking-tight">
                  Pneuboat <span className="text-blue-700">SARL</span>
                </h1>
              )}
              <div className="text-[10px] text-slate-500 leading-tight">
                <p>{companyConfig.address}</p>
                <p>Tél: {companyConfig.phone}</p>
                <p className="text-slate-400">{companyConfig.email}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase border border-slate-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {labelDoc(subType)}
              </span>

              <div className="mt-3">
                <div className="font-mono text-base font-black text-slate-900">{docNumber}</div>
                <div className="text-[10px] font-semibold text-slate-400">
                  Le {new Date(inv.date).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
              Client
            </h3>
            <div className="text-[14px] font-black uppercase truncate text-slate-900">
              {inv.clientName || "—"}
            </div>
            <div className="text-[11px] text-slate-600 line-clamp-1">
              {inv.clientAddress || "—"}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {!!inv.clientIdNumber && (
                <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  ID: {inv.clientIdNumber}
                </span>
              )}
              {!!inv.clientPhone && (
                <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 inline-flex items-center gap-1">
                  <Phone size={12} /> {inv.clientPhone}
                </span>
              )}
            </div>
          </div>

          {/* ✅ Ajouts sur BON DE LIVRAISON */}
          {subType === "livraison" && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Détails Livraison
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest">Modèle</div>
                  <div className="font-black">{inv.boatDetails.model || "—"}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                    N° de série
                  </div>
                  <div className="font-black font-mono text-blue-700">
                    {inv.boatDetails.serialNumber || "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                    Téléphone client
                  </div>
                  <div className="font-black">{inv.clientPhone || "—"}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest">Longueur</div>
                  <div className="font-black">{inv.boatDetails.length || "—"}</div>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-[175px]">
            {subType === "attestation" ? (
              <div className="space-y-4">
                <p className="text-justify text-[11px]">
                  Je soussigné, <b>{companyConfig.managerName}</b>, gérant de{" "}
                  <b>{companyConfig.name}</b>, certifie que le navire a été construit
                  à neuf dans nos ateliers pour le compte de{" "}
                  <b>{inv.clientName || ".........."}</b>.
                </p>

                {/* ✅ Garantie 1 an */}
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-red-50 p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    Garantie
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    Garantie <span className="text-slate-900 font-black">1 an</span> sur tout
                    décollement ou problème provenant d’usine (défaut de fabrication),
                    sous réserve d’une utilisation normale.
                  </div>
                </div>

                {/* ✅ Détails bateau + APPROBATION */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-2 text-[9px] font-black uppercase text-center tracking-widest">
                    Détails du Bateau
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 bg-white">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">Modèle</div>
                      <div className="font-black">{inv.boatDetails.model || "—"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        N° de série
                      </div>
                      <div className="font-black text-blue-700 font-mono">
                        {inv.boatDetails.serialNumber || "—"}
                      </div>
                    </div>

                    {/* ✅ Numéro d’approbation */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Numéro d’approbation (DMMP)
                      </div>
                      <div className="font-black text-slate-900">{approvalShown}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">Longueur</div>
                      <div className="font-black">{inv.boatDetails.length || "—"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Année de construction
                      </div>
                      <div className="font-black">{inv.boatDetails.year || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isCommande ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Bon de commande
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">Modèle voulu</div>
                      <div className="font-black">
                        {inv.orderDetails?.modelWanted || inv.boatDetails?.model || "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">Couleurs</div>
                      <div className="font-bold">{inv.orderDetails?.colors || "—"}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">Options</div>
                      <div className="font-bold">{inv.orderDetails?.options || "—"}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">Accessoires</div>
                      <div className="font-bold">{inv.orderDetails?.accessories || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Règlement
                  </div>

                  {(() => {
                    const totalCmd = Number(inv.items?.[0]?.price || 0);
                    const paid = Number(inv.orderDetails?.amountPaid || 0);
                    const rest = Math.max(totalCmd - paid, 0);

                    return (
                      <div className="grid grid-cols-3 gap-3 text-[11px]">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[8px] text-slate-400 uppercase tracking-widest">Total</div>
                          <div className="font-black text-blue-700">{formatCurrency(totalCmd)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[8px] text-slate-400 uppercase tracking-widest">Total versé</div>
                          <div className="font-black">{formatCurrency(paid)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[8px] text-slate-400 uppercase tracking-widest">Restant</div>
                          <div className="font-black text-red-600">{formatCurrency(rest)}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-slate-700 font-black uppercase bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3 text-center w-16">Qté</th>
                      {subType !== "livraison" && (
                        <>
                          <th className="py-2.5 px-3 text-right w-24">P.U</th>
                          <th className="py-2.5 px-3 text-right w-28">Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((it, i) => (
                      <tr key={it.id || i} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2.5 px-3 font-bold">{it.description}</td>
                        <td className="py-2.5 px-3 text-center font-black">
                          {Number(it.quantity || 0)}
                        </td>
                        {subType !== "livraison" && (
                          <>
                            <td className="py-2.5 px-3 text-right">
                              {Number(it.price || 0).toLocaleString("fr-FR")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              {(Number(it.quantity || 0) * Number(it.price || 0)).toLocaleString("fr-FR")}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {inv.items.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-slate-400 font-black" colSpan={4}>
                          Aucun article
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          {showTotals && (
            <>
              <div className="flex justify-end mb-3">
                <div className="w-[58%] rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Récapitulatif
                  </div>
                  <div className="p-4 bg-white text-[10px] space-y-2">
                    <div className="flex justify-between text-slate-500 font-bold">
                      <span>Sous-total HT</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>

                    {inv.applyTva && (
                      <div className="flex justify-between text-slate-500 font-bold">
                        <span>TVA</span>
                        <span>{Number(inv.tvaRate || 0)}%</span>
                      </div>
                    )}

                    <div className="pt-2 border-t flex justify-between font-black text-[13px]">
                      <span className="text-slate-900">{inv.applyTva ? "TOTAL TTC" : "TOTAL"}</span>
                      <span className="text-blue-700">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Total en lettres
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  {subType === "proforma"
                    ? "Arrêté le présent devis à la somme de :"
                    : "Arrêté la présente facture à la somme de :"}
                </div>
                <div className="mt-1 text-[12px] font-black text-slate-900">{totalWords}</div>

                {/* ✅ Valable 2 mois pour PROFORMA */}
                {subType === "proforma" && (
                  <div className="mt-2 text-[10px] font-bold text-slate-500">
                    Devis valable <span className="text-slate-900 font-black">2 mois</span> à compter de la date d’émission.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ✅ Paiement (pas sur proforma) */}
          {showPayBlock && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Paiement
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-black text-slate-900">
                    Mode : <span className="text-blue-700">{paymentLabel(inv.paymentMethod)}</span>
                  </div>
                  {inv.paymentMethod === "cheque" && inv.clientChequeNumber ? (
                    <div className="text-[10px] text-slate-600 font-bold mt-1">
                      N° Chèque : <span className="font-mono">{inv.clientChequeNumber}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 font-bold mt-1">
                      {inv.paymentMethod === "cheque"
                        ? "N° Chèque : —"
                        : inv.paymentMethod === "virement"
                        ? "Paiement par virement bancaire"
                        : "Paiement en espèces"}
                    </div>
                  )}
                </div>
                <div className="text-right text-[10px] font-bold text-slate-600">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Paiement prévu
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="border border-dashed border-slate-200 rounded-2xl h-20 p-3 text-[9px] text-slate-400 uppercase font-black flex flex-col justify-between">
              Cachet Gérant<span>....................</span>
            </div>
            <div className="border border-dashed border-slate-200 rounded-2xl h-20 p-3 text-[9px] text-slate-400 uppercase font-black flex flex-col justify-between">
              Signature Client<span>....................</span>
            </div>
          </div>

          <div className="border-t pt-2 text-[8px] text-slate-400 grid grid-cols-3 gap-2">
            <div>
              <b>BANQUE</b> {companyConfig.bankName || "—"}
              <br />
              RIB: {companyConfig.bankRib || "—"}
            </div>
            <div>
              <b>RC:</b> {companyConfig.rc || "—"}
              <br />
              <b>NIF:</b> {companyConfig.nif || "—"}
            </div>
            <div className="text-right uppercase font-black text-slate-900">{companyConfig.name}</div>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------ LOGIN ------------------ */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/50">
            <Anchor size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">Pneuboat</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">
            Accès Gestionnaire
          </p>

          <input
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-lg font-bold mb-4 focus:border-blue-500 outline-none transition-all"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
          />
          {authError && <p className="text-red-500 text-xs font-bold mb-4">{authError}</p>}
          <Button
            onClick={handleLogin}
            className="w-full justify-center py-5 rounded-2xl text-md uppercase tracking-wider shadow-xl shadow-blue-100"
          >
            Déverrouiller
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------ APP ------------------ */
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 md:pb-0 md:pl-64">
      {/* MENU NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full md:w-64 md:h-screen bg-slate-900 text-white z-50 no-print flex md:flex-col shadow-2xl md:shadow-none">
        <div className="hidden md:block p-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Anchor className="text-blue-500" />
            <span className="text-xl font-black uppercase">Pneuboat</span>
          </div>
        </div>

        <div className="flex md:flex-col flex-1 justify-around md:justify-start p-2 md:p-4 gap-1 md:gap-2">
          {[
            { id: "list", icon: <Plus />, label: "Nouveau" },
            { id: "history", icon: <History />, label: "Archives" },
            { id: "database", icon: <Database />, label: "Plans" },
            { id: "settings", icon: <Settings />, label: "Config" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => changeView(tab.id)}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all ${
                view === tab.id || (tab.id === "database" && view === "print_tech_view")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              <span className="md:w-5">{tab.icon}</span>
              <span className="text-[10px] md:text-sm font-bold">{tab.label}</span>
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 text-red-400 md:mt-auto md:border-t md:border-slate-800"
          >
            <LogOut size={20} />
            <span className="text-[10px] md:text-sm font-bold">Sortir</span>
          </button>
        </div>
      </nav>

      <main className="p-4 md:p-10 max-w-7xl mx-auto">
        {/* LIST */}
        {view === "list" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl flex justify-between items-center overflow-hidden relative">
              <div className="relative z-10">
                <h2 className="text-2xl md:text-4xl font-black mb-2 uppercase tracking-tight">
                  Espace Gestion
                </h2>
                <p className="text-blue-400 text-xs md:text-sm font-bold uppercase tracking-[0.3em]">
                  Chantier Naval Pneuboat
                </p>
              </div>
              <Anchor
                size={120}
                className="text-slate-800 absolute -right-8 -bottom-8 md:static md:opacity-10 opacity-20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Dossier Complet",
                  icon: <FolderOpen className="text-white" />,
                  action: () => startNew("dossier"),
                  desc: "Facture + Attestation + BL",
                  color: "bg-blue-600",
                },
                { title: "Facture Client", icon: <FileText />, action: () => startNew("facture"), desc: "Document de vente simple" },
                { title: "Facture Proforma", icon: <ClipboardList />, action: () => startNew("proforma"), desc: "Devis / Proforma (2 mois)" },
                { title: "Bon de Commande", icon: <ClipboardList />, action: () => startNew("commande"), desc: "Modèle + options + acompte" },
                { title: "Bon de Livraison", icon: <PackageCheck />, action: () => startNew("livraison"), desc: "Preuve de livraison" },
                { title: "Attestation", icon: <Anchor />, action: () => startNew("attestation"), desc: "Construction + garantie" },
              ].map((card, i) => (
                <div
                  key={i}
                  onClick={card.action}
                  className="p-6 rounded-3xl border-2 border-white shadow-sm bg-white cursor-pointer hover:border-blue-200 transition-all flex items-center gap-5 active:scale-95"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      card.color || "bg-slate-50 text-blue-600"
                    }`}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1 text-sm">
                      {card.title}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {card.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* BIBLIOTHÈQUE PDF */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                    <FileText className="text-blue-600" /> Bibliothèque PDF (Impression)
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Ajoute tes PDFs ici, puis imprime quand tu veux
                  </p>
                </div>

                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-sm">
                    <Upload size={18} /> Ajouter PDF
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,.pdf"
                    onChange={addPdfToLibrary}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 max-h-[340px] overflow-auto">
                  {(pdfLibrary || []).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                      Aucun PDF ajouté
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(pdfLibrary || []).map((p) => (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border cursor-pointer ${
                            pdfSelected?.id === p.id ? "bg-white border-blue-200" : "bg-white/50 border-transparent"
                          }`}
                          onClick={() => setPdfSelected(p)}
                        >
                          <div className="font-black text-slate-800 text-sm truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {new Date(p.createdAt).toLocaleString("fr-FR")}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="secondary"
                              className="!px-3 !py-2 !rounded-lg"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setPdfSelected(p);
                              }}
                            >
                              Aperçu
                            </Button>
                            <Button
                              className="!px-3 !py-2 !rounded-lg"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const w = window.open();
                                if (!w) return alert("Pop-up bloquée.");
                                w.document.write(`
                                  <html><head><title>PDF</title></head>
                                  <body style="margin:0">
                                    <embed src="${p.data}" type="application/pdf" style="width:100vw;height:100vh" />
                                    <script>setTimeout(()=>{window.focus();window.print();},400)</script>
                                  </body></html>
                                `);
                                w.document.close();
                              }}
                            >
                              <Printer size={16} /> Imprimer
                            </Button>
                            <Button
                              variant="ghost"
                              className="!px-3 !py-2 !rounded-lg text-red-500"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (window.confirm("Supprimer ce PDF ?")) removePdf(p.id);
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden min-h-[340px]">
                  {pdfSelected?.data ? (
                    <embed src={pdfSelected.data} type="application/pdf" className="w-full h-[420px]" />
                  ) : (
                    <div className="h-full p-10 text-center text-slate-300 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center">
                      Sélectionne un PDF pour l’aperçu
                    </div>
                  )}
                </div>
              </div>

              {busy && (
                <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Traitement...
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDIT */}
        {view === "edit" && currentInvoice && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            {/* BARRE EDITION (haut) */}
            <div className="no-print bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-3 md:p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="font-black uppercase text-slate-800 text-sm tracking-tight">
                      Édition
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Remplis en haut • aperçu en bas
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => changeView("list")} className="!py-2 !px-3 !rounded-xl">
                    <X size={16} /> Fermer
                  </Button>
                  <Button onClick={saveInvoiceToCloud} disabled={busy} className="!py-2 !px-4 !rounded-xl">
                    <Save size={16} /> {busy ? "Envoi..." : "Sauvegarder"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTimeout(() => window.print(), 100)}
                    className="!py-2 !px-4 !rounded-xl border-2 border-blue-50"
                  >
                    <Printer size={16} /> Imprimer
                  </Button>
                </div>
              </div>

              {/* FORM HORIZONTAL */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Client */}
                <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2">
                    <InputGroup label="Client" compact>
                      <Input
                        value={currentInvoice.clientName || ""}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({ ...normalizeInvoice(p), clientName: e.target.value }))
                        }
                        placeholder="Nom complet"
                      />
                    </InputGroup>

                    <div className="grid grid-cols-2 gap-2">
                      <InputGroup label="Téléphone" compact>
                        <Input
                          value={currentInvoice.clientPhone || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({ ...normalizeInvoice(p), clientPhone: e.target.value }))
                          }
                          placeholder="0550..."
                        />
                      </InputGroup>

                      <InputGroup label="ID / Passport" compact>
                        <Input
                          value={currentInvoice.clientIdNumber || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({ ...normalizeInvoice(p), clientIdNumber: e.target.value }))
                          }
                          placeholder="Optionnel"
                        />
                      </InputGroup>
                    </div>
                  </div>
                </div>

                {/* Modèle / Bateau */}
                <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-blue-600 to-blue-800 p-3 text-white">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CheckCircle size={12} /> Bateau
                  </div>

                  <select
                    className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black outline-none"
                    value={
                      companyConfig.boatModels.find((m) => m.name === currentInvoice?.boatDetails?.model)?.id || ""
                    }
                    onChange={(e) => selectModel(e.target.value)}
                  >
                    <option value="">Choisir Modèle</option>
                    {companyConfig.boatModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      value={currentInvoice?.boatDetails?.serialNumber || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          return {
                            ...inv,
                            boatDetails: { ...inv.boatDetails, serialNumber: String(e.target.value || "").toUpperCase() },
                          };
                        })
                      }
                      placeholder="N° Série"
                    />
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      value={currentInvoice?.boatDetails?.year || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          return { ...inv, boatDetails: { ...inv.boatDetails, year: e.target.value } };
                        })
                      }
                      placeholder="Année"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      value={currentInvoice?.boatDetails?.length || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          return { ...inv, boatDetails: { ...inv.boatDetails, length: e.target.value } };
                        })
                      }
                      placeholder="Longueur"
                    />
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      type="number"
                      value={Number(currentInvoice?.items?.[0]?.price || 0)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          const ni = [...inv.items];
                          ni[0] = { ...ni[0], price: val };
                          return { ...inv, items: ni };
                        });
                      }}
                      placeholder="Prix"
                    />
                  </div>
                </div>

                {/* TVA / Paiement / Zoom */}
                <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="grid grid-cols-1 gap-3">
                    {/* TVA */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Percent size={14} /> TVA
                        </div>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <input
                            type="checkbox"
                            checked={!!currentInvoice.applyTva}
                            onChange={(e) =>
                              setCurrentInvoice((p) => ({ ...normalizeInvoice(p), applyTva: e.target.checked }))
                            }
                          />
                          Appliquer
                        </label>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={!currentInvoice.applyTva}
                        value={Number(currentInvoice.tvaRate || 0)}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({ ...normalizeInvoice(p), tvaRate: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="TVA %"
                      />
                      <div className="mt-1 text-[10px] font-bold text-slate-500">
                        {currentInvoice.applyTva ? `TVA: ${Number(currentInvoice.tvaRate || 0)}%` : "TVA désactivée"}
                      </div>
                    </div>

                    {/* Paiement */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paiement</div>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <input
                            type="checkbox"
                            checked={!!currentInvoice.showPayment}
                            onChange={(e) =>
                              setCurrentInvoice((p) => ({ ...normalizeInvoice(p), showPayment: e.target.checked }))
                            }
                          />
                          Afficher
                        </label>
                      </div>
                      <select
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                        value={currentInvoice.paymentMethod || "virement"}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({ ...normalizeInvoice(p), paymentMethod: e.target.value }))
                        }
                      >
                        <option value="cheque">Chèque</option>
                        <option value="virement">Virement bancaire</option>
                        <option value="espece">Espèce</option>
                      </select>
                      {currentInvoice.paymentMethod === "cheque" && (
                        <input
                          className="w-full mt-2 px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                          placeholder="N° de chèque (optionnel)"
                          value={currentInvoice.clientChequeNumber || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({ ...normalizeInvoice(p), clientChequeNumber: e.target.value }))
                          }
                        />
                      )}
                      <div className="mt-1 text-[10px] font-bold text-slate-500">
                        Mode: <span className="text-slate-900 font-black">{paymentLabel(currentInvoice.paymentMethod)}</span>
                      </div>
                    </div>

                    {/* Zoom */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        Zoom aperçu
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.35"
                        step="0.01"
                        value={previewZoom}
                        onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-[10px] font-bold text-slate-500 mt-1">
                        {Math.round(previewZoom * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-12">
                  <InputGroup label="Adresse" compact>
                    <Input
                      value={currentInvoice.clientAddress || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => ({ ...normalizeInvoice(p), clientAddress: e.target.value }))
                      }
                      placeholder="Adresse du client"
                    />
                  </InputGroup>
                </div>
              </div>

              {/* ✅ Bon de commande : champs */}
              {currentInvoice.type === "commande" && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 no-print">
                  <div className="md:col-span-8 rounded-2xl border border-slate-100 bg-white p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <InputGroup label="Modèle voulu" compact>
                        <Input
                          value={currentInvoice.orderDetails?.modelWanted || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => {
                              const inv = normalizeInvoice(p);
                              return { ...inv, orderDetails: { ...inv.orderDetails, modelWanted: e.target.value } };
                            })
                          }
                          placeholder="Ex: PNB-550"
                        />
                      </InputGroup>

                      <InputGroup label="Couleurs" compact>
                        <Input
                          value={currentInvoice.orderDetails?.colors || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => {
                              const inv = normalizeInvoice(p);
                              return { ...inv, orderDetails: { ...inv.orderDetails, colors: e.target.value } };
                            })
                          }
                          placeholder="Ex: Bleu / Blanc"
                        />
                      </InputGroup>

                      <div className="md:col-span-2">
                        <InputGroup label="Options" compact>
                          <Input
                            value={currentInvoice.orderDetails?.options || ""}
                            onChange={(e) =>
                              setCurrentInvoice((p) => {
                                const inv = normalizeInvoice(p);
                                return { ...inv, orderDetails: { ...inv.orderDetails, options: e.target.value } };
                              })
                            }
                            placeholder="Ex: Console, banquette..."
                          />
                        </InputGroup>
                      </div>

                      <div className="md:col-span-2">
                        <InputGroup label="Accessoires" compact>
                          <Input
                            value={currentInvoice.orderDetails?.accessories || ""}
                            onChange={(e) =>
                              setCurrentInvoice((p) => {
                                const inv = normalizeInvoice(p);
                                return { ...inv, orderDetails: { ...inv.orderDetails, accessories: e.target.value } };
                              })
                            }
                            placeholder="Ex: Pompe, gilets..."
                          />
                        </InputGroup>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <InputGroup label="Total versé (DA)" compact>
                      <Input
                        type="number"
                        value={Number(currentInvoice.orderDetails?.amountPaid || 0)}
                        onChange={(e) =>
                          setCurrentInvoice((p) => {
                            const inv = normalizeInvoice(p);
                            return {
                              ...inv,
                              orderDetails: { ...inv.orderDetails, amountPaid: parseFloat(e.target.value) || 0 },
                            };
                          })
                        }
                      />
                    </InputGroup>
                    <div className="text-[10px] font-bold text-slate-500">
                      Total = prix (en haut) • Restant = Total - Versé
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* APERÇU (bas) */}
            <div className="bg-slate-200 rounded-[2rem] p-2 md:p-4 overflow-auto h-[82vh] md:h-[calc(100vh-18rem)] shadow-inner border-4 border-white">
              <div className="min-w-[980px] flex justify-center">
                <div
                  id="printable-area"
                  className="origin-top"
                  style={{ transform: `scale(${previewZoom})`, transformOrigin: "top center" }}
                >
                  {currentInvoice.type === "dossier" ? (
                    <div>
                      <div className="page-break">
                        <RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} />
                      </div>
                      <div className="page-break">
                        <RenderDoc subType="attestation" docNumber={currentInvoice.attestationNumber} />
                      </div>
                      <div className="page-break-last">
                        <RenderDoc subType="livraison" docNumber={currentInvoice.deliveryNumber} />
                      </div>
                    </div>
                  ) : (
                    <RenderDoc subType={currentInvoice.type} docNumber={currentInvoice.number} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter">
                  <Cloud className="text-blue-500" /> Archives Cloud
                </h2>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  Base de données en temps réel
                </p>
              </div>
              <div className="relative md:w-80">
                <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                <input
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Nom ou N° de doc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-50">
                  {(filteredHistory || []).map((inv) => (
                    <tr key={inv.db_id || inv.number} className="hover:bg-blue-50/50 transition-all group">
                      <td className="p-5 md:p-7">
                        <div className="font-black text-slate-800 uppercase tracking-tight">
                          {inv.client_name || inv.clientName || "—"}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                          {inv.doc_number || inv.number} •{" "}
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString("fr-FR") : ""}
                        </div>
                      </td>
                      <td className="p-5 md:p-7 text-right font-black text-blue-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="p-5 md:p-7 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const inv2 = normalizeInvoice(inv);
                            setCurrentInvoice(inv2);
                            changeView("edit");
                          }}
                          className="!p-3 border-2"
                        >
                          <FileText size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => deleteInvoice(inv)}
                          className="!p-3 text-red-300 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {(!filteredHistory || filteredHistory.length === 0) && (
                    <tr>
                      <td colSpan={3} className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.2em]">
                        Aucune donnée trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATABASE / PLANS */}
        {view === "database" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
                <Database className="text-blue-600" /> Plans & Dossiers Techniques
              </h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Ajoute des PDFs/images (FICHE/JAUGE/PLAN/APPROBATION) puis imprime “Dossier”
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyConfig.boatModels.map((m) => (
                <div key={m.id} className="bg-white rounded-[2rem] p-6 border-2 border-white shadow-sm space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{m.name}</h3>
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em]">{m.type}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{m.approvalNumber}</p>
                    </div>
                    <span className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-500">
                      {m.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {["fiche", "jauge", "plan", "approbation"].map((doc) => {
                      const exists = !!modelDocs?.[m.id]?.[doc];
                      return (
                        <div key={doc} className="relative">
                          <label
                            className={`cursor-pointer rounded-2xl p-4 text-[9px] font-black flex items-center justify-center gap-3 border-2 transition-all ${
                              exists
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-slate-50 border-slate-50 text-slate-400 hover:border-blue-200 hover:bg-white"
                            }`}
                          >
                            <Upload size={14} /> {doc.toUpperCase()}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,application/pdf,.pdf"
                              onChange={(e) => handleDocUpload(e, m.id, doc)}
                            />
                          </label>

                          {exists && (
                            <button
                              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 flex items-center justify-center shadow"
                              onClick={() => {
                                if (window.confirm(`Supprimer ${doc.toUpperCase()} ?`)) {
                                  handleRemoveModelDoc(m.id, doc);
                                }
                              }}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => {
                      if (!modelDocs[m.id]) return alert("Aucun document pour ce modèle.");
                      setPrintModelId(m.id);
                      changeView("print_tech_view");
                    }}
                    className="w-full justify-center py-4 rounded-2xl uppercase tracking-widest text-xs"
                  >
                    Imprimer Dossier
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {view === "settings" && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-400">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black mb-10 flex items-center gap-4 uppercase tracking-tight">
                <Settings className="text-blue-600" size={28} /> Configuration
              </h2>

              <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-slate-50 rounded-[2rem] mb-10">
                <div className="w-24 h-24 bg-white rounded-[1.5rem] border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                  {companyConfig.logo ? (
                    <img src={companyConfig.logo} alt="Logo" className="object-contain w-full h-full" />
                  ) : (
                    <Anchor size={32} className="text-slate-200" />
                  )}
                </div>

                <div className="text-center md:text-left space-y-3">
                  <label className="cursor-pointer bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black shadow-xl shadow-blue-200 uppercase tracking-widest inline-block">
                    Changer le logo
                    <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                  </label>

                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                      {companyConfig.favicon ? (
                        <img src={companyConfig.favicon} alt="favicon" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-black text-slate-400">ICO</span>
                      )}
                    </div>

                    <label className="cursor-pointer bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black shadow uppercase tracking-widest inline-block">
                      Ajouter Favicon
                      <input type="file" onChange={handleFaviconUpload} className="hidden" accept="image/*" />
                    </label>
                  </div>

                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    PNG recommandé (32x32 ou 64x64)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <InputGroup label="Société">
                  <Input value={companyConfig.name} onChange={(e) => saveConfigOnline({ ...companyConfig, name: e.target.value })} />
                </InputGroup>

                <InputGroup label="Gérant">
                  <Input value={companyConfig.managerName} onChange={(e) => saveConfigOnline({ ...companyConfig, managerName: e.target.value })} />
                </InputGroup>

                <div className="md:col-span-2">
                  <InputGroup label="Adresse">
                    <Input value={companyConfig.address} onChange={(e) => saveConfigOnline({ ...companyConfig, address: e.target.value })} />
                  </InputGroup>
                </div>

                <InputGroup label="Email">
                  <Input value={companyConfig.email} onChange={(e) => saveConfigOnline({ ...companyConfig, email: e.target.value })} />
                </InputGroup>

                <InputGroup label="Téléphone">
                  <Input value={companyConfig.phone} onChange={(e) => saveConfigOnline({ ...companyConfig, phone: e.target.value })} />
                </InputGroup>

                <InputGroup label="RC">
                  <Input value={companyConfig.rc} onChange={(e) => saveConfigOnline({ ...companyConfig, rc: e.target.value })} />
                </InputGroup>

                <InputGroup label="NIF">
                  <Input value={companyConfig.nif} onChange={(e) => saveConfigOnline({ ...companyConfig, nif: e.target.value })} />
                </InputGroup>

                <InputGroup label="NIS">
                  <Input value={companyConfig.nis} onChange={(e) => saveConfigOnline({ ...companyConfig, nis: e.target.value })} />
                </InputGroup>

                <InputGroup label="Banque">
                  <Input value={companyConfig.bankName} onChange={(e) => saveConfigOnline({ ...companyConfig, bankName: e.target.value })} />
                </InputGroup>

                <div className="md:col-span-2">
                  <InputGroup label="RIB">
                    <Input value={companyConfig.bankRib} onChange={(e) => saveConfigOnline({ ...companyConfig, bankRib: e.target.value })} />
                  </InputGroup>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRINT TECH VIEW */}
        {view === "print_tech_view" && (
          <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-2xl p-6 md:p-10 border border-slate-100">
            <div className="flex justify-between items-center mb-8 no-print">
              <Button variant="secondary" onClick={() => changeView("database")} className="!px-6 rounded-2xl uppercase text-[10px] tracking-widest">
                <X size={16} /> Fermer
              </Button>

              <Button onClick={() => setTimeout(() => window.print(), 100)} className="!px-8 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200">
                <Printer size={16} /> Tout Imprimer
              </Button>
            </div>

            <div className="space-y-10 print-area">
              {["fiche", "jauge", "plan", "approbation"].map((doc) => {
                const fileData = modelDocs?.[printModelId]?.[doc];
                if (!fileData) return null;
                const pdf = isPdfLike(fileData);

                return (
                  <div key={doc} className="page-break-last flex flex-col items-center justify-center min-h-[90vh]">
                    {pdf ? (
                      <embed src={fileData} type="application/pdf" className="w-full h-[290mm]" />
                    ) : (
                      <img src={fileData} alt={doc} className="max-w-full max-h-[290mm] object-contain" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
