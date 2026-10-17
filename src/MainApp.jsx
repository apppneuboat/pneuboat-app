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
  Number(amount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) +
  " DA";

const labelDoc = (t, inv) => {
  if (t === "facture") return "FACTURE";
  if (t === "proforma") return "FACTURE PROFORMA";
  if (t === "livraison") return "BON DE LIVRAISON";
  if (t === "attestation") return `${inv?.attestationTitle || "ATTESTATION"} DE CONSTRUCTION`;
  if (t === "garantie") return "CERTIFICAT DE GARANTIE";
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

/* ------------------ ✅ NOUVEAU: Désignation + TVA inversée ------------------ */
const designationFromModel = (modelName) => {
  const m = String(modelName || "").trim();

  // Exception demandée
  if (/pnb\s*[- ]?\s*525/i.test(m)) {
    return "Bateau rigide open PNB-525";
  }

  // Tous les autres PNB-xxx => "Semi rigide PNB-xxx"
  const match = m.match(/pnb\s*[- ]?\s*(\d{3})/i);
  if (match) {
    const code = `PNB-${match[1]}`;
    return `Semi rigide ${code}`;
  }

  // fallback si non PNB
  return m || "—";
};

const priceHtFromTtc = (ttc, tvaRate, applyTva = true) => {
  const T = Number(ttc || 0);
  const r = applyTva ? Number(tvaRate || 0) : 0;
  const denom = 1 + r / 100;
  if (!denom) return T;
  return T / denom;
};

const priceTtcFromHt = (ht, tvaRate, applyTva = true) => {
  const H = Number(ht || 0);
  const r = applyTva ? Number(tvaRate || 0) : 0;
  return H * (1 + r / 100);
};

const recomputeItemsHtFromTtc = (items, tvaRate, applyTva = true) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((it) => {
    const hasTtc =
      it && it.priceTtc !== undefined && it.priceTtc !== null && it.priceTtc !== "";
    if (!hasTtc) return it;
    const ht = priceHtFromTtc(it.priceTtc, tvaRate, applyTva);
    return { ...it, price: ht };
  });
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
    website: "www.pneuboat.net",
    phone: "0563269639",
    nextInvoiceNumber: 1,
    nextProformaNumber: 1,
    nextDeliveryNumber: 1,
    nextAttestationNumber: 1,
    nextOrderNumber: 1,
    nextGarantieNumber: 1,
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

  /* ------------------ PRINT RULES ------------------ */
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
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .limit(1);
      if (existing && existing.length > 0) {
        await supabase
          .from("app_settings")
          .update({ config: nc })
          .eq("id", existing[0].id);
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
        ? inv.items.map((it) => ({
            ...it,
            quantity: it?.quantity ?? 1,
            price: Number(it?.price || 0), // HT (calcul interne)
            priceTtc: it?.priceTtc ?? null, // TTC (saisie utilisateur)
          }))
        : [
            {
              id: Date.now(),
              description: "",
              quantity: 1,
              price: 0,
              priceTtc: null,
            },
          ];

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
      attestationTitle: inv?.attestationTitle || "ATTESTATION",
    };
  };

  const saveInvoiceToCloud = async () => {
    if (!currentInvoice?.clientName) return alert("Nom du client ?");
    setBusy(true);

    try {
      const normalized = normalizeInvoice(currentInvoice);
      const total = calculateTotal(
        normalized.items,
        normalized.tvaRate,
        normalized.applyTva
      );

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
            commande: "nextOrderNumber",
            garantie: "nextGarantieNumber",
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
      nextInvoiceNumber: nf = 1,
      nextAttestationNumber: na = 1,
      nextDeliveryNumber: nbl = 1,
      nextProformaNumber: np = 1,
      nextOrderNumber: noc = 1,
      nextGarantieNumber: ng = 1,
    } = companyConfig;

    let newDoc = normalizeInvoice({
      type,
      clientName: "",
      clientAddress: "",
      clientIdNumber: "",
      clientPhone: "",
      items: [
        {
          id: Date.now(),
          description: "",
          quantity: 1,
          price: 0,
          priceTtc: null,
        },
      ],
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
      attestationTitle: "ATTESTATION",
    });

    let n = nf;
    let pref = "FAC";

    if (type === "proforma") { n = np; pref = "PRO"; }
    else if (type === "livraison") { n = nbl; pref = "BL"; }
    else if (type === "commande") { n = noc; pref = "BC"; }
    else if (type === "attestation") { n = na; pref = "ATT"; }
    else if (type === "garantie") { n = ng; pref = "GAR"; }

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
        prev.items?.[0] || {
          id: Date.now(),
          description: "",
          quantity: 1,
          price: 0,
          priceTtc: null,
        };

      return {
        ...prev,
        boatDetails: {
          ...prev.boatDetails,
          model: m.name,
          length: m.length,
          approvalNumber: m.approvalNumber,
          year: prev.boatDetails?.year || "2026",
        },
        items: [
          {
            ...firstItem,
            description: designationFromModel(m.name), // ✅ Désignation
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
        const next = {
          ...prev,
          [modelId]: { ...(prev[modelId] || {}), [docKey]: b64 },
        };
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
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
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

    const subtotal = calculateSubtotal(inv.items); // HT
    const total = calculateTotal(inv.items, inv.tvaRate, inv.applyTva); // TTC
    const totalWords = NumberToLetter(total);

    const showTotals =
      subType !== "livraison" && subType !== "attestation" && subType !== "commande" && subType !== "garantie";
    const showPayBlock =
      showTotals && !!inv.showPayment && subType !== "proforma"; 

    const approvalShown = inv.boatDetails?.approvalNumber || "—";
    const showBoatBlockOnInvoice = subType === "facture" || subType === "proforma";

    const designationText = inv.attestationTitle === "ACTE" ? "le présent acte" : 
                            inv.attestationTitle === "CERTIFICAT" ? "le présent certificat" : "la présente attestation";

    return (
      <div className="bg-white w-[210mm] h-[297mm] p-[14mm] mx-auto shadow-2xl text-slate-900 relative text-[12px] leading-snug font-sans flex flex-col justify-between overflow-hidden print:shadow-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-red-600" />
        <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-blue-50" />
        <div className="absolute -left-24 -bottom-24 w-64 h-64 rounded-full bg-red-50" />

        <div className="relative">
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
            <div>
              {companyConfig.logo ? (
                <img
                  src={companyConfig.logo}
                  alt="logo"
                  className="h-12 object-contain mb-2"
                />
              ) : (
                <h1 className="text-xl font-black uppercase tracking-tight">
                  Pneuboat <span className="text-blue-700">SARL</span>
                </h1>
              )}
              <div className="text-[10px] text-slate-500 leading-tight">
                <p>{companyConfig.address}</p>
                <p>Tél: {companyConfig.phone}</p>
                <p className="text-slate-400">{companyConfig.email}</p>
                <p className="text-slate-400">
                  {companyConfig.website || "www.pneuboat.net"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase border border-slate-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {labelDoc(subType, inv)}
              </span>

              <div className="mt-3">
                <div className="font-mono text-base font-black text-slate-900">
                  {docNumber}
                </div>
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

          {subType === "livraison" && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Détails Livraison
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                    Modèle
                  </div>
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
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                    Longueur
                  </div>
                  <div className="font-black">{inv.boatDetails.length || "—"}</div>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-[175px]">
            {subType === "attestation" ? (
              <div className="space-y-4">
                <p className="text-justify text-[11px] leading-relaxed">
                  Je soussigné, <b>{companyConfig.managerName}</b>, gérant de{" "}
                  <b>{companyConfig.name}</b>, certifie par {designationText} que le navire a été construit
                  à neuf dans nos ateliers pour le compte de{" "}
                  <b>{inv.clientName || ".........."}</b>.
                </p>

                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-red-50 p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    Garantie
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    Garantie <span className="text-slate-900 font-black">1 an</span>{" "}
                    sur tout décollement ou problème provenant d’usine (défaut de
                    fabrication), sous réserve d’une utilisation normale.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-2 text-[9px] font-black uppercase text-center tracking-widest">
                    Détails du Bateau
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 bg-white">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Modèle
                      </div>
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

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Numéro d’approbation (DMMP)
                      </div>
                      <div className="font-black text-slate-900">{approvalShown}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Longueur
                      </div>
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
            ) : subType === "garantie" ? (
              <div className="space-y-4">
                <p className="text-justify text-[12px] leading-relaxed">
                  Je soussigné, <b>{companyConfig.managerName}</b>, gérant de{" "}
                  <b>{companyConfig.name}</b>, certifie par la présente que le navire détaillé ci-dessous bénéficie d'une <b>garantie d'une (01) année</b> à compter de la date de livraison, pour le compte de notre client <b>{inv.clientName || ".........."}</b>.
                </p>

                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    Conditions de Garantie
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    Cette garantie couvre exclusivement tout décollement ou problème provenant de l'usine (défaut de
                    fabrication). Elle reste valable sous réserve d’une utilisation normale du bateau, conforme aux recommandations du constructeur.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-2 text-[9px] font-black uppercase text-center tracking-widest">
                    Détails du Bateau Garanti
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 bg-white">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Modèle
                      </div>
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
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Longueur
                      </div>
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
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Modèle voulu
                      </div>
                      <div className="font-black">
                        {inv.orderDetails?.modelWanted ||
                          inv.boatDetails?.model ||
                          "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Couleurs
                      </div>
                      <div className="font-bold">{inv.orderDetails?.colors || "—"}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Options
                      </div>
                      <div className="font-bold">{inv.orderDetails?.options || "—"}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                        Accessoires (Textuel)
                      </div>
                      <div className="font-bold">
                        {inv.orderDetails?.accessories || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* NOUVEAU: Affichage des articles dans la commande pour voir les accessoires ajoutés */}
                {inv.items.length > 0 && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-left text-slate-700 font-black uppercase bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                          <th className="py-2.5 px-3">Désignation</th>
                          <th className="py-2.5 px-3 text-center w-16">Qté</th>
                          <th className="py-2.5 px-3 text-right w-24">P.U</th>
                          <th className="py-2.5 px-3 text-right w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((it, i) => (
                          <tr
                            key={it.id || i}
                            className="border-b border-slate-100 last:border-b-0 bg-white"
                          >
                            <td className="py-2.5 px-3 font-bold">{it.description}</td>
                            <td className="py-2.5 px-3 text-center font-black">
                              {Number(it.quantity || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {Number(it.price || 0).toLocaleString("fr-FR")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              {(
                                Number(it.quantity || 0) * Number(it.price || 0)
                              ).toLocaleString("fr-FR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Règlement
                  </div>

                  {(() => {
                    const totalCmd = calculateTotal(inv.items, inv.tvaRate, inv.applyTva);
                    const paid = Number(inv.orderDetails?.amountPaid || 0);
                    const rest = Math.max(totalCmd - paid, 0);

                    return (
                      <div className="grid grid-cols-3 gap-3 text-[11px]">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                            Total (Bateau + Accessoires)
                          </div>
                          <div className="font-black text-blue-700">
                            {formatCurrency(totalCmd)}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                            Total versé
                          </div>
                          <div className="font-black">{formatCurrency(paid)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                            Restant
                          </div>
                          <div className="font-black text-red-600">
                            {formatCurrency(rest)}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {showBoatBlockOnInvoice && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Détails Bateau
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-[11px]">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                          Modèle
                        </div>
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
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest">
                          Longueur
                        </div>
                        <div className="font-black">{inv.boatDetails.length || "—"}</div>
                      </div>
                    </div>
