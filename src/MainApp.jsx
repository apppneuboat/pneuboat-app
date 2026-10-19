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
  Palette,
  LayoutTemplate,
  Stamp,
  Copy,
} from "lucide-react";
import { supabase } from "./supabase";

/* ------------------ UTILITAIRES : CHIFFRES EN LETTRES (FR) ------------------ */
const NumberToLetter = (nombre) => {
  const unites = [
    "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept",
    "dix-huit", "dix-neuf",
  ];
  const dizaines = [
    "", "dix", "vingt", "trente", "quarante", "cinquante", "soixante",
    "soixante-dix", "quatre-vingt", "quatre-vingt-dix",
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

/* ------------------ UTILITAIRES : CHIFFRES EN LETTRES (AR) ------------------ */
const NumberToLetterAr = (nombre) => {
  const val = Number(nombre || 0);
  if (val === 0) return "صفر دينار جزائري";

  const ones = [
    "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
    "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر",
    "سبعة عشر", "ثمانية عشر", "تسعة عشر",
  ];
  const tens = [
    "", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون",
  ];
  const hundreds = [
    "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة",
  ];

  const conv99 = (n) => {
    if (n < 20) return ones[n];
    const u = n % 10;
    const d = Math.floor(n / 10);
    if (u === 0) return tens[d];
    return `${ones[u]} و ${tens[d]}`;
  };

  const conv999 = (n) => {
    const c = Math.floor(n / 100);
    const r = n % 100;
    let res = "";
    if (c > 0) res += hundreds[c];
    if (r > 0) res += (res ? " و " : "") + conv99(r);
    return res;
  };

  const ent = Math.floor(val);
  const dec = Math.round((val - ent) * 100);

  let n = ent;
  let parts = [];

  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    if (m === 1) parts.push("مليون");
    else if (m === 2) parts.push("مليونان");
    else if (m >= 3 && m <= 10) parts.push(`${ones[m]} ملايين`);
    else parts.push(`${conv999(m)} مليون`);
    n %= 1000000;
  }

  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    if (k === 1) parts.push("ألف");
    else if (k === 2) parts.push("ألفان");
    else if (k >= 3 && k <= 10) parts.push(`${ones[k]} آلاف`);
    else parts.push(`${conv999(k)} ألف`);
    n %= 1000;
  }

  if (n > 0) {
    parts.push(conv999(n));
  }

  let final = parts.join(" و ") + " دينار جزائري";
  if (dec > 0) {
    final += " و " + conv99(dec) + " سنتيم";
  }
  return final;
};

/* ------------------ TRANSCRIPTION PHONÉTIQUE FR -> AR ------------------ */
const DICT_FR_AR = {
  mohamed: "محمد", mohammed: "محمد", mhamed: "امحمد", ahmed: "أحمد",
  youcef: "يوسف", youssef: "يوسف", ali: "علي", omar: "عمر",
  amine: "أمين", karim: "كريم", sofiane: "سفيان", yacine: "ياسين",
  yassine: "ياسين", mourad: "مراد", kamel: "كمال", nabil: "نبيل",
  farid: "فريد", rachid: "رشيد", said: "سعيد", walid: "وليد",
  khalil: "خليل", khaled: "خالد", bilal: "بلال", bilel: "بلال",
  hamza: "حمزة", tarek: "طارق", tarik: "طارق", kader: "قادر",
  abdelkader: "عبد القادر", abdelkrim: "عبد الكريم", abderrahmane: "عبد الرحمن",
  abdallah: "عبد الله", abdellah: "عبد الله", abdelaziz: "عبد العزيز",
  abdelhak: "عبد الحق", abdelmalek: "عبد المالك", abdelmadjid: "عبد المجيد",
  brahim: "براهيم", ibrahim: "إبراهيم", ismail: "إسماعيل",
  mustapha: "مصطفى", moustafa: "مصطفى", sidahmed: "سيد أحمد",
  boumediene: "بومدين", houari: "هواري", benali: "بن علي",
  mansour: "منصور", mansouri: "منصوري", tahar: "طاهر",
  djamel: "جمال", djamil: "جميل", samir: "سمير", adel: "عادل",
  riad: "رياض", ryad: "رياض", redha: "رضا", reda: "رضا",
  mehdi: "مهدي", mahdi: "مهدي", lotfi: "لطفي", ramzi: "رمزي",
  zakaria: "زكرياء", zaki: "زكي", anis: "أنيس", ayoub: "أيوب",
  ilyes: "إلياس", ilyas: "إلياس", imad: "عماد", fouad: "فؤاد",
  slimane: "سليمان", salim: "سليم", selim: "سليم",
  hichem: "هشام", hicham: "هشام", hakima: "حكيمة", hakim: "حكيم",
  wassila: "وسيلة", fatima: "فاطمة", khadidja: "خديجة", aicha: "عائشة",
  meriem: "مريم", maryam: "مريم", amina: "أمينة", sarah: "سارة",
  sara: "سارة", yasmine: "ياسمين", yasmina: "ياسمينة", nadia: "نادية",
  karima: "كريمة", samira: "سميرة", nacera: "نصيرة", zohra: "زهرة",
  halima: "حليمة", souad: "سعاد", nawel: "نوال", asma: "أسماء",
  ikram: "إكرام", imane: "إيمان", imene: "إيمان", nesrine: "نسرين",
  sekkal: "سكال", gherbi: "غربي",

  oran: "وهران", wahran: "وهران", alger: "الجزائر", annaba: "عنابة",
  constantine: "قسنطينة", tlemcen: "تلمسان", mostaganem: "مستغانم",
  temouchent: "تموشنت", sidi: "سيدي", bel: "بل", abbes: "عباس",
  bejaia: "بجاية", tizi: "تيزي", ouzou: "وزو", blida: "البليدة",
  tipaza: "تيبازة", chlef: "الشلف", mascara: "معسكر", relizane: "غليزان",
  saïda: "سعيدة", saida: "سعيدة", skikda: "سكيكدة", jijel: "جيجل",
  setif: "سطيف", batna: "باتنة", biskra: "بسكرة", ouargla: "ورقلة",
  ghardaia: "غرداية", bechar: "بشار", adrar: "أدرار", tamanrasset: "تمنراست",
  boumerdes: "بومرداس", bouira: "البويرة", medea: "المدية",
  ain: "عين", turk: "الترك", el: "ال", al: "ال", bir: "بئر",
  djir: "الجير", es: "ال", senia: "السانية", arzew: "أرزيو",
  bethioua: "بطيوة", misserghine: "مسرغين", bousfer: "بوسفر",
  badr: "البدر", akid: "عقيد",

  hai: "حي", cite: "حي", cité: "حي", rue: "شارع", boulevard: "نهج",
  bd: "نهج", avenue: "شارع", route: "طريق", RN: "ط.و",
  lotissement: "تجزئة", lot: "تجزئة", coop: "تعاونية",
  cooperative: "تعاونية", batiment: "عمارة", bt: "عمارة",
  bloc: "بلوك", porte: "باب", numero: "رقم", num: "رقم",
  sarl: "ذ.م.م", eurl: "م.ش.و.ذ.م.م", spa: "ش.ذ.أ", snc: "ش.ت",
  et: "و", ben: "بن", bou: "بو",
};

