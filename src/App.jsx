import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const BRAND = "Pneuboat";

export default function App() {
  // AUTH
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [toast, setToast] = useState("");

  // SETTINGS
  const [settings, setSettings] = useState({
    companyName: "Pneuboat",
    manager: "Sekkal Gherbi Youcef",
    tvaRate: 0, // tu gardes la main
    currency: "DZD"
  });

  // INVOICE FORM
  const [invoice, setInvoice] = useState({
    number: "", // tu as dit: laisse le oui
    date: new Date().toISOString().slice(0, 10),
    clientName: "",
    clientAddress: "",
    items: [
      { desc: "Pneu", qty: 1, price: 0 }
    ],
    note: ""
  });

  // HISTORY
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  // --- session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- totals
  const subtotal = useMemo(() => {
    return invoice.items.reduce((sum, it) => sum + (n(it.qty) * n(it.price)), 0);
  }, [invoice.items]);

  const tvaAmount = useMemo(() => subtotal * (n(settings.tvaRate) / 100), [subtotal, settings.tvaRate]);
  const total = useMemo(() => subtotal + tvaAmount, [subtotal, tvaAmount]);

  // --- helpers
  function n(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
  }

  function money(v) {
    return `${n(v).toFixed(2)} ${settings.currency}`;
  }

  function setItem(i, key, value) {
    setInvoice(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [key]: value };
      return { ...prev, items };
    });
  }

  function addLine() {
    setInvoice(prev => ({ ...prev, items: [...prev.items, { desc: "", qty: 1, price: 0 }] }));
  }

  function removeLine(i) {
    setInvoice(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));
  }

  async function signIn() {
    setToast("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    if (error) setToast(error.message);
  }

  async function signUp() {
    setToast("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPass });
    if (error) setToast(error.message);
    else setToast("Compte créé. (Si Supabase demande email, vérifie ta boîte.)");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function loadHistory() {
    if (!session?.user) return;
    setBusy(true);
    setToast("");
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setBusy(false);
    if (error) setToast(error.message);
    else setHistory(data || []);
  }

  useEffect(() => {
    if (session?.user) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function saveInvoice() {
    if (!session?.user) return;
    setToast("");

    if (!invoice.number.trim()) return setToast("Numéro facture obligatoire.");
    if (!invoice.clientName.trim()) return setToast("Nom client obligatoire.");
    if (!invoice.items.length) return setToast("Ajoute au moins une ligne.");

    setBusy(true);

    const payload = {
      user_id: session.user.id,
      number: invoice.number.trim(),
      date: invoice.date,
      client_name: invoice.clientName.trim(),
      client_address: invoice.clientAddress || "",
      tva_rate: n(settings.tvaRate),
      subtotal,
      tva_amount: tvaAmount,
      total
    };

    const { data: inserted, error: invErr } = await supabase
      .from("invoices")
      .insert(payload)
      .select("id")
      .single();

    if (invErr) {
      setBusy(false);
      return setToast(invErr.message);
    }

    const itemsPayload = invoice.items.map(it => ({
      invoice_id: inserted.id,
      description: it.desc || "",
      qty: n(it.qty),
      price: n(it.price),
      line_total: n(it.qty) * n(it.price)
    }));

    const { error: itemsErr } = await supabase.from("invoice_items").insert(itemsPayload);

    setBusy(false);
    if (itemsErr) setToast(itemsErr.message);
    else {
      setToast("✅ Facture sauvegardée !");
      await loadHistory();
    }
  }

  async function deleteInvoice(id) {
    setBusy(true);
    setToast("");
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    setBusy(false);
    if (error) setToast(error.message);
    else {
      setToast("Facture supprimée.");
      await loadHistory();
    }
  }

  function resetForm() {
    setInvoice({
      number: "",
      date: new Date().toISOString().slice(0, 10),
      clientName: "",
      clientAddress: "",
      items: [{ desc: "Pneu", qty: 1, price: 0 }],
      note: ""
    });
    setToast("");
  }

  // ---------- UI ----------
  if (!session) {
    return (
      <Page>
        <Header title={`${BRAND} — Connexion`} subtitle="Accès admin pour la facturation (gratuit)"/>
        <Card>
          <Label>Email</Label>
          <Input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email@exemple.com" />
          <Label>Mot de passe</Label>
          <Input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} />

          <Row gap={10} style={{ marginTop: 12 }}>
            <Btn onClick={signIn}>Se connecter</Btn>
            <Btn variant="soft" onClick={signUp}>Créer compte</Btn>
          </Row>

          {toast && <Note danger>{toast}</Note>}
          <Note>
            Astuce: crée un compte une fois, puis connecte-toi. Tes factures seront privées.
          </Note>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <TopBar
        left={
          <div>
            <h1 style={{ margin: 0 }}>{BRAND} — Facturation</h1>
            <div style={{ color: "#666" }}>Connecté : {session.user.email}</div>
          </div>
        }
        right={<Btn variant="soft" onClick={signOut}>Déconnexion</Btn>}
      />

      {toast && <Note danger={!toast.startsWith("✅")}>{toast}</Note>}

      <Grid2>
        <Card>
          <h3 style={{ marginTop: 0 }}>Paramètres</h3>
          <Label>Entreprise</Label>
          <Input value={settings.companyName} onChange={e => setSettings({ ...settings, companyName: e.target.value })} />
          <Label>Gérant</Label>
          <Input value={settings.manager} onChange={e => setSettings({ ...settings, manager: e.target.value })} />
          <Label>TVA (%)</Label>
          <Input type="number" value={settings.tvaRate} onChange={e => setSettings({ ...settings, tvaRate: e.target.value })} />
          <Label>Devise</Label>
          <Input value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} />
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Nouvelle facture</h3>
          <Row gap={10}>
            <div style={{ flex: 1 }}>
              <Label>Numéro</Label>
              <Input value={invoice.number} onChange={e => setInvoice({ ...invoice, number: e.target.value })} placeholder="Ex: 2026-0001" />
            </div>
            <div style={{ width: 180 }}>
              <Label>Date</Label>
              <Input type="date" value={invoice.date} onChange={e => setInvoice({ ...invoice, date: e.target.value })} />
            </div>
          </Row>

          <Label>Client</Label>
          <Input value={invoice.clientName} onChange={e => setInvoice({ ...invoice, clientName: e.target.value })} placeholder="Nom client" />
          <Label>Adresse client</Label>
          <Input value={invoice.clientAddress} onChange={e => setInvoice({ ...invoice, clientAddress: e.target.value })} placeholder="Adresse" />
        </Card>
      </Grid2>

      <Card style={{ marginTop: 16 }}>
        <Row style={{ alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Lignes</h3>
          <div style={{ flex: 1 }} />
          <Btn onClick={addLine}>+ Ajouter</Btn>
        </Row>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Désignation</Th>
                <Th style={{ width: 90 }}>Qté</Th>
                <Th style={{ width: 140 }}>Prix</Th>
                <Th style={{ width: 160, textAlign: "right" }}>Total</Th>
                <Th style={{ width: 80 }}></Th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i}>
                  <Td><Input value={it.desc} onChange={e => setItem(i, "desc", e.target.value)} /></Td>
                  <Td><Input type="number" value={it.qty} onChange={e => setItem(i, "qty", e.target.value)} /></Td>
                  <Td><Input type="number" value={it.price} onChange={e => setItem(i, "price", e.target.value)} /></Td>
                  <Td style={{ textAlign: "right" }}>{money(n(it.qty) * n(it.price))}</Td>
                  <Td style={{ textAlign: "center" }}>
                    <Btn variant="danger" onClick={() => removeLine(i)}>X</Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Row style={{ marginTop: 14, gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={saveInvoice} disabled={busy}>💾 Sauvegarder</Btn>
          <Btn variant="soft" onClick={() => window.print()}>🖨️ Imprimer</Btn>
          <Btn variant="soft" onClick={resetForm}>↺ Nouveau</Btn>
          <div style={{ flex: 1 }} />

          <div style={totalsBox}>
            <Line label="Sous-total" value={money(subtotal)} />
            <Line label={`TVA (${n(settings.tvaRate)}%)`} value={money(tvaAmount)} />
            <hr style={{ border: "none", borderTop: "1px solid #eee" }} />
            <Line label="TOTAL" value={money(total)} strong />
          </div>
        </Row>

        <Label style={{ marginTop: 12 }}>Note</Label>
        <Input value={invoice.note} onChange={e => setInvoice({ ...invoice, note: e.target.value })} placeholder="Remarque..." />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Row style={{ alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Historique (Base de données)</h3>
          <div style={{ flex: 1 }} />
          <Btn variant="soft" onClick={loadHistory} disabled={busy}>↻ Rafraîchir</Btn>
        </Row>

        {busy && <Note>Chargement…</Note>}

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Numéro</Th>
                <Th>Client</Th>
                <Th style={{ width: 160, textAlign: "right" }}>Total</Th>
                <Th style={{ width: 100 }}></Th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <Td>{h.date}</Td>
                  <Td>{h.number}</Td>
                  <Td>{h.client_name}</Td>
                  <Td style={{ textAlign: "right" }}>{money(h.total)}</Td>
                  <Td style={{ textAlign: "center" }}>
                    <Btn variant="danger" onClick={() => deleteInvoice(h.id)}>Suppr</Btn>
                  </Td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <Td colSpan={5} style={{ color: "#666" }}>Aucune facture enregistrée.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <style>{`
        @media print {
          button { display:none !important; }
          input { border: none !important; }
        }
      `}</style>
    </Page>
  );
}

/* ---------- small UI components ---------- */
function Page({ children }) {
  return <div style={{ fontFamily: "system-ui, Arial", maxWidth: 1100, margin: "0 auto", padding: 16 }}>{children}</div>;
}
function Header({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      <div style={{ color: "#666" }}>{subtitle}</div>
    </div>
  );
}
function TopBar({ left, right }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>{left}{right}</div>;
}
function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff", ...style }}>{children}</div>;
}
function Row({ children, style, gap = 12 }) {
  return <div style={{ display: "flex", gap, ...style }}>{children}</div>;
}
function Label({ children, style }) {
  return <div style={{ fontSize: 12, color: "#555", marginTop: 10, marginBottom: 6, ...style }}>{children}</div>;
}
function Input(props) {
  return <input {...props} style={{ width: "100%", padding: "10px 10px", borderRadius: 10, border: "1px solid #ddd" }} />;
}
function Btn({ children, onClick, disabled, variant = "base" }) {
  const styles = {
    base: { border: "1px solid #ddd", background: "#fff" },
    soft: { border: "1px solid #ddd", background: "#f7f7f7" },
    danger: { border: "1px solid #f2c2c2", background: "#fff" }
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        cursor: "pointer",
        opacity: disabled ? 0.6 : 1,
        ...styles[variant]
      }}
    >
      {children}
    </button>
  );
}
function Note({ children, danger = false }) {
  return <p style={{ marginTop: 12, color: danger ? "#b00020" : "#666" }}>{children}</p>;
}
function Th({ children, style }) {
  return <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8, ...style }}>{children}</th>;
}
function Td({ children, style, colSpan }) {
  return <td colSpan={colSpan} style={{ borderBottom: "1px solid #f3f3f3", padding: 8, ...style }}>{children}</td>;
}
function Line({ label, value, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: strong ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
const totalsBox = { border: "1px solid #eee", borderRadius: 12, padding: 12, minWidth: 260 }; 
