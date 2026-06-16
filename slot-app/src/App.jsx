import { useState } from "react";

const DEFAULT_NAMES = ["1人目", "2人目", "3人目"];
const INITIAL_MEMBERS = () =>
  DEFAULT_NAMES.map((name, i) => ({ id: i + 1, name, invest: "", recover: "" }));

export default function SlotEqualizer() {
  const [members, setMembers] = useState(INITIAL_MEMBERS());
  const [unit, setUnit] = useState(100); // 100 or 1000

  const update = (id, field, val) => {
    const clean = val.replace(/[^0-9]/g, "");
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: clean } : m)));
  };
  const updateName = (id, val) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name: val } : m)));
  const addMember = () => {
    const nextId = Date.now();
    setMembers((prev) => [...prev, { id: nextId, name: `${prev.length + 1}人目`, invest: "", recover: "" }]);
  };
  const removeMember = (id) => {
    if (members.length <= 2) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };
  const reset = () => setMembers(INITIAL_MEMBERS());

  const memberCalc = members.map((m) => ({
    ...m,
    inv: Number(m.invest) || 0,
    rec: Number(m.recover) || 0,
    pnl: (Number(m.recover) || 0) - (Number(m.invest) || 0),
    isActive: m.invest !== "" || m.recover !== "", // どちらかに入力があれば計算対象
  }));

  const activeMembers = memberCalc.filter((m) => m.isActive);
  const totalPnl = activeMembers.reduce((s, m) => s + m.pnl, 0);
  const n = activeMembers.length;

  // 単位で切り捨て
  const floorTo = (val, u) => Math.floor(val / u) * u;
  const perPersonExact = n > 0 ? totalPnl / n : 0;
  const perPerson = n > 0 ? floorTo(perPersonExact, unit) : 0;
  const remainder = n > 0 ? totalPnl - perPerson * n : 0;

  const balanced = activeMembers.map((m) => ({
    ...m,
    balance: m.pnl - perPerson, // 正=払う側、負=受け取る側
  }));

  const computeSettlements = () => {
    const payers = balanced.filter((m) => m.balance > 0).map((m) => ({ name: m.name, b: floorTo(m.balance, unit) })).filter(m => m.b > 0).sort((a, b) => b.b - a.b);
    const receivers = balanced.filter((m) => m.balance < 0).map((m) => ({ name: m.name, b: floorTo(-m.balance, unit) })).filter(m => m.b > 0).sort((a, b) => b.b - a.b);
    const txs = [];
    let pi = 0, ri = 0;
    while (pi < payers.length && ri < receivers.length) {
      const amount = Math.min(payers[pi].b, receivers[ri].b);
      if (amount > 0) txs.push({ from: payers[pi].name, to: receivers[ri].name, amount });
      payers[pi].b -= amount;
      receivers[ri].b -= amount;
      if (payers[pi].b < 1) pi++;
      if (receivers[ri].b < 1) ri++;
    }
    return txs;
  };

  const settlements = computeSettlements();
  const hasData = n > 0;

  const fmt = (n) => Math.abs(Math.round(n)).toLocaleString("ja-JP");
  const sign = (n) => (n >= 0 ? "+" : "−");
  const col = (n) => (n > 0 ? "#00e5a0" : n < 0 ? "#ff4d6d" : "#888");

  return (
    <div style={s.root}>
      <div style={s.grain} />

      <header style={s.header}>
        <div style={s.logo}>🎰</div>
        <div>
          <div style={s.title}>乗り打ち精算</div>
          <div style={s.sub}>GROUP SLOT EQUALIZER</div>
        </div>
      </header>

      {/* 精算単位設定 */}
      <div style={{ ...s.section, marginTop: 16 }}>
        <div style={s.modeCard}>
          <div style={s.modeLabel}>精算単位の設定</div>
          <label style={s.modeRow} onClick={() => setUnit(100)}>
            <div style={{ ...s.checkbox, ...(unit === 100 ? s.checkboxOn : s.checkboxOff) }}>
              {unit === 100 && <span style={s.checkmark}>✓</span>}
            </div>
            <div>
              <div style={{ ...s.modeTitle, color: unit === 100 ? "#f0f0f0" : "#888" }}>100円単位で精算</div>
              <div style={s.modeDesc}>100円未満はあまりとして表示</div>
            </div>
          </label>
          <label style={s.modeRow} onClick={() => setUnit(1000)}>
            <div style={{ ...s.checkbox, ...(unit === 1000 ? s.checkboxOn : s.checkboxOff) }}>
              {unit === 1000 && <span style={s.checkmark}>✓</span>}
            </div>
            <div>
              <div style={{ ...s.modeTitle, color: unit === 1000 ? "#f0f0f0" : "#888" }}>1,000円単位で精算</div>
              <div style={s.modeDesc}>1,000円未満はあまりとして表示</div>
            </div>
          </label>
        </div>
      </div>

      {/* サマリー */}
      <div style={s.summaryCard}>
        <div style={s.summaryRow}>
          <Cell label="グループ合計" value={`${sign(totalPnl)}${fmt(totalPnl)}円`} color={col(totalPnl)} />
          <div style={s.divider} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: "#555", marginBottom: 6, lineHeight: 1.4 }}>一人あたり収支<br/>（{unit.toLocaleString()}円単位）</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: col(perPerson), letterSpacing: 1 }}>{sign(perPerson)}{fmt(perPerson)}円</div>
            {hasData && remainder !== 0 && (
              <div style={s.remainderBadge}>あまり {fmt(remainder)}円</div>
            )}
          </div>
        </div>
        {hasData && (
          <div style={s.summaryNote}>
            精算後、全員の収支が <span style={{ color: col(perPerson), fontWeight: 700 }}>{sign(perPerson)}{fmt(perPerson)}円</span> になります
            {remainder !== 0 && <><br/><span style={{ color: "#ff8c42" }}>あまり {fmt(remainder)}円 は別途調整してください</span></>}
          </div>
        )}
      </div>

      {/* メンバー入力 */}
      <div style={s.section}>
        <SectionHead title="メンバー入力" badge={`${n}/${members.length}人`} />
        {members.map((m) => {
          const calc = memberCalc.find((c) => c.id === m.id);
          const bal = balanced.find((b) => b.id === m.id);
          const balAmt = bal ? floorTo(Math.abs(bal.balance), unit) : 0;
          const isActive = calc.isActive;
          return (
            <div key={m.id} style={{ ...s.card, ...(isActive ? {} : s.cardInactive) }}>
              <div style={s.cardHead}>
                <input style={s.nameInput} value={m.name} onChange={(e) => updateName(m.id, e.target.value)} maxLength={10} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!isActive && <span style={s.excludedBadge}>未参加</span>}
                  {members.length > 2 && <button style={s.delBtn} onClick={() => removeMember(m.id)}>✕</button>}
                </div>
              </div>
              <div style={s.inputRow}>
                <AmountField label="投資額" value={m.invest} onChange={(v) => update(m.id, "invest", v)} />
                <div style={s.arrow}>→</div>
                <AmountField label="回収額" value={m.recover} onChange={(v) => update(m.id, "recover", v)} />
              </div>
              {isActive && (
                <div style={s.resultFlow}>
                  <FlowStep label="自分の収支" value={`${sign(calc.pnl)}${fmt(calc.pnl)}円`} color={col(calc.pnl)} />
                  <div style={s.flowArrow}>↓</div>
                  {bal && balAmt >= 1 && (
                    <FlowStep
                      label={bal.balance > 0 ? `${fmt(balAmt)}円 支払う` : `${fmt(balAmt)}円 受け取る`}
                      value={null}
                      color={col(-bal.balance)}
                      isAction
                    />
                  )}
                  {(!bal || balAmt < 1) && <FlowStep label="精算不要" value={null} color="#888" isAction />}
                  <div style={s.flowArrow}>↓</div>
                  <FlowStep label="最終収支" value={`${sign(perPerson)}${fmt(perPerson)}円`} color={col(perPerson)} final />
                </div>
              )}
            </div>
          );
        })}
        <button style={s.addBtn} onClick={addMember}>＋ メンバーを追加</button>
      </div>

      {/* 精算方法 */}
      {hasData && settlements.length > 0 && (
        <div style={s.section}>
          <SectionHead title="精算方法" badge={`${settlements.length}件`} />
          <div style={s.settlementCard}>
            {settlements.map((tx, i) => (
              <div key={i} style={{ ...s.txRow, borderBottom: i < settlements.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={s.txPerson}>
                  <div style={s.txBadgePay}>払う</div>
                  <div style={s.txName}>{tx.from}</div>
                </div>
                <div style={s.txMid}>
                  <div style={s.txAmt}>{tx.amount.toLocaleString("ja-JP")}円</div>
                  <div style={s.txLine}><span style={s.txArrow}>▶</span></div>
                </div>
                <div style={{ ...s.txPerson, alignItems: "flex-end" }}>
                  <div style={s.txBadgeRecv}>受け取る</div>
                  <div style={s.txName}>{tx.to}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={s.settlementHint}>※この通りに支払うと、全員の最終収支が均等になります</div>
        </div>
      )}

      {/* あまり表示 */}
      {hasData && remainder !== 0 && (
        <div style={{ ...s.section }}>
          <div style={s.amariBox}>
            <div style={{ fontSize: 20 }}>⚠️</div>
            <div>
              <div style={s.amariTitle}>あまり：{fmt(remainder)}円</div>
              <div style={s.amariDesc}>割り切れなかった端数です。別途調整してください。</div>
            </div>
          </div>
        </div>
      )}

      {hasData && settlements.length === 0 && remainder === 0 && (
        <div style={s.evenBanner}>🎉 全員の収支が均等です！精算不要</div>
      )}

      <button style={s.resetBtn} onClick={reset}>リセット</button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d12; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

function Cell({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: "#555", marginBottom: 6, lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: color || "#fff", letterSpacing: 1 }}>{value}</div>
    </div>
  );
}

function SectionHead({ title, badge }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 11, letterSpacing: 2, color: "#555", textTransform: "uppercase" }}>{title}</span>
      <span style={{ fontSize: 11, color: "#444", background: "#1e1e2a", padding: "2px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>{badge}</span>
    </div>
  );
}

function AmountField({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#555", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", background: "#0d0d12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, paddingRight: 8 }}>
        <input type="number" inputMode="numeric" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f0f0f0", fontSize: 18, fontWeight: 700, padding: "10px 10px", fontFamily: "'Noto Sans JP',sans-serif", width: "100%" }} />
        <span style={{ fontSize: 11, color: "#555" }}>円</span>
      </div>
    </div>
  );
}

function FlowStep({ label, value, color, final }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      padding: final ? "8px 16px" : "6px 14px",
      background: final ? "rgba(255,255,255,0.04)" : "transparent",
      borderRadius: 10, border: final ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
      <span style={{ fontSize: 10, color: "#666", letterSpacing: 1 }}>{label}</span>
      {value && <span style={{ fontSize: final ? 18 : 14, fontWeight: 700, color }}>{value}</span>}
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#0d0d12", fontFamily: "'Noto Sans JP',sans-serif", color: "#f0f0f0", paddingBottom: 48, position: "relative", maxWidth: 480, margin: "0 auto" },
  grain: { position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03, background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", zIndex: 0 },
  header: { padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 },
  logo: { fontSize: 32 },
  title: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, color: "#fff" },
  sub: { fontSize: 10, letterSpacing: 4, color: "#444", marginTop: 2 },
  section: { padding: "0 16px", marginBottom: 16, position: "relative", zIndex: 1 },
  modeCard: { background: "#141420", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 },
  modeLabel: { fontSize: 10, letterSpacing: 2, color: "#555", marginBottom: 12 },
  modeRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" },
  checkbox: { width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  checkboxOn: { background: "#00e5a0" },
  checkboxOff: { border: "1px solid rgba(255,255,255,0.2)", background: "transparent" },
  checkmark: { color: "#0d0d12", fontSize: 13, fontWeight: 700 },
  modeTitle: { fontSize: 13, fontWeight: 700 },
  modeDesc: { fontSize: 10, color: "#555" },
  summaryCard: { margin: "0 16px 16px", background: "linear-gradient(135deg,#1a1a2e,#16213e)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px 20px", position: "relative", zIndex: 1, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  summaryRow: { display: "flex", alignItems: "center" },
  summaryNote: { marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", fontSize: 12, color: "#888", lineHeight: 1.7 },
  remainderBadge: { marginTop: 6, fontSize: 11, color: "#ff8c42", background: "rgba(255,140,66,0.12)", borderRadius: 99, padding: "2px 10px", display: "inline-block" },
  divider: { width: 1, height: 56, background: "rgba(255,255,255,0.08)", margin: "0 12px" },
  card: { background: "#141420", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16, marginBottom: 12, animation: "slideUp 0.3s ease both" },
  cardInactive: { opacity: 0.5 },
  excludedBadge: { fontSize: 9, letterSpacing: 1, color: "#666", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 8px" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  nameInput: { background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", outline: "none", color: "#ccc", fontSize: 14, fontWeight: 700, letterSpacing: 1, fontFamily: "'Noto Sans JP',sans-serif", width: "80%", paddingBottom: 2 },
  delBtn: { background: "none", border: "none", color: "#444", fontSize: 13, cursor: "pointer", padding: "2px 6px" },
  inputRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  arrow: { fontSize: 14, color: "#333", paddingBottom: 10 },
  resultFlow: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" },
  flowArrow: { fontSize: 12, color: "#333", lineHeight: 1 },
  addBtn: { width: "100%", background: "none", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 14, color: "#555", fontSize: 14, padding: 14, cursor: "pointer", letterSpacing: 1 },
  settlementCard: { background: "#141420", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" },
  settlementHint: { marginTop: 10, fontSize: 11, color: "#555", lineHeight: 1.6, padding: "0 4px" },
  txRow: { display: "flex", alignItems: "center", padding: "16px 20px", gap: 8 },
  txPerson: { width: 76, display: "flex", flexDirection: "column", gap: 4 },
  txBadgePay: { fontSize: 9, letterSpacing: 1, color: "#ff4d6d", background: "rgba(255,77,109,0.12)", borderRadius: 4, padding: "2px 6px", textAlign: "center", width: "fit-content" },
  txBadgeRecv: { fontSize: 9, letterSpacing: 1, color: "#00e5a0", background: "rgba(0,229,160,0.12)", borderRadius: 4, padding: "2px 6px", textAlign: "center", width: "fit-content" },
  txName: { fontSize: 14, fontWeight: 700, color: "#fff" },
  txMid: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  txAmt: { fontSize: 15, fontWeight: 700, color: "#fff" },
  txLine: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  txArrow: { fontSize: 12, color: "#444" },
  amariBox: { background: "rgba(255,140,66,0.08)", border: "1px solid rgba(255,140,66,0.25)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 },
  amariTitle: { fontSize: 13, fontWeight: 700, color: "#ff8c42" },
  amariDesc: { fontSize: 10, color: "#888", marginTop: 3 },
  evenBanner: { margin: "0 16px 20px", background: "#141420", border: "1px solid rgba(0,229,160,0.2)", borderRadius: 16, padding: 20, textAlign: "center", fontSize: 14, color: "#00e5a0", position: "relative", zIndex: 1 },
  resetBtn: { display: "block", margin: "8px auto 0", background: "none", border: "1px solid rgba(255,77,109,0.25)", borderRadius: 99, color: "#ff4d6d55", fontSize: 12, letterSpacing: 2, padding: "8px 28px", cursor: "pointer", position: "relative", zIndex: 1 },
};