const transliterateWord = (word) => {
  if (!word) return "";
  if (/^\d+$/.test(word)) return word;

  const clean = word.toLowerCase().trim();
  if (DICT_FR_AR[clean]) return DICT_FR_AR[clean];

  let w = clean
    .replace(/^[l']+/i, "ل")
    .replace(/^[d']+/i, "د");

  let prefix = "";
  if (w.startsWith("el-") || w.startsWith("al-")) {
    prefix = "ال";
    w = w.slice(3);
  } else if (w.startsWith("ben")) {
    prefix = "بن ";
    w = w.slice(3);
  }

  if (DICT_FR_AR[w]) return prefix + DICT_FR_AR[w];

  w = w
    .replace(/tch/g, "تش")
    .replace(/dj/g, "ج")
    .replace(/ch/g, "ش")
    .replace(/sh/g, "ش")
    .replace(/kh/g, "خ")
    .replace(/gh/g, "غ")
    .replace(/th/g, "ث")
    .replace(/dh/g, "ذ")
    .replace(/ph/g, "ف")
    .replace(/ou/g, "و")
    .replace(/oo/g, "و")
    .replace(/eau/g, "و")
    .replace(/au/g, "و")
    .replace(/ai/g, "ي")
    .replace(/ei/g, "ي")
    .replace(/ee/g, "ي")
    .replace(/qu/g, "ك")
    .replace(/gu/g, "غ")
    .replace(/gn/g, "ني");

  w = w.replace(/([bcdfghjklmnpqrstvwxz])\1+/g, "$1");

  if (/^[aàâä]/.test(w)) w = "أ" + w.slice(1);
  else if (/^[eéèêëiîï]/.test(w)) w = "إ" + w.slice(1);
  else if (/^[oôöuùûü]/.test(w)) w = "أو" + w.slice(1);

  w = w.replace(/ia$/g, "ية").replace(/a$/g, "ة").replace(/e$/g, "");

  const charMap = {
    a: "ا", à: "ا", â: "ا", ä: "ا",
    b: "ب", c: "ك", ç: "س", d: "د",
    e: "ي", é: "ي", è: "ا", ê: "ا", ë: "",
    f: "ف", g: "غ", h: "ه", i: "ي", î: "ي", ï: "ي",
    j: "ج", k: "ك", l: "ل", m: "م", n: "ن",
    o: "و", ô: "و", ö: "و", p: "ب", q: "ق",
    r: "ر", s: "س", t: "ت", u: "و", ù: "و", û: "و", ü: "و",
    v: "ف", w: "و", x: "كس", y: "ي", z: "ز",
  };

  let out = "";
  for (let ch of w) {
    out += charMap[ch] !== undefined ? charMap[ch] : ch;
  }

  return prefix + out;
};

const transliterateFrToAr = (text) => {
  if (!text) return "";
  return text
    .split(/(\s+|[,.;:/\\()-]+)/)
    .map((token) => {
      if (/^\s+$/.test(token) || /^[,.;:/\\()-]+$/.test(token)) return token;
      return transliterateWord(token);
    })
    .join("");
};

/* ------------------ CALCULS & FORMATAGE ------------------ */
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

const labelDocFr = (t, inv) => {
  if (t === "facture") return "FACTURE";
  if (t === "proforma") return "FACTURE PROFORMA";
  if (t === "livraison") return "BON DE LIVRAISON";
  if (t === "attestation") return `${inv?.attestationTitle || "ATTESTATION"} DE CONSTRUCTION`;
  if (t === "garantie") return "CERTIFICAT DE GARANTIE";
  if (t === "commande") return "BON DE COMMANDE";
  if (t === "dossier") return "DOSSIER COMPLET";
  return String(t || "").toUpperCase();
};

const labelDocAr = (t, inv) => {
  if (t === "facture") return "فاتورة";
  if (t === "proforma") return "فاتورة شكلية";
  if (t === "livraison") return "وصل استلام";
  if (t === "attestation") {
    const title = inv?.attestationTitle;
    if (title === "ACTE") return "عقد بناء";
    if (title === "CERTIFICAT") return "شهادة بناء";
    return "شهادة بناء";
  }
  if (t === "garantie") return "شهادة ضمان";
  if (t === "commande") return "وصل طلبية";
  if (t === "dossier") return "ملف كامل";
  return "";
};

const paymentLabel = (pm) => {
  if (pm === "cheque") return { fr: "Chèque", ar: "صك" };
  if (pm === "virement") return { fr: "Virement bancaire", ar: "تحويل بنكي" };
  if (pm === "espece") return { fr: "Espèce", ar: "نقداً" };
  return { fr: "—", ar: "—" };
};

/* ------------------ PALETTES DE COULEURS HAUT DE GAMME ------------------ */
const DOC_THEMES = {
  apple: {
    id: "apple",
    label: "Apple Store (Cupertino)",
    desc: "Gris sidéral, blanc pur, bleu Apple & design ultra-épuré",
    preview: ["#1d1d1f", "#0071e3", "#f5f5f7"],
    textMain: "text-[#1d1d1f]",
    textSub: "text-[#86868b] font-medium",
    textLabel: "text-[#86868b] font-semibold",
    accentText: "text-[#0071e3]",
    badgeBg: "bg-[#f5f5f7] text-[#1d1d1f] border-[#d2d2d7]",
    badgeAr: "text-[#0071e3]",
    tableHead: "bg-[#f5f5f7] text-[#86868b] border-[#d2d2d7]",
    borderMain: "border-[#d2d2d7]",
    borderSub: "border-[#e8e8ed]",
    boxBg: "bg-[#f5f5f7]/90",
    highlightBox: "bg-[#f5f5f7] border-[#0071e3]/30",
    topBar: "bg-gradient-to-r from-[#1d1d1f] via-[#0071e3] to-[#1d1d1f]",
    bannerBg: "bg-[#1d1d1f] text-white",
  },
  black: {
    id: "black",
    label: "Noir Intense (Imprimante)",
    desc: "100% Noir & Blanc contrasté — idéal laser monochrome",
    preview: ["#000000", "#475569", "#f1f5f9"],
    textMain: "text-black",
    textSub: "text-black font-bold",
    textLabel: "text-black font-black",
    accentText: "text-black",
    badgeBg: "bg-black text-white border-black",
    badgeAr: "text-slate-200",
    tableHead: "bg-slate-100 text-black border-black",
    borderMain: "border-black",
    borderSub: "border-slate-400",
    boxBg: "bg-white",
    highlightBox: "bg-slate-50 border-black",
    topBar: "bg-black",
    bannerBg: "bg-black text-white",
  },
  yacht: {
    id: "yacht",
    label: "Bleu Yachting Royal",
    desc: "Bleu océan profond & touches dorées nautiques",
    preview: ["#0c2340", "#1e3a8a", "#d97706"],
    textMain: "text-slate-950",
    textSub: "text-slate-700 font-semibold",
    textLabel: "text-blue-950 font-black",
    accentText: "text-blue-900",
    badgeBg: "bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white border-amber-500/40",
    badgeAr: "text-amber-300",
    tableHead: "bg-slate-900 text-white border-slate-900",
    borderMain: "border-slate-300",
    borderSub: "border-slate-200",
    boxBg: "bg-slate-50/80",
    highlightBox: "bg-amber-50/50 border-amber-400",
    topBar: "bg-gradient-to-r from-blue-950 via-amber-500 to-blue-950",
    bannerBg: "bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white",
  },
  gold: {
    id: "gold",
    label: "Or & Prestige",
    desc: "Noir carbone & accents bronze/or très luxueux",
    preview: ["#18181b", "#78350f", "#f59e0b"],
    textMain: "text-zinc-950",
    textSub: "text-zinc-700 font-semibold",
    textLabel: "text-amber-900 font-black",
    accentText: "text-amber-800",
    badgeBg: "bg-zinc-900 text-amber-50 border-amber-600",
    badgeAr: "text-amber-400",
    tableHead: "bg-amber-50/90 text-zinc-950 border-amber-400",
    borderMain: "border-amber-400/80",
    borderSub: "border-amber-200",
    boxBg: "bg-amber-50/20",
    highlightBox: "bg-amber-50/60 border-amber-500",
    topBar: "bg-gradient-to-r from-zinc-900 via-amber-600 to-zinc-900",
    bannerBg: "bg-zinc-900 text-white",
  },
  blue: {
    id: "blue",
    label: "Bleu Marine Classique",
    desc: "Textes en noir profond et titres en bleu marine",
    preview: ["#172554", "#1d4ed8", "#dbeafe"],
    textMain: "text-slate-950",
    textSub: "text-slate-800 font-semibold",
    textLabel: "text-slate-700 font-black",
    accentText: "text-blue-900",
    badgeBg: "bg-blue-950 text-white border-blue-950",
    badgeAr: "text-blue-200",
    tableHead: "bg-blue-50 text-slate-950 border-slate-400",
    borderMain: "border-slate-400",
    borderSub: "border-slate-300",
    boxBg: "bg-slate-50/70",
    highlightBox: "bg-blue-50/60 border-blue-400",
    topBar: "bg-gradient-to-r from-blue-900 via-blue-700 to-red-700",
    bannerBg: "bg-blue-950 text-white",
  },
  crimson: {
    id: "crimson",
    label: "Rouge Régate",
    desc: "Gris anthracite et rouge bordeaux sportif",
    preview: ["#881337", "#e11d48", "#ffe4e6"],
    textMain: "text-slate-950",
    textSub: "text-slate-700 font-semibold",
    textLabel: "text-rose-950 font-black",
    accentText: "text-rose-800",
    badgeBg: "bg-rose-950 text-white border-rose-950",
    badgeAr: "text-rose-200",
    tableHead: "bg-rose-50 text-rose-950 border-rose-300",
    borderMain: "border-slate-300",
    borderSub: "border-slate-200",
    boxBg: "bg-slate-50/60",
    highlightBox: "bg-rose-50/50 border-rose-300",
    topBar: "bg-gradient-to-r from-slate-900 via-rose-700 to-slate-900",
    bannerBg: "bg-rose-950 text-white",
  },
  emerald: {
    id: "emerald",
    label: "Émeraude Marine",
    desc: "Vert forêt profond, sobre et institutionnel",
    preview: ["#064e3b", "#059669", "#d1fae5"],
    textMain: "text-slate-950",
    textSub: "text-slate-700 font-semibold",
    textLabel: "text-emerald-950 font-black",
    accentText: "text-emerald-800",
    badgeBg: "bg-emerald-950 text-white border-emerald-900",
    badgeAr: "text-emerald-200",
    tableHead: "bg-emerald-50/90 text-emerald-950 border-emerald-300",
    borderMain: "border-slate-300",
    borderSub: "border-slate-200",
    boxBg: "bg-emerald-50/20",
    highlightBox: "bg-emerald-50/60 border-emerald-400",
    topBar: "bg-gradient-to-r from-emerald-950 via-emerald-600 to-emerald-950",
    bannerBg: "bg-emerald-950 text-white",
  },
  ocean: {
    id: "ocean",
    label: "Cobalt & Cyan Moderne",
    desc: "Bleu vif moderne et très frais",
    preview: ["#0369a1", "#0284c7", "#e0f2fe"],
    textMain: "text-slate-950",
    textSub: "text-slate-700 font-semibold",
    textLabel: "text-sky-900 font-black",
    accentText: "text-sky-700",
    badgeBg: "bg-sky-900 text-white border-sky-900",
    badgeAr: "text-sky-200",
    tableHead: "bg-sky-50 text-sky-950 border-sky-300",
    borderMain: "border-sky-300",
    borderSub: "border-slate-200",
    boxBg: "bg-sky-50/30",
    highlightBox: "bg-sky-50/70 border-sky-400",
    topBar: "bg-gradient-to-r from-sky-900 via-cyan-500 to-blue-900",
    bannerBg: "bg-sky-900 text-white",
  },
  sand: {
    id: "sand",
    label: "Sable & Bronze",
    desc: "Tons chauds, pierre et terre cuite",
    preview: ["#44403c", "#78716c", "#f5f5f4"],
    textMain: "text-stone-950",
    textSub: "text-stone-700 font-semibold",
    textLabel: "text-stone-800 font-black",
    accentText: "text-stone-900",
    badgeBg: "bg-stone-900 text-stone-100 border-stone-900",
    badgeAr: "text-amber-200",
    tableHead: "bg-stone-200/80 text-stone-950 border-stone-400",
    borderMain: "border-stone-400",
    borderSub: "border-stone-300",
    boxBg: "bg-stone-50",
    highlightBox: "bg-stone-100 border-stone-400",
    topBar: "bg-stone-800",
    bannerBg: "bg-stone-900 text-white",
  },
  slate: {
    id: "slate",
    label: "Gris Anthracite Pro",
    desc: "Nuances de gris foncés et sobres",
    preview: ["#0f172a", "#475569", "#e2e8f0"],
    textMain: "text-slate-950",
    textSub: "text-slate-800 font-semibold",
    textLabel: "text-slate-700 font-black",
    accentText: "text-slate-950",
    badgeBg: "bg-slate-900 text-white border-slate-900",
    badgeAr: "text-slate-200",
    tableHead: "bg-slate-200 text-slate-950 border-slate-400",
    borderMain: "border-slate-400",
    borderSub: "border-slate-300",
    boxBg: "bg-slate-50",
    highlightBox: "bg-slate-100 border-slate-400",
    topBar: "bg-slate-900",
    bannerBg: "bg-slate-900 text-white",
  },
};

/* ------------------ MODÈLES DE MISE EN PAGE (DESIGNS DE FACTURE) ------------------ */
const DOC_LAYOUTS = {
  classic: {
    id: "classic",
    label: "Classique Pneuboat",
    desc: "Votre modèle actuel avec cartes arrondies et badge latéral",
  },
  apple: {
    id: "apple",
    label: "Apple Store Class",
    desc: "Design ultra-clean style Apple Store : cartes #F5F5F7, coins très doux et typographie fine",
  },
  prestige: {
    id: "prestige",
    label: "Prestige Yachting (Bannière)",
    desc: "En-tête pleine largeur coloré et structure corporate haut de gamme",
  },
  minimal: {
    id: "minimal",
    label: "Minimaliste & Épuré",
    desc: "Angles droits, lignes fines, style architectural très net à l'impression",
  },
  executive: {
    id: "executive",
    label: "Exécutif Encadré (Officiel)",
    desc: "Double cadre officiel A4 et titre centré solennel (idéal Actes & Certificats)",
  },
};

/* ------------------ Désignation + TVA inversée ------------------ */
const designationFromModel = (modelName) => {
  const m = String(modelName || "").trim();

  if (/pnb\s*[- ]?\s*525/i.test(m)) {
    return "Bateau rigide open PNB-525";
  }

  const match = m.match(/pnb\s*[- ]?\s*(\d{3})/i);
  if (match) {
    const code = `PNB-${match[1]}`;
    return `Semi rigide ${code}`;
  }

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
    nameAr: "ذ.م.م نيو-بوت",
    managerName: "Sekkal Gherbi Youcef",
    managerNameAr: "سكال غربي يوسف",
    address: "Hai el Badr Oran",
    email: "info@pneuboat.net",
    website: "www.pneuboat.net",
    phone: "0563269639",
    docTheme: "yacht",
    docLayout: "classic",
    showLogoWatermark: false,
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
        body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        setCompanyConfig((prev) => ({
          ...prev,
          ...configData.config,
          docTheme: configData.config.docTheme || prev.docTheme || "yacht",
          docLayout: configData.config.docLayout || prev.docLayout || "classic",
          showLogoWatermark:
            configData.config.showLogoWatermark ?? prev.showLogoWatermark ?? false,
        }));
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
            price: Number(it?.price || 0),
            priceTtc: it?.priceTtc ?? null,
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
      clientNameAr: inv?.clientNameAr ?? "",
      clientAddressAr: inv?.clientAddressAr ?? "",
      clientPhone: inv?.clientPhone ?? "",
      applyTva: inv?.applyTva ?? true,
      tvaRate: inv?.tvaRate ?? 19,
      showPayment: inv?.showPayment ?? true,
      paymentMethod: inv?.paymentMethod ?? "virement",
      clientChequeNumber: inv?.clientChequeNumber ?? "",
      date: inv?.date || new Date().toISOString().split("T")[0],
      attestationTitle: inv?.attestationTitle || "ATTESTATION",
      isBilingual: inv?.isBilingual ?? true,
      docTheme: inv?.docTheme || companyConfig.docTheme || "yacht",
      docLayout: inv?.docLayout || companyConfig.docLayout || "classic",
      showLogoWatermark:
        inv?.showLogoWatermark ?? companyConfig.showLogoWatermark ?? false,
      isDuplicate: inv?.isDuplicate ?? false,
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
      clientNameAr: "",
      clientAddress: "",
      clientAddressAr: "",
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
      isBilingual: true,
      docTheme: companyConfig.docTheme || "yacht",
      docLayout: companyConfig.docLayout || "classic",
      showLogoWatermark: companyConfig.showLogoWatermark ?? false,
      isDuplicate: false,
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
          year: prev.boatDetails?.year || new Date().getFullYear().toString(),
        },
        items: [
          {
            ...firstItem,
            description: designationFromModel(m.name),
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

  /* ------------------ RENDU DOCUMENT MULTI-MODÈLES ------------------ */
  const RenderDoc = ({ subType, docNumber }) => {
    if (!currentInvoice) return null;
    const inv = normalizeInvoice(currentInvoice);
    const { isBilingual } = inv;

    const themeKey = inv.docTheme || companyConfig.docTheme || "yacht";
    const T = DOC_THEMES[themeKey] || DOC_THEMES.black;

    const layoutKey = inv.docLayout || companyConfig.docLayout || "classic";
    const isMinimal = layoutKey === "minimal";
    const isPrestige = layoutKey === "prestige";
    const isExecutive = layoutKey === "executive";
    const isApple = layoutKey === "apple";

    const showLogoWatermark = !!inv.showLogoWatermark;
    const isDuplicate = !!inv.isDuplicate;

    // Adaptations de forme selon le modèle choisi
    const radiusBox = isMinimal
      ? "rounded-none"
      : isExecutive
      ? "rounded-lg"
      : isApple
      ? "rounded-3xl"
      : "rounded-2xl";
    const radiusInner = isMinimal
      ? "rounded-none"
      : isExecutive
      ? "rounded-md"
      : isApple
      ? "rounded-2xl"
      : "rounded-xl";

    const isCommande = subType === "commande";

    const subtotal = calculateSubtotal(inv.items);
    const total = calculateTotal(inv.items, inv.tvaRate, inv.applyTva);
    const totalWords = NumberToLetter(total);
    const totalWordsAr = NumberToLetterAr(total);

    const showTotals =
      subType !== "livraison" &&
      subType !== "attestation" &&
      subType !== "commande" &&
      subType !== "garantie";
    const showPayBlock =
      showTotals && !!inv.showPayment && subType !== "proforma";

    const approvalShown = inv.boatDetails?.approvalNumber || "—";
    const showBoatBlockOnInvoice = subType === "facture" || subType === "proforma";

    const designationText =
      inv.attestationTitle === "ACTE"
        ? "le présent acte"
        : inv.attestationTitle === "CERTIFICAT"
        ? "le présent certificat"
        : "la présente attestation";

    const DuplicateBadge = isDuplicate ? (
      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-50 border border-red-400 text-red-700 text-[10px] font-black uppercase tracking-widest shadow-sm">
        <span>DUPLICATA</span>
        {isBilingual && <span dir="rtl">/ نسخة طبق الأصل</span>}
      </div>
    ) : null;

    /* --- EN-TÊTE SELON LE MODÈLE CHOISI --- */
    const renderHeader = () => {
      if (isApple) {
        return (
          <div className="mb-6 pb-5 border-b border-[#d2d2d7] flex justify-between items-start">
            <div className="space-y-1.5">
              {companyConfig.logo ? (
                <img
                  src={companyConfig.logo}
                  alt="logo"
                  className="h-12 object-contain mb-2"
                />
              ) : (
                <h1 className={`text-2xl font-semibold tracking-tight ${T.textMain}`}>
                  {companyConfig.name}
                </h1>
              )}
              <div className={`text-[10px] ${T.textSub} leading-relaxed`}>
                <p className="font-semibold text-[#1d1d1f]">{companyConfig.address}</p>
                <p>{companyConfig.phone} • {companyConfig.email}</p>
                <p>{companyConfig.website || "www.pneuboat.net"}</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${T.accentText}`}>
                Chantier Naval • Store Officiel
              </span>
              <h2 className={`text-2xl font-bold tracking-tight mt-0.5 ${T.textMain}`}>
                {labelDocFr(subType, inv)}
              </h2>
              {isBilingual && (
                <div className={`text-sm font-semibold ${T.textSub}`} dir="rtl">
                  {labelDocAr(subType, inv)}
                </div>
              )}
              <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f5f5f7] border border-[#d2d2d7] text-[11px] font-semibold text-[#1d1d1f]">
                <span className="font-mono font-bold">{docNumber}</span>
                <span className="opacity-30">•</span>
                <span>{new Date(inv.date).toLocaleDateString("fr-FR")}</span>
              </div>
              {DuplicateBadge}
            </div>
          </div>
        );
      }

      if (isPrestige) {
        return (
          <div className="mb-5">
            <div className={`-mx-[14mm] -mt-[14mm] px-[14mm] py-6 ${T.bannerBg} flex justify-between items-center shadow-sm`}>
              <div>
                {companyConfig.logo ? (
                  <img
                    src={companyConfig.logo}
                    alt="logo"
                    className="h-14 object-contain mb-2 bg-white/95 p-1.5 rounded-xl"
                  />
                ) : (
                  <h1 className="text-2xl font-black uppercase tracking-tight text-white">
                    {companyConfig.name}
                  </h1>
                )}
                <div className="text-[10px] text-white/80 leading-tight font-medium">
                  <p>{companyConfig.address} • Tél: {companyConfig.phone}</p>
                  <p>{companyConfig.email} • {companyConfig.website || "www.pneuboat.net"}</p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="text-[15px] font-black uppercase tracking-widest text-white">
                  {labelDocFr(subType, inv)}
                </div>
                {isBilingual && (
                  <div className={`text-[13px] font-bold ${T.badgeAr}`} dir="rtl">
                    {labelDocAr(subType, inv)}
                  </div>
                )}
                <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-white/15 text-white font-mono text-sm font-black">
                  {docNumber}
                </div>
                <div className="text-[10px] text-white/80 mt-1">
                  Le {new Date(inv.date).toLocaleDateString("fr-FR")}
                </div>
                {DuplicateBadge}
              </div>
            </div>
          </div>
        );
      }

      if (isMinimal) {
        return (
          <div className={`border-b-4 ${T.borderMain} pb-4 mb-5 flex justify-between items-end`}>
            <div>
              {companyConfig.logo ? (
                <img
                  src={companyConfig.logo}
                  alt="logo"
                  className="h-12 object-contain mb-2"
                />
              ) : (
                <h1 className={`text-2xl font-black uppercase tracking-tighter ${T.textMain}`}>
                  {companyConfig.name}
                </h1>
              )}
              <div className={`text-[10px] ${T.textSub} leading-tight`}>
                <p>{companyConfig.address} — Tél: {companyConfig.phone}</p>
                <p>{companyConfig.email} — {companyConfig.website || "www.pneuboat.net"}</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className={`text-lg font-black uppercase tracking-widest ${T.accentText}`}>
                {labelDocFr(subType, inv)}
              </div>
              {isBilingual && (
                <div className={`text-sm font-black ${T.textMain}`} dir="rtl">
                  {labelDocAr(subType, inv)}
                </div>
              )}
              <div className={`font-mono text-sm font-black mt-1 ${T.textMain}`}>
                N° {docNumber} <span className="font-normal opacity-60">|</span> {new Date(inv.date).toLocaleDateString("fr-FR")}
              </div>
              {DuplicateBadge}
            </div>
          </div>
        );
      }

      if (isExecutive) {
        return (
          <div className="mb-5">
            <div className="flex justify-between items-start pb-3">
              <div>
                {companyConfig.logo ? (
                  <img
                    src={companyConfig.logo}
                    alt="logo"
                    className="h-12 object-contain mb-1"
                  />
                ) : (
                  <h1 className={`text-xl font-black uppercase ${T.textMain}`}>
                    {companyConfig.name}
                  </h1>
                )}
                <div className={`text-[10px] ${T.textSub} leading-tight`}>
                  <p>{companyConfig.address}</p>
                  <p>Tél: {companyConfig.phone} • {companyConfig.email}</p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                {isBilingual && (
                  <div className={`text-sm font-black ${T.textMain}`} dir="rtl">
                    {companyConfig.nameAr || companyConfig.name}
                  </div>
                )}
                <div className={`font-mono text-sm font-black mt-1 ${T.accentText}`}>
                  Réf : {docNumber}
                </div>
                <div className={`text-[10px] ${T.textSub}`}>
                  Oran, le {new Date(inv.date).toLocaleDateString("fr-FR")}
                </div>
                {DuplicateBadge}
              </div>
            </div>

            <div className={`py-2.5 px-4 border-y-2 ${T.borderMain} ${T.boxBg} flex justify-between items-center`}>
              <span className={`text-[13px] font-black uppercase tracking-widest ${T.accentText}`}>
                {labelDocFr(subType, inv)}
              </span>
              <span className={`font-mono text-xs font-black ${T.textMain}`}>
                {docNumber}
              </span>
              {isBilingual && (
                <span className={`text-[13px] font-black ${T.accentText}`} dir="rtl">
                  {labelDocAr(subType, inv)}
                </span>
              )}
            </div>
          </div>
        );
      }

      // Modèle Classic par défaut
      return (
        <div className={`flex justify-between items-start border-b-2 ${T.borderMain} pb-4 mb-4`}>
          <div>
            {companyConfig.logo ? (
              <img
                src={companyConfig.logo}
                alt="logo"
                className="h-12 object-contain mb-2"
              />
            ) : (
              <h1 className={`text-xl font-black uppercase tracking-tight ${T.textMain}`}>
                Pneuboat <span className={T.accentText}>SARL</span>
              </h1>
            )}
            <div className={`text-[10px] ${T.textSub} leading-tight`}>
              <p>{companyConfig.address}</p>
              <p>Tél: {companyConfig.phone}</p>
              <p>{companyConfig.email}</p>
              <p>{companyConfig.website || "www.pneuboat.net"}</p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className={`inline-flex flex-col items-end px-4 py-2 rounded-xl text-[12px] font-black uppercase border shadow-sm ${T.badgeBg}`}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {labelDocFr(subType, inv)}
              </div>
              {isBilingual && (
                <div className={`text-[11px] mt-1 ${T.badgeAr}`} dir="rtl">
                  {labelDocAr(subType, inv)}
                </div>
              )}
            </div>

            <div className="mt-2.5 text-right flex flex-col items-end">
              <div className={`font-mono text-base font-black ${T.textMain}`}>
                {docNumber}
              </div>
              <div className={`text-[10px] mt-0.5 flex justify-end gap-2 items-center ${T.textSub}`}>
                <span>Le {new Date(inv.date).toLocaleDateString("fr-FR")}</span>
              </div>
              {DuplicateBadge}
            </div>
          </div>
        </div>
      );
    };

    const ItemsTable = (
      <div className={`${radiusBox} overflow-hidden ${isApple ? "border border-[#e8e8ed] bg-white" : `border ${T.borderMain}`}`}>
        <table className={`w-full text-[11px] ${T.textMain}`}>
          <thead>
            <tr className={`text-left font-black uppercase border-b ${T.tableHead}`}>
              <th className="py-2.5 px-3.5">
                <div>Désignation</div>
                {isBilingual && <div dir="rtl" className="text-[9px] opacity-85">التعيين</div>}
              </th>
              <th className="py-2.5 px-3 text-center w-16">
                <div>Qté</div>
                {isBilingual && <div dir="rtl" className="text-[9px] opacity-85">الكمية</div>}
              </th>
              {subType !== "livraison" && (
                <>
                  <th className="py-2.5 px-3 text-right w-24">
                    <div>P.U</div>
                    {isBilingual && <div dir="rtl" className="text-[9px] opacity-85">سعر الوحدة</div>}
                  </th>
                  <th className="py-2.5 px-3.5 text-right w-28">
                    <div>Total</div>
                    {isBilingual && <div dir="rtl" className="text-[9px] opacity-85">المجموع</div>}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr
                key={it.id || i}
                className={`border-b ${T.borderSub} last:border-b-0 ${isPrestige && i % 2 === 1 ? T.boxBg : ""}`}
              >
                <td className={`py-2.5 px-3.5 font-bold ${T.textMain}`}>{it.description}</td>
                <td className={`py-2.5 px-3 text-center font-black ${T.textMain}`}>
                  {Number(it.quantity || 0)}
                </td>
                {subType !== "livraison" && (
                  <>
                    <td className={`py-2.5 px-3 text-right font-bold ${T.textMain}`}>
                      {Number(it.price || 0).toLocaleString("fr-FR")}
                    </td>
                    <td className={`py-2.5 px-3.5 text-right font-black ${T.textMain}`}>
                      {(
                        Number(it.quantity || 0) * Number(it.price || 0)
                      ).toLocaleString("fr-FR")}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {inv.items.length === 0 && (
              <tr>
                <td className={`p-6 text-center font-black ${T.textSub}`} colSpan={4}>
                  {isBilingual ? "Aucun article / لا يوجد أي عنصر" : "Aucun article"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );

    return (
      <div className={`bg-white w-[210mm] h-[297mm] p-[14mm] mx-auto shadow-2xl ${T.textMain} relative text-[12px] leading-snug font-sans flex flex-col justify-between overflow-hidden print:shadow-none`}>
        {/* FILIGRANE (WATERMARK) LOGO AU CENTRE */}
        {showLogoWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
            {companyConfig.logo ? (
              <img
                src={companyConfig.logo}
                alt="Watermark Logo"
                className="w-[125mm] max-h-[125mm] object-contain opacity-[0.06] select-none"
              />
            ) : (
              <div className="text-[72px] font-black uppercase tracking-widest opacity-[0.04] -rotate-12 select-none text-slate-900">
                {companyConfig.name}
              </div>
            )}
          </div>
        )}

        {/* FILIGRANE (WATERMARK) DUPLICATA */}
        {isDuplicate && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
            <div className="border-[6px] border-red-600/15 text-red-600/15 px-12 py-5 rounded-3xl -rotate-[28deg] flex flex-col items-center select-none">
              <span className="text-[64px] font-black uppercase tracking-[0.22em] leading-none">
                DUPLICATA
              </span>
              {isBilingual && (
                <span className="text-[32px] font-black mt-2" dir="rtl">
                  نسخة طبق الأصل
                </span>
              )}
            </div>
          </div>
        )}

        {/* Barre supérieure ou Cadre selon le modèle */}
        {!isPrestige && !isExecutive && !isApple && (
          <div className={`absolute top-0 left-0 right-0 ${isMinimal ? "h-1" : "h-2"} ${T.topBar}`} />
        )}
        {isApple && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1d1d1f] via-[#0071e3] to-[#1d1d1f]" />
        )}
        {isExecutive && (
          <>
            <div className={`absolute inset-[6mm] border-2 ${T.borderMain} pointer-events-none`} />
            <div className={`absolute top-[6mm] bottom-[6mm] left-[6mm] w-1.5 ${T.topBar} pointer-events-none`} />
          </>
        )}

        <div className="relative z-10">
          {renderHeader()}

          {/* BLOC CLIENT */}
          <div className={`mb-4 ${T.boxBg} ${isApple ? "border border-[#e8e8ed]" : `border ${T.borderMain}`} ${radiusBox} p-4 relative overflow-hidden flex justify-between gap-4`}>
            {!isMinimal && !isApple && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${T.topBar}`} />}
            
            <div className="flex-1 pl-1">
              <h3 className={`text-[9px] uppercase tracking-widest mb-1 ${T.textLabel}`}>
                {isApple ? "Facturé à" : "Client"}
              </h3>
              <div className={`text-[14px] font-black uppercase truncate ${T.textMain}`}>
                {inv.clientName || "—"}
              </div>
              <div className={`text-[11px] line-clamp-1 mt-1 ${T.textSub}`}>
                {inv.clientAddress || "—"}
              </div>
            </div>

            {isBilingual && (
              <div className="flex-1 text-right" dir="rtl">
                <h3 className={`text-[9px] uppercase tracking-widest mb-1 ${T.textLabel}`}>
                  الزبون
                </h3>
                <div className={`text-[14px] font-black uppercase truncate ${T.textMain}`}>
                  {inv.clientNameAr || "—"}
                </div>
                <div className={`text-[11px] line-clamp-1 mt-1 ${T.textSub}`}>
                  {inv.clientAddressAr || "—"}
                </div>
              </div>
            )}
          </div>

          {/* Numéro ID & Téléphone */}
          <div className="flex flex-wrap gap-2 mb-4">
            {!!inv.clientIdNumber && (
              <span className={`px-3 py-1.5 ${radiusInner} bg-white border ${T.borderMain} text-[10px] font-black uppercase tracking-widest ${T.textMain} flex items-center gap-2`}>
                <span>ID: {inv.clientIdNumber}</span>
              </span>
            )}
            {!!inv.clientPhone && (
              <span className={`px-3 py-1.5 ${radiusInner} bg-white border ${T.borderMain} text-[10px] font-black uppercase tracking-widest ${T.textMain} inline-flex items-center gap-2`}>
                <Phone size={12} /> {inv.clientPhone}
                {isBilingual && <><span className="opacity-40">|</span><span dir="rtl">الهاتف</span></>}
              </span>
            )}
          </div>

          {subType === "livraison" && (
            <div className={`mb-4 ${radiusBox} border ${T.borderMain} bg-white/95 p-4`}>
              <div className="flex justify-between items-center mb-3">
                <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Détails Livraison</div>
                {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">تفاصيل التسليم</div>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                  <div>
                    <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Modèle</div>
                    <div className={`font-black ${T.textMain}`}>{inv.boatDetails.model || "—"}</div>
                  </div>
                  {isBilingual && (
                    <div className="text-right" dir="rtl">
                      <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الموديل</div>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                  <div>
                    <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>N° de série</div>
                    <div className={`font-black font-mono ${T.accentText}`}>{inv.boatDetails.serialNumber || "—"}</div>
                  </div>
                  {isBilingual && (
                    <div className="text-right" dir="rtl">
                      <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>رقم التسلسل</div>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                  <div>
                    <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Téléphone client</div>
                    <div className={`font-black ${T.textMain}`}>{inv.clientPhone || "—"}</div>
                  </div>
                  {isBilingual && (
                    <div className="text-right" dir="rtl">
                      <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>هاتف الزبون</div>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                  <div>
                    <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Longueur</div>
                    <div className={`font-black ${T.textMain}`}>{inv.boatDetails.length || "—"}</div>
                  </div>
                  {isBilingual && (
                    <div className="text-right" dir="rtl">
                      <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الطول</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="min-h-[175px]">
            {subType === "attestation" ? (
              <div className="space-y-4">
                <div className={`grid grid-cols-1 ${isBilingual ? "md:grid-cols-2" : ""} gap-6`}>
                  <p className={`text-justify text-[11px] leading-relaxed ${T.textMain}`}>
                    Je soussigné, <b>{companyConfig.managerName}</b>, gérant de{" "}
                    <b>{companyConfig.name}</b>, certifie par {designationText} que le navire a été construit
                    à neuf dans nos ateliers pour le compte de{" "}
                    <b>{inv.clientName || ".........."}</b>.
                  </p>
                  {isBilingual && (
                    <p className={`text-justify text-[12px] leading-relaxed font-bold ${T.textMain}`} dir="rtl">
                      أنا الممضي أسفله، <b>{companyConfig.managerNameAr || companyConfig.managerName}</b>، مسير شركة{" "}
                      <b>{companyConfig.nameAr || companyConfig.name}</b>، أشهد بموجب هذه الوثيقة أن القارب قد تم بناؤه جديداً في ورشاتنا لصالح السيد(ة){" "}
                      <b>{inv.clientNameAr || inv.clientName || ".........."}</b>.
                    </p>
                  )}
                </div>

                <div className={`${radiusBox} border ${T.highlightBox} p-4`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Garantie</div>
                    {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">الضمان</div>}
                  </div>
                  <div className={`grid grid-cols-1 ${isBilingual ? "md:grid-cols-2" : ""} gap-4`}>
                    <div className={`text-[11px] font-bold ${T.textMain}`}>
                      Garantie <span className="font-black underline">1 an</span> sur tout décollement ou problème provenant d&apos;usine (défaut de fabrication), sous réserve d&apos;une utilisation normale.
                    </div>
                    {isBilingual && (
                      <div className={`text-[11px] font-bold text-justify ${T.textMain}`} dir="rtl">
                        ضمان لمدة <span className="font-black underline">سنة (1)</span> على أي تفكك أو مشكل ناتج عن المصنع (عيب في الصنع)، شريطة الاستخدام العادي للقارب.
                      </div>
                    )}
                  </div>
                </div>

                <div className={`border ${T.borderMain} ${radiusBox} overflow-hidden`}>
                  <div className={`${T.badgeBg} px-4 py-2 flex justify-between items-center`}>
                    <div className="text-[9px] font-black uppercase tracking-widest">Détails du Bateau</div>
                    {isBilingual && <div className="text-[10px] font-black tracking-widest" dir="rtl">تفاصيل القارب</div>}
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 bg-white/95">
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Modèle</div>
                        <div className={`font-black ${T.textMain}`}>{inv.boatDetails.model || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الموديل</div>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>N° de série</div>
                        <div className={`font-black font-mono ${T.accentText}`}>{inv.boatDetails.serialNumber || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>رقم التسلسل</div>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} col-span-2 flex justify-between items-center`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Numéro d&apos;approbation (DMMP)</div>
                        <div className={`font-black ${T.textMain}`}>{approvalShown}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>رقم الاعتماد</div>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Longueur</div>
                        <div className={`font-black ${T.textMain}`}>{inv.boatDetails.length || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الطول</div>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Année de construction</div>
                        <div className={`font-black ${T.textMain}`}>{inv.boatDetails.year || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>سنة الصنع</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : subType === "garantie" ? (
              <div className="space-y-4">
                <div className={`grid grid-cols-1 ${isBilingual ? "md:grid-cols-2" : ""} gap-6`}>
                  <p className={`text-justify text-[12px] leading-relaxed ${T.textMain}`}>
                    Je soussigné, <b>{companyConfig.managerName}</b>, gérant de{" "}
                    <b>{companyConfig.name}</b>, certifie par la présente que le navire détaillé ci-dessous bénéficie d&apos;une <b>garantie d&apos;une (01) année</b> à compter de la date de livraison, pour le compte de notre client <b>{inv.clientName || ".........."}</b>.
                  </p>
                  {isBilingual && (
                    <p className={`text-justify text-[12px] leading-relaxed font-bold ${T.textMain}`} dir="rtl">
                      أنا الممضي أسفله، <b>{companyConfig.managerNameAr || companyConfig.managerName}</b>، مسير شركة{" "}
                      <b>{companyConfig.nameAr || companyConfig.name}</b>، أشهد بموجب هذه الوثيقة أن القارب المفصل أدناه يستفيد من <b>ضمان لمدة سنة (01) واحدة</b> ابتداءً من تاريخ التسليم، لصالح زبوننا <b>{inv.clientNameAr || inv.clientName || ".........."}</b>.
                    </p>
                  )}
                </div>

                <div className={`${radiusBox} border ${T.highlightBox} p-4`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Conditions de Garantie</div>
                    {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">شروط الضمان</div>}
                  </div>
                  <div className={`grid grid-cols-1 ${isBilingual ? "md:grid-cols-2" : ""} gap-4`}>
                    <div className={`text-[11px] font-bold ${T.textMain}`}>
                      Cette garantie couvre exclusivement tout décollement ou problème provenant de l&apos;usine (défaut de fabrication). Elle reste valable sous réserve d&apos;une utilisation normale du bateau, conforme aux recommandations du constructeur.
                    </div>
                    {isBilingual && (
                      <div className={`text-[11px] font-bold text-justify ${T.textMain}`} dir="rtl">
                        يغطي هذا الضمان حصرياً أي تفكك أو مشكل ناتج عن المصنع (عيب في الصنع). ويبقى صالحاً بشرط الاستخدام العادي للقارب، وفقاً لتوصيات المصنع.
                      </div>
                    )}
                  </div>
                </div>

                <div className={`border ${T.borderMain} ${radiusBox} overflow-hidden`}>
                  <div className={`${T.badgeBg} px-4 py-2 flex justify-between items-center`}>
                    <div className="text-[9px] font-black uppercase tracking-widest">Détails du Bateau Garanti</div>
                    {isBilingual && <div className="text-[10px] font-black tracking-widest" dir="rtl">تفاصيل القارب المضمون</div>}
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 bg-white/95">
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Modèle</div>
                        <div className={`font-black ${T.textMain}`}>{inv.boatDetails.model || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الموديل</div>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>N° de série</div>
                        <div className={`font-black font-mono ${T.accentText}`}>{inv.boatDetails.serialNumber || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>رقم التسلسل</div>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Longueur</div>
                        <div className={`font-black ${T.textMain}`}>{inv.boatDetails.length || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الطول</div>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Année de construction</div>
                        <div className={`font-black ${T.textMain}`}>{inv.boatDetails.year || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>سنة الصنع</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : isCommande ? (
              <div className="space-y-4">
                <div className={`${radiusBox} border ${T.borderMain} bg-white/95 p-4`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Bon de commande</div>
                    {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">معلومات الطلبية</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Modèle voulu</div>
                        <div className={`font-black ${T.textMain}`}>{inv.orderDetails?.modelWanted || inv.boatDetails?.model || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الموديل المطلوب</div>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Couleurs</div>
                        <div className={`font-bold ${T.textMain}`}>{inv.orderDetails?.colors || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الألوان</div>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} col-span-2 flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Options</div>
                        <div className={`font-bold ${T.textMain}`}>{inv.orderDetails?.options || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>خيارات إضافية</div>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} col-span-2 flex justify-between`}>
                      <div>
                        <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Accessoires divers</div>
                        <div className={`font-bold ${T.textMain}`}>{inv.orderDetails?.accessories || "—"}</div>
                      </div>
                      {isBilingual && (
                        <div className="text-right" dir="rtl">
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>لوازم مختلفة</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {ItemsTable}

                <div className={`${radiusBox} border ${T.borderMain} bg-white/95 p-4`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Règlement</div>
                    {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">التسوية المالية</div>}
                  </div>

                  {(() => {
                    const totalCmd = total;
                    const paid = Number(inv.orderDetails?.amountPaid || 0);
                    const rest = Math.max(totalCmd - paid, 0);

                    return (
                      <div className="grid grid-cols-3 gap-3 text-[11px]">
                        <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                          <div>
                            <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Total Commande</div>
                            <div className={`font-black ${T.accentText}`}>{formatCurrency(totalCmd)}</div>
                          </div>
                          {isBilingual && (
                            <div className="text-right" dir="rtl">
                              <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>المجموع</div>
                            </div>
                          )}
                        </div>
                        <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                          <div>
                            <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Total versé</div>
                            <div className={`font-black ${T.textMain}`}>{formatCurrency(paid)}</div>
                          </div>
                          {isBilingual && (
                            <div className="text-right" dir="rtl">
                              <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>المبلغ المدفوع</div>
                            </div>
                          )}
                        </div>
                        <div className={`p-3 ${radiusInner} ${T.boxBg} border ${T.borderSub} flex justify-between`}>
                          <div>
                            <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Restant</div>
                            <div className={`font-black ${T.textMain}`}>{formatCurrency(rest)}</div>
                          </div>
                          {isBilingual && (
                            <div className="text-right" dir="rtl">
                              <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الباقي</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {showBoatBlockOnInvoice && (
                  <div className={`${radiusBox} ${isApple ? "border border-[#e8e8ed] bg-[#f5f5f7]/70" : `border ${T.borderMain} bg-white/95`} p-4`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Détails Bateau</div>
                      {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">تفاصيل القارب</div>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-[11px]">
                      <div className={`p-3 ${radiusInner} ${isApple ? "bg-white" : T.boxBg} border ${T.borderSub} flex justify-between`}>
                        <div>
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Modèle</div>
                          <div className={`font-black ${T.textMain}`}>{inv.boatDetails.model || "—"}</div>
                        </div>
                        {isBilingual && (
                          <div className="text-right" dir="rtl">
                            <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الموديل</div>
                          </div>
                        )}
                      </div>
                      <div className={`p-3 ${radiusInner} ${isApple ? "bg-white" : T.boxBg} border ${T.borderSub} flex justify-between`}>
                        <div>
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>N° de série</div>
                          <div className={`font-black font-mono ${T.accentText}`}>{inv.boatDetails.serialNumber || "—"}</div>
                        </div>
                        {isBilingual && (
                          <div className="text-right" dir="rtl">
                            <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>رقم التسلسل</div>
                          </div>
                        )}
                      </div>
                      <div className={`p-3 ${radiusInner} ${isApple ? "bg-white" : T.boxBg} border ${T.borderSub} flex justify-between`}>
                        <div>
                          <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>Longueur</div>
                          <div className={`font-black ${T.textMain}`}>{inv.boatDetails.length || "—"}</div>
                        </div>
                        {isBilingual && (
                          <div className="text-right" dir="rtl">
                            <div className={`text-[8px] uppercase tracking-widest ${T.textLabel}`}>الطول</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {ItemsTable}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10">
          {showTotals && (
            <>
              <div className="flex justify-end mb-3">
                <div className={`w-full md:w-[70%] ${radiusBox} border ${T.borderMain} overflow-hidden flex`}>
                  <div className="w-full">
                    <div className={`px-4 py-2.5 ${T.tableHead} flex justify-between border-b ${T.borderMain}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest">Récapitulatif</div>
                      {isBilingual && <div className="text-[10px] font-black tracking-widest" dir="rtl">الملخص</div>}
                    </div>
                    <div className="p-4 bg-white/95 text-[11px] space-y-2">
                      <div className={`flex justify-between items-center font-bold ${T.textMain}`}>
                        <div className="flex-1">Sous-total HT</div>
                        <div className="flex-1 text-center font-black">{formatCurrency(subtotal)}</div>
                        {isBilingual && <div className="flex-1 text-right" dir="rtl">المجموع دون الرسوم</div>}
                      </div>

                      {inv.applyTva && (
                        <div className={`flex justify-between items-center font-bold ${T.textMain}`}>
                          <div className="flex-1">TVA</div>
                          <div className="flex-1 text-center font-black">{Number(inv.tvaRate || 0)}%</div>
                          {isBilingual && <div className="flex-1 text-right" dir="rtl">الرسم على القيمة المضافة</div>}
                        </div>
                      )}

                      <div className={`pt-2 border-t ${T.borderMain} flex justify-between items-center font-black text-[13px]`}>
                        <div className={`flex-1 ${T.textMain}`}>{inv.applyTva ? "TOTAL TTC" : "TOTAL"}</div>
                        <div className={`flex-1 text-center ${T.accentText}`}>{formatCurrency(total)}</div>
                        {isBilingual && <div className={`flex-1 text-right ${T.textMain}`} dir="rtl">{inv.applyTva ? "المجموع بكل الرسوم" : "المجموع"}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOTAL EN LETTRES BILINGUE FR + AR */}
              <div className={`mb-4 ${radiusBox} border ${T.borderMain} bg-white/95 p-3.5`}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className={`text-[9px] uppercase tracking-widest ${T.textLabel}`}>Total en lettres</div>
                  {isBilingual && <div className={`text-[10px] tracking-widest ${T.textLabel}`} dir="rtl">المبلغ بالحروف</div>}
                </div>
                <div className={`flex flex-col md:flex-row gap-4 items-start md:items-center justify-between text-[10px] font-bold ${T.textMain}`}>
                  <div>
                    {subType === "proforma"
                      ? "Arrêté le présent devis à la somme de :"
                      : "Arrêté la présente facture à la somme de :"}
                  </div>
                  {isBilingual && (
                    <div dir="rtl">
                      {subType === "proforma"
                        ? "حُدّد هذا الكشف بمبلغ :"
                        : "حُدّدت هذه الفاتورة بمبلغ :"}
                    </div>
                  )}
                </div>
                <div className={`mt-1.5 p-2 ${radiusInner} border ${T.borderSub} ${T.boxBg} space-y-1`}>
                  <div className={`text-[11px] font-black ${T.textMain} text-center`}>
                    {totalWords}
                  </div>
                  {isBilingual && (
                    <div className={`text-[12px] font-black ${T.textMain} text-center border-t ${T.borderSub} pt-1`} dir="rtl">
                      {totalWordsAr}
                    </div>
                  )}
                </div>

                {subType === "proforma" && (
                  <div className={`mt-2.5 flex justify-between text-[10px] font-bold ${T.textSub}`}>
                    <div>Devis valable <span className={`font-black ${T.textMain}`}>2 mois</span> à compter de la date d&apos;émission.</div>
                    {isBilingual && <div dir="rtl">هذا الكشف صالح لمدة <span className={`font-black ${T.textMain}`}>شهرين</span> من تاريخ الإصدار.</div>}
                  </div>
                )}
              </div>
            </>
          )}

          {showPayBlock && (
            <div className={`mb-4 ${radiusBox} border ${T.highlightBox} p-4 flex justify-between items-center`}>
              <div>
                <div className={`text-[9px] uppercase tracking-widest mb-1 ${T.textLabel}`}>Paiement</div>
                <div className={`text-[12px] font-black ${T.textMain}`}>
                  Mode : <span className={T.accentText}>{paymentLabel(inv.paymentMethod).fr}</span>
                </div>
                {inv.paymentMethod === "cheque" && inv.clientChequeNumber ? (
                  <div className={`text-[10px] font-bold mt-1 ${T.textSub}`}>
                    N° Chèque : <span className="font-mono">{inv.clientChequeNumber}</span>
                  </div>
                ) : (
                  <div className={`text-[10px] font-bold mt-1 ${T.textSub}`}>
                    {inv.paymentMethod === "cheque"
                      ? "N° Chèque : —"
                      : inv.paymentMethod === "virement"
                      ? "Paiement par virement bancaire"
                      : "Paiement en espèces"}
                  </div>
                )}
              </div>

              {isBilingual && (
                <div className="text-right" dir="rtl">
                  <div className={`text-[9px] uppercase tracking-widest mb-1 ${T.textLabel}`}>الدفع</div>
                  <div className={`text-[12px] font-black ${T.textMain}`}>
                    الطريقة : <span className={T.accentText}>{paymentLabel(inv.paymentMethod).ar}</span>
                  </div>
                  {inv.paymentMethod === "cheque" && inv.clientChequeNumber ? (
                    <div className={`text-[10px] font-bold mt-1 ${T.textSub}`}>
                      رقم الصك : <span className="font-mono" dir="ltr">{inv.clientChequeNumber}</span>
                    </div>
                  ) : (
                    <div className={`text-[10px] font-bold mt-1 ${T.textSub}`}>
                      {inv.paymentMethod === "cheque"
                        ? "رقم الصك : —"
                        : inv.paymentMethod === "virement"
                        ? "الدفع عن طريق تحويل بنكي"
                        : "الدفع نقداً"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className={`border border-dashed ${T.borderMain} ${radiusBox} h-24 p-3 text-[9px] ${T.textLabel} uppercase flex flex-col justify-between items-center relative`}>
              <div className="w-full flex justify-between px-2">
                <span>Cachet Gérant</span>
                {isBilingual && <span dir="rtl">ختم المسير</span>}
              </div>
              <span className="opacity-30">..............................</span>
            </div>
            <div className={`border border-dashed ${T.borderMain} ${radiusBox} h-24 p-3 text-[9px] ${T.textLabel} uppercase flex flex-col justify-between items-center relative`}>
              <div className="w-full flex justify-between px-2">
                <span>Signature Client</span>
                {isBilingual && <span dir="rtl">إمضاء الزبون</span>}
              </div>
              <span className="opacity-30">..............................</span>
            </div>
          </div>

          <div className={`border-t ${T.borderMain} pt-2 text-[9px] ${T.textSub} grid grid-cols-3 gap-2`}>
            <div>
              <b>BANQUE:</b> {companyConfig.bankName || "—"}
              <br />
              <b>RIB:</b> {companyConfig.bankRib || "—"}
            </div>
            <div>
              <b>RC:</b> {companyConfig.rc || "—"}
              <br />
              <b>NIF:</b> {companyConfig.nif || "—"}
              <br />
              <b>NIS:</b> {companyConfig.nis || "—"}
            </div>
            <div className={`text-right uppercase font-black ${T.textMain}`}>
              {companyConfig.name}
            </div>
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
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">
            Pneuboat
          </h1>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Dossier Complet",
                  icon: <FolderOpen className="text-white" />,
                  action: () => startNew("dossier"),
                  desc: "Facture + Attest + BL",
                  color: "bg-blue-600",
                },
                {
                  title: "Facture Client",
                  icon: <FileText />,
                  action: () => startNew("facture"),
                  desc: "Document de vente simple",
                },
                {
                  title: "Facture Proforma",
                  icon: <ClipboardList />,
                  action: () => startNew("proforma"),
                  desc: "Devis / Proforma (2 mois)",
                },
                {
                  title: "Bon de Commande",
                  icon: <ClipboardList />,
                  action: () => startNew("commande"),
                  desc: "Modèle + options + acompte",
                },
                {
                  title: "Bon de Livraison",
                  icon: <PackageCheck />,
                  action: () => startNew("livraison"),
                  desc: "Preuve de livraison",
                },
                {
                  title: "Attestation / Certif",
                  icon: <Anchor />,
                  action: () => startNew("attestation"),
                  desc: "Construction + garantie",
                },
                {
                  title: "Certificat Garantie",
                  icon: <CheckCircle />,
                  action: () => startNew("garantie"),
                  desc: "Garantie seule (1 an)",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  onClick={card.action}
                  className="p-6 rounded-3xl border-2 border-white shadow-sm bg-white cursor-pointer hover:border-blue-200 transition-all flex items-center gap-5 active:scale-95"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
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
                      Sélectionne un PDF pour l&apos;aperçu
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
            <div className="no-print bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-3 md:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
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
                  <Button
                    variant="secondary"
                    onClick={() => changeView("list")}
                    className="!py-2 !px-3 !rounded-xl"
                  >
                    <X size={16} /> Fermer
                  </Button>
                  <Button
                    onClick={saveInvoiceToCloud}
                    disabled={busy}
                    className="!py-2 !px-4 !rounded-xl"
                  >
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

              {/* BARRE DE PERSONNALISATION EN DIRECT (STYLE, COULEUR, FILIGRANE & DUPLICATA) */}
              <div className="mb-3 p-3 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5 mr-2">
                      <LayoutTemplate size={14} /> Modèle Facture :
                    </span>
                    {Object.values(DOC_LAYOUTS).map((ly) => {
                      const active = (currentInvoice.docLayout || companyConfig.docLayout || "classic") === ly.id;
                      return (
                        <button
                          key={ly.id}
                          type="button"
                          onClick={() => {
                            const nextTheme = ly.id === "apple" ? "apple" : currentInvoice.docTheme;
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              docLayout: ly.id,
                              docTheme: nextTheme,
                            }));
                            saveConfigOnline({
                              ...companyConfig,
                              docLayout: ly.id,
                              docTheme: nextTheme || companyConfig.docTheme,
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                            active
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {ly.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* BOUTONS RAPIDES : WATERMARK LOGO & DUPLICATA */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !currentInvoice.showLogoWatermark;
                        setCurrentInvoice((p) => ({
                          ...normalizeInvoice(p),
                          showLogoWatermark: nextVal,
                        }));
                        saveConfigOnline({
                          ...companyConfig,
                          showLogoWatermark: nextVal,
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                        currentInvoice.showLogoWatermark
                          ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <Stamp size={14} />
                      Filigrane Logo : {currentInvoice.showLogoWatermark ? "OUI" : "NON"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentInvoice((p) => ({
                          ...normalizeInvoice(p),
                          isDuplicate: !p.isDuplicate,
                        }))
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                        currentInvoice.isDuplicate
                          ? "bg-red-600 text-white border-red-400 shadow-md animate-pulse"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <Copy size={14} />
                      DUPLICATA : {currentInvoice.isDuplicate ? "ACTIVÉ" : "NON"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 mr-1">
                    <Palette size={14} /> Thème :
                  </span>
                  {Object.values(DOC_THEMES).map((th) => {
                    const active = (currentInvoice.docTheme || companyConfig.docTheme || "yacht") === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        title={th.label}
                        onClick={() => {
                          setCurrentInvoice((p) => ({ ...normalizeInvoice(p), docTheme: th.id }));
                          saveConfigOnline({ ...companyConfig, docTheme: th.id });
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border ${
                          active
                            ? "bg-white text-slate-900 border-white shadow-md scale-105"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: th.preview[0] }}
                        />
                        <span className="hidden sm:inline">{th.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIGNE 1 : Client & Bateau & Options */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className={`grid grid-cols-1 ${currentInvoice.isBilingual ? "md:grid-cols-2" : ""} gap-2 mb-2`}>
                    <InputGroup label="Nom Complet (FR)" compact>
                      <Input
                        value={currentInvoice.clientName || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentInvoice((p) => {
                            const inv = normalizeInvoice(p);
                            const prevAuto = transliterateFrToAr(inv.clientName || "");
                            const shouldAuto = !inv.clientNameAr || inv.clientNameAr === prevAuto;
                            return {
                              ...inv,
                              clientName: val,
                              clientNameAr: shouldAuto ? transliterateFrToAr(val) : inv.clientNameAr,
                            };
                          });
                        }}
                        placeholder="Ex: Mohamed Ali"
                      />
                    </InputGroup>
                    {currentInvoice.isBilingual && (
                      <InputGroup label="الاسم واللقب (AR - Auto)" compact>
                        <Input
                          dir="rtl"
                          value={currentInvoice.clientNameAr || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              clientNameAr: e.target.value,
                            }))
                          }
                          placeholder="الاسم الكامل"
                        />
                      </InputGroup>
                    )}
                  </div>

                  <div className={`grid grid-cols-1 ${currentInvoice.isBilingual ? "md:grid-cols-2" : ""} gap-2 mb-2`}>
                    <InputGroup label="Adresse (FR)" compact>
                      <Input
                        value={currentInvoice.clientAddress || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentInvoice((p) => {
                            const inv = normalizeInvoice(p);
                            const prevAuto = transliterateFrToAr(inv.clientAddress || "");
                            const shouldAuto = !inv.clientAddressAr || inv.clientAddressAr === prevAuto;
                            return {
                              ...inv,
                              clientAddress: val,
                              clientAddressAr: shouldAuto ? transliterateFrToAr(val) : inv.clientAddressAr,
                            };
                          });
                        }}
                        placeholder="Ex: Hai El Badr Oran"
                      />
                    </InputGroup>
                    {currentInvoice.isBilingual && (
                      <InputGroup label="العنوان (AR - Auto)" compact>
                        <Input
                          dir="rtl"
                          value={currentInvoice.clientAddressAr || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              clientAddressAr: e.target.value,
                            }))
                          }
                          placeholder="العنوان بالعربية"
                        />
                      </InputGroup>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <InputGroup label="Téléphone" compact>
                      <Input
                        value={currentInvoice.clientPhone || ""}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({
                            ...normalizeInvoice(p),
                            clientPhone: e.target.value,
                          }))
                        }
                        placeholder="0550..."
                      />
                    </InputGroup>
                    <InputGroup label="ID / Passport" compact>
                      <Input
                        value={currentInvoice.clientIdNumber || ""}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({
                            ...normalizeInvoice(p),
                            clientIdNumber: e.target.value,
                          }))
                        }
                        placeholder="Optionnel"
                      />
                    </InputGroup>
                    <InputGroup label="Date Document" compact>
                      <Input
                        type="date"
                        value={currentInvoice.date || ""}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({
                            ...normalizeInvoice(p),
                            date: e.target.value,
                          }))
                        }
                      />
                    </InputGroup>
                  </div>
                </div>

                <div className="md:col-span-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-blue-600 to-blue-800 p-3 text-white">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CheckCircle size={12} /> Bateau (Modèle)
                  </div>

                  <select
                    className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black outline-none mb-2"
                    value={
                      companyConfig.boatModels.find(
                        (m) => m.name === currentInvoice?.boatDetails?.model
                      )?.id || ""
                    }
                    onChange={(e) => selectModel(e.target.value)}
                  >
                    <option value="" className="text-slate-900">Choisir Modèle</option>
                    {companyConfig.boatModels.map((m) => (
                      <option key={m.id} value={m.id} className="text-slate-900">
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 gap-2 mb-2">
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      value={currentInvoice?.boatDetails?.serialNumber || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          return {
                            ...inv,
                            boatDetails: {
                              ...inv.boatDetails,
                              serialNumber: String(e.target.value || "").toUpperCase(),
                            },
                          };
                        })
                      }
                      placeholder="N° Série"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      value={currentInvoice?.boatDetails?.length || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          return {
                            ...inv,
                            boatDetails: { ...inv.boatDetails, length: e.target.value },
                          };
                        })
                      }
                      placeholder="Longueur"
                    />
                    <input
                      className="w-full px-3 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-sm font-black placeholder-white/60 outline-none"
                      value={currentInvoice?.boatDetails?.year || ""}
                      onChange={(e) =>
                        setCurrentInvoice((p) => {
                          const inv = normalizeInvoice(p);
                          return {
                            ...inv,
                            boatDetails: { ...inv.boatDetails, year: e.target.value },
                          };
                        })
                      }
                      placeholder="Année"
                    />
                  </div>
                </div>

                <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* BILINGUE + DUPLICATA + WATERMARK CHECKBOXES */}
                    <div className="rounded-2xl border border-slate-100 bg-blue-50/70 p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          Langue Bilingue (FR/AR)
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                          checked={!!currentInvoice.isBilingual}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              isBilingual: e.target.checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-blue-100 pt-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          Filigrane Logo (Fond)
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          checked={!!currentInvoice.showLogoWatermark}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              showLogoWatermark: e.target.checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-blue-100 pt-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                          Marquer comme DUPLICATA
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-red-600 cursor-pointer"
                          checked={!!currentInvoice.isDuplicate}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              isDuplicate: e.target.checked,
                            }))
                          }
                        />
                      </div>
                    </div>

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
                              setCurrentInvoice((p) => {
                                const inv = normalizeInvoice(p);
                                const nextApply = e.target.checked;
                                const items2 = recomputeItemsHtFromTtc(
                                  inv.items,
                                  inv.tvaRate,
                                  nextApply
                                );
                                return { ...inv, applyTva: nextApply, items: items2 };
                              })
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
                          setCurrentInvoice((p) => {
                            const inv = normalizeInvoice(p);
                            const nextRate = parseFloat(e.target.value) || 0;
                            const items2 = recomputeItemsHtFromTtc(
                              inv.items,
                              nextRate,
                              inv.applyTva
                            );
                            return { ...inv, tvaRate: nextRate, items: items2 };
                          })
                        }
                        placeholder="TVA %"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Paiement
                        </div>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <input
                            type="checkbox"
                            checked={!!currentInvoice.showPayment}
                            onChange={(e) =>
                              setCurrentInvoice((p) => ({
                                ...normalizeInvoice(p),
                                showPayment: e.target.checked,
                              }))
                            }
                          />
                          Afficher
                        </label>
                      </div>
                      <select
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                        value={currentInvoice.paymentMethod || "virement"}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({
                            ...normalizeInvoice(p),
                            paymentMethod: e.target.value,
                          }))
                        }
                      >
                        <option value="cheque">Chèque / صك</option>
                        <option value="virement">Virement bancaire / تحويل بنكي</option>
                        <option value="espece">Espèce / نقداً</option>
                      </select>
                      {currentInvoice.paymentMethod === "cheque" && (
                        <input
                          className="w-full mt-2 px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                          placeholder="N° de chèque (optionnel)"
                          value={currentInvoice.clientChequeNumber || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => ({
                              ...normalizeInvoice(p),
                              clientChequeNumber: e.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* LIGNE 2 : ARTICLES & ACCESSOIRES (100% LIBRE) */}
              <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="text-[12px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <ClipboardList size={16} className="text-blue-600" />
                    Lignes de facturation (Bateau, Accessoires, Options...)
                  </div>
                  <Button
                    variant="secondary"
                    className="!py-2 !px-4 !text-[11px] !rounded-xl !bg-slate-50"
                    onClick={() => {
                      setCurrentInvoice((p) => {
                        const inv = normalizeInvoice(p);
                        return {
                          ...inv,
                          items: [
                            ...inv.items,
                            { id: Date.now(), description: "", quantity: 1, price: 0, priceTtc: null },
                          ],
                        };
                      });
                    }}
                  >
                    <Plus size={14} /> Ajouter une ligne
                  </Button>
                </div>
                <div className="space-y-3">
                  {currentInvoice.items.map((it, idx) => (
                    <div key={it.id || idx} className="flex flex-col md:flex-row gap-2 items-center">
                      <div className="flex-1 w-full relative">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Désignation
                        </span>
                        <input
                          className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                          placeholder="Ex: Moteur 150CV, Remorque, Gilets..."
                          value={it.description || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCurrentInvoice((p) => {
                              const inv = normalizeInvoice(p);
                              const ni = [...inv.items];
                              ni[idx] = { ...ni[idx], description: val };
                              return { ...inv, items: ni };
                            });
                          }}
                        />
                      </div>
                      
                      <div className="w-full md:w-28 relative">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Qté
                        </span>
                        <input
                          type="number"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500 text-center"
                          value={it.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCurrentInvoice((p) => {
                              const inv = normalizeInvoice(p);
                              const ni = [...inv.items];
                              ni[idx] = { ...ni[idx], quantity: val };
                              return { ...inv, items: ni };
                            });
                          }}
                        />
                      </div>

                      <div className="w-full md:w-40 relative">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Prix Unit. TTC
                        </span>
                        <input
                          type="number"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500 text-right text-blue-700"
                          value={it.priceTtc !== null && it.priceTtc !== undefined ? it.priceTtc : priceTtcFromHt(it.price, currentInvoice.tvaRate, currentInvoice.applyTva)}
                          onChange={(e) => {
                            const ttc = parseFloat(e.target.value) || 0;
                            setCurrentInvoice((p) => {
                              const inv = normalizeInvoice(p);
                              const ni = [...inv.items];
                              const ht = priceHtFromTtc(ttc, inv.tvaRate, inv.applyTva);
                              ni[idx] = { ...ni[idx], priceTtc: ttc, price: ht };
                              return { ...inv, items: ni };
                            });
                          }}
                        />
                      </div>

                      <button
                        className="w-full md:w-12 h-11 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border-2 border-transparent hover:border-red-100"
                        onClick={() => {
                          setCurrentInvoice((p) => {
                            const inv = normalizeInvoice(p);
                            if (inv.items.length <= 1) return inv;
                            return { ...inv, items: inv.items.filter((_, i) => i !== idx) };
                          });
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* LIGNE 3 : Changer le nom de l'Attestation */}
              {(currentInvoice.type === "attestation" || currentInvoice.type === "dossier") && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 no-print">
                  <div className="md:col-span-12 rounded-2xl border border-slate-100 bg-white p-3">
                    <InputGroup label="Titre du document de construction" compact>
                      <select
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                        value={currentInvoice.attestationTitle || "ATTESTATION"}
                        onChange={(e) =>
                          setCurrentInvoice((p) => ({
                            ...normalizeInvoice(p),
                            attestationTitle: e.target.value,
                          }))
                        }
                      >
                        <option value="ATTESTATION">Attestation de construction / شهادة بناء</option>
                        <option value="CERTIFICAT">Certificat de construction / شهادة بناء</option>
                        <option value="ACTE">Acte de construction / عقد بناء</option>
                      </select>
                    </InputGroup>
                  </div>
                </div>
              )}

              {/* LIGNE 4 : Optionnel Bon de commande */}
              {currentInvoice.type === "commande" && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 no-print">
                  <div className="md:col-span-8 rounded-2xl border border-slate-100 bg-white p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <InputGroup label="Modèle voulu (si différent)" compact>
                        <Input
                          value={currentInvoice.orderDetails?.modelWanted || ""}
                          onChange={(e) =>
                            setCurrentInvoice((p) => {
                              const inv = normalizeInvoice(p);
                              return {
                                ...inv,
                                orderDetails: {
                                  ...inv.orderDetails,
                                  modelWanted: e.target.value,
                                },
                              };
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
                              return {
                                ...inv,
                                orderDetails: { ...inv.orderDetails, colors: e.target.value },
                              };
                            })
                          }
                          placeholder="Ex: Bleu / Blanc"
                        />
                      </InputGroup>

                      <div className="md:col-span-2">
                        <InputGroup label="Options (Couleur Gelcoat etc)" compact>
                          <Input
                            value={currentInvoice.orderDetails?.options || ""}
                            onChange={(e) =>
                              setCurrentInvoice((p) => {
                                const inv = normalizeInvoice(p);
                                return {
                                  ...inv,
                                  orderDetails: { ...inv.orderDetails, options: e.target.value },
                                };
                              })
                            }
                            placeholder="Ex: Console, banquette..."
                          />
                        </InputGroup>
                      </div>

                      <div className="md:col-span-2">
                        <InputGroup label="Notes Accessoires" compact>
                          <Input
                            value={currentInvoice.orderDetails?.accessories || ""}
                            onChange={(e) =>
                              setCurrentInvoice((p) => {
                                const inv = normalizeInvoice(p);
                                return {
                                  ...inv,
                                  orderDetails: {
                                    ...inv.orderDetails,
                                    accessories: e.target.value,
                                  },
                                };
                              })
                            }
                            placeholder="Infos additionnelles"
                          />
                        </InputGroup>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 flex flex-col justify-center">
                    <InputGroup label="Acompte / Total versé (DA)" compact>
                      <Input
                        type="number"
                        className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-lg font-black outline-none focus:border-blue-500 text-blue-700"
                        value={Number(currentInvoice.orderDetails?.amountPaid || 0)}
                        onChange={(e) =>
                          setCurrentInvoice((p) => {
                            const inv = normalizeInvoice(p);
                            return {
                              ...inv,
                              orderDetails: {
                                ...inv.orderDetails,
                                amountPaid: parseFloat(e.target.value) || 0,
                              },
                            };
                          })
                        }
                      />
                    </InputGroup>
                    <div className="mt-2 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">
                      Total = lignes ci-dessus<br/>Restant = Total - Versé
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-200 rounded-[2rem] p-2 md:p-4 overflow-auto h-[82vh] md:h-[calc(100vh-18rem)] shadow-inner border-4 border-white">
              <div className="min-w-[980px] flex justify-center">
                <div
                  id="printable-area"
                  className="origin-top"
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: "top center",
                  }}
                >
                  {currentInvoice.type === "dossier" ? (
                    <div>
                      <div className="page-break">
                        <RenderDoc subType="facture" docNumber={currentInvoice.invoiceNumber} />
                      </div>
                      <div className="page-break">
                        <RenderDoc
                          subType="attestation"
                          docNumber={currentInvoice.attestationNumber}
                        />
                      </div>
                      <div className="page-break-last">
                        <RenderDoc
                          subType="livraison"
                          docNumber={currentInvoice.deliveryNumber}
                        />
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
                    <tr
                      key={inv.db_id || inv.number}
                      className="hover:bg-blue-50/50 transition-all group"
                    >
                      <td className="p-5 md:p-7">
                        <div className="font-black text-slate-800 uppercase tracking-tight">
                          {inv.client_name || inv.clientName || "—"}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                          {inv.doc_number || inv.number} •{" "}
                          {inv.created_at
                            ? new Date(inv.created_at).toLocaleDateString("fr-FR")
                            : ""}
                        </div>
                      </td>
                      <td className="p-5 md:p-7 text-right font-black text-blue-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="p-5 md:p-7 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          title="Ouvrir en mode Duplicata"
                          onClick={() => {
                            const inv2 = normalizeInvoice({ ...inv, isDuplicate: true });
                            setCurrentInvoice(inv2);
                            changeView("edit");
                          }}
                          className="!px-3 !py-2.5 border-2 !text-xs text-red-600 border-red-100 hover:bg-red-50"
                        >
                          <Copy size={14} /> Duplicata
                        </Button>
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
                      <td
                        colSpan={3}
                        className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.2em]"
                      >
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
                Ajoute des PDFs/images (FICHE/JAUGE/PLAN/APPROBATION) puis imprime
                “Dossier”
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyConfig.boatModels.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-[2rem] p-6 border-2 border-white shadow-sm space-y-5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">
                        {m.name}
                      </h3>
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em]">
                        {m.type}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {m.approvalNumber}
                      </p>
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
          <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom duration-400">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black mb-10 flex items-center gap-4 uppercase tracking-tight">
                <Settings className="text-blue-600" size={28} /> Configuration
              </h2>

              {/* OPTION FILIGRANE LOGO PAR DÉFAUT */}
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <Stamp className="text-blue-600" size={18} /> Filigrane Logo par défaut (Watermark)
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">
                    Afficher votre logo en grand en arrière-plan sur tous les nouveaux documents
                  </p>
                </div>
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-6 h-6 accent-blue-600 rounded-lg cursor-pointer"
                    checked={!!companyConfig.showLogoWatermark}
                    onChange={(e) =>
                      saveConfigOnline({
                        ...companyConfig,
                        showLogoWatermark: e.target.checked,
                      })
                    }
                  />
                  <span className="text-xs font-black uppercase text-slate-800">
                    {companyConfig.showLogoWatermark ? "Activé" : "Désactivé"}
                  </span>
                </label>
              </div>

              {/* SÉLECTEUR DE MODÈLE DE MISE EN PAGE */}
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4">
                  <LayoutTemplate className="text-blue-600" size={18} /> Modèle de Mise en Page (Design des Factures)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(DOC_LAYOUTS).map((ly) => {
                    const active = (companyConfig.docLayout || "classic") === ly.id;
                    return (
                      <div
                        key={ly.id}
                        onClick={() =>
                          saveConfigOnline({
                            ...companyConfig,
                            docLayout: ly.id,
                            docTheme: ly.id === "apple" ? "apple" : companyConfig.docTheme,
                          })
                        }
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          active
                            ? "border-blue-600 bg-white shadow-md"
                            : "border-slate-200 bg-white/60 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-xs uppercase text-slate-900">
                            {ly.label}
                          </span>
                          {active && <CheckCircle size={16} className="text-blue-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 leading-snug">
                          {ly.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SÉLECTEUR DE COULEUR DES FACTURES */}
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 mb-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4">
                  <Palette className="text-blue-600" size={18} /> Palette de Couleurs (Factures / Impression)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.values(DOC_THEMES).map((th) => {
                    const active = (companyConfig.docTheme || "yacht") === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() =>
                          saveConfigOnline({ ...companyConfig, docTheme: th.id })
                        }
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          active
                            ? "border-blue-600 bg-white shadow-md"
                            : "border-slate-200 bg-white/60 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {th.preview.map((col, idx) => (
                              <span
                                key={idx}
                                className="w-3.5 h-3.5 rounded-full border border-black/15"
                                style={{ backgroundColor: col }}
                              />
                            ))}
                          </div>
                          {active && <CheckCircle size={16} className="text-blue-600 shrink-0" />}
                        </div>
                        <div className="font-black text-xs uppercase text-slate-900 mb-1">
                          {th.label}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 leading-snug">
                          {th.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                <InputGroup label="Société (FR)">
                  <Input
                    value={companyConfig.name}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, name: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="الشركة (Société AR)">
                  <Input
                    dir="rtl"
                    value={companyConfig.nameAr || ""}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, nameAr: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="Gérant (FR)">
                  <Input
                    value={companyConfig.managerName}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, managerName: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="المسير (Gérant AR)">
                  <Input
                    dir="rtl"
                    value={companyConfig.managerNameAr || ""}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, managerNameAr: e.target.value })}
                  />
                </InputGroup>

                <div className="md:col-span-2">
                  <InputGroup label="Adresse">
                    <Input
                      value={companyConfig.address}
                      onChange={(e) => saveConfigOnline({ ...companyConfig, address: e.target.value })}
                    />
                  </InputGroup>
                </div>

                <InputGroup label="Email">
                  <Input
                    value={companyConfig.email}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, email: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="Téléphone">
                  <Input
                    value={companyConfig.phone}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, phone: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="RC">
                  <Input
                    value={companyConfig.rc}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, rc: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="NIF">
                  <Input
                    value={companyConfig.nif}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, nif: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="NIS">
                  <Input
                    value={companyConfig.nis}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, nis: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="Banque">
                  <Input
                    value={companyConfig.bankName}
                    onChange={(e) => saveConfigOnline({ ...companyConfig, bankName: e.target.value })}
                  />
                </InputGroup>

                <div className="md:col-span-2">
                  <InputGroup label="RIB">
                    <Input
                      value={companyConfig.bankRib}
                      onChange={(e) => saveConfigOnline({ ...companyConfig, bankRib: e.target.value })}
                    />
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
              <Button
                variant="secondary"
                onClick={() => changeView("database")}
                className="!px-6 rounded-2xl uppercase text-[10px] tracking-widest"
              >
                <X size={16} /> Fermer
              </Button>

              <Button
                onClick={() => setTimeout(() => window.print(), 100)}
                className="!px-8 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200"
              >
                <Printer size={16} /> Tout Imprimer
              </Button>
            </div>

            <div className="space-y-10 print-area">
              {["fiche", "jauge", "plan", "approbation"].map((doc) => {
                const fileData = modelDocs?.[printModelId]?.[doc];
                if (!fileData) return null;
                const pdf = isPdfLike(fileData);

                return (
                  <div
                    key={doc}
                    className="page-break-last flex flex-col items-center justify-center min-h-[90vh]"
                  >
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
