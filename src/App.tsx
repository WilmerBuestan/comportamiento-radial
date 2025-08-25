import React, { useEffect, useMemo, useRef, useState } from "react";

// ============================
// Tipos
// ============================

type Category = {
  id: string;
  name: string;
  icon: string; // emoji o carácter
  color: string; // para leyenda/bordes
};

type EventItem = {
  id: string;
  datetimeISO: string; // ISO string
  categoryId: string;
  icon?: string; // sobreescribir el ícono de la categoría
  note?: string;
};

// ============================
// Utilidades
// ============================

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function daysInMonth(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return new Date(y, m + 1, 0).getDate();
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function parseDateValue(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":" ).map(Number);
  const dt = new Date(y, m - 1, d, hh, mm || 0, 0, 0);
  return dt;
}

// ============================
// Estado persistente en localStorage
// ============================

const LS_KEY = "behaviorCircleApp_v4"; // bump version por cambios

type PersistedState = {
  categories: Category[];
  events: EventItem[];
};

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

// ============================
// Datos por defecto
// ============================

const DEFAULT_CATEGORIES: Category[] = [
  { id: uid("cat"), name: "Minería ilegal", icon: "⛏️", color: "#dc2626" },
  { id: uid("cat"), name: "Delitos hidrocarburíferos", icon: "⛽", color: "#7c3aed" },
  { id: uid("cat"), name: "Tala ilegal", icon: "🌲", color: "#16a34a" },
  { id: uid("cat"), name: "Protestas sociales", icon: "🪧", color: "#eab308" },
  { id: uid("cat"), name: "GIA", icon: "⚠️", color: "#2563eb" },
  { id: uid("cat"), name: "Tráfico de armas", icon: "🔫", color: "#fb7185" },
];

// ============================
// Componente principal
// ============================

export default function App() {
  // Fecha de referencia (primer día del mes actual)
  const [monthRef, setMonthRef] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Carga/guarda estado persistente
  const [categories, setCategories] = useState<Category[]>(() => loadState()?.categories || DEFAULT_CATEGORIES);
  const [events, setEvents] = useState<EventItem[]>(() => loadState()?.events || []);

  useEffect(() => {
    saveState({ categories, events });
  }, [categories, events]);

  const nDays = useMemo(() => daysInMonth(monthRef), [monthRef]);

  // ============================
  // Formulario de eventos
  // ============================
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [formTime, setFormTime] = useState("08:00");
  const [formCategory, setFormCategory] = useState<string>(() => (categories[0]?.id || ""));
  const [formIcon, setFormIcon] = useState<string>("");
  const [formNote, setFormNote] = useState<string>("");

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!formDate || !formTime || !formCategory) return;
    const dt = parseDateValue(formDate, formTime);
    const ev: EventItem = {
      id: uid("ev"),
      datetimeISO: dt.toISOString(),
      categoryId: formCategory,
      icon: formIcon.trim() || undefined,
      note: formNote.trim() || undefined,
    };
    setEvents(prev => [...prev, ev]);
    setFormIcon("");
    setFormNote("");
  }

  // ============================
  // Manejo de categorías
  // ============================
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("❖");
  const [newCatColor, setNewCatColor] = useState("#0ea5e9");

  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    const cat: Category = {
      id: uid("cat"),
      name,
      icon: newCatIcon || "❖",
      color: newCatColor || "#0ea5e9",
    };
    setCategories(prev => [...prev, cat]);
    setNewCatName("");
    setNewCatIcon("❖");
  }

  function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  function clearMonthEvents() {
    const y = monthRef.getFullYear();
    const m = monthRef.getMonth();
    setEvents(prev => prev.filter(ev => {
      const d = new Date(ev.datetimeISO);
      return !(d.getFullYear() === y && d.getMonth() === m);
    }));
  }

  // ============================
  // Estado del selector de emojis
  // ============================
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"event" | "category">("event");

  // ============================
  // Responsivo via ResizeObserver
  // ============================
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [boxSize, setBoxSize] = useState(800);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.max(320, Math.floor(e.contentRect.width));
        const s = Math.min(w, 1100); // limita tamaño máximo
        setBoxSize(s);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const size = boxSize;
  const padding = 20;
  const outerR = (size / 2) - padding;
  const innerR = Math.max(32, size * 0.05);

  const ringCount = nDays; // 28-31 según el mes
  const ringStep = (outerR - innerR) / ringCount;

  function angleForTime(date: Date) {
    const h = date.getHours();
    const mm = date.getMinutes();
    const t = h + (mm / 60);
    const radians = ((t / 24) * Math.PI * 2) - Math.PI / 2; // 0h arriba
    return radians;
  }

  function radiusForDay(day: number) {
    const idx = clamp(day, 1, ringCount);
    return innerR + idx * ringStep;
  }

  // Eventos del mes activo
  const monthEvents = useMemo(() => {
    return events.filter(ev => isSameMonth(new Date(ev.datetimeISO), monthRef));
  }, [events, monthRef]);

  monthEvents.sort((a, b) => new Date(a.datetimeISO).getDate() - new Date(b.datetimeISO).getDate());

  const hours = [...Array(24)].map((_, i) => i);

  // ============================
  // UI
  // ============================
  return (
    <div className="app-container">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .app-container { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial; padding: 12px; color: #0f172a; }
        h1 { font-size: clamp(18px, 2vw, 22px); margin: 0 0 8px; }
        h2 { font-size: clamp(14px, 1.8vw, 18px); margin: 20px 0 8px; }
        .grid { display: grid; grid-template-columns: 1fr 360px; gap: 12px; }
        @media (max-width: 1024px) { .grid { grid-template-columns: 1fr; } }
        .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; box-shadow: 0 2px 8px rgba(2,6,23,0.05); }
        .row { display: flex; gap: 8px; align-items: center; }
        .row > * { flex: 1; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; font-size: 12px; border: 1px solid #e5e7eb; }
        .legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .muted { color: #475569; font-size: 12px; }
        .btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 10px; border-radius:10px; border:1px solid #cbd5e1; background:#0ea5e9; color:#fff; font-weight:600; cursor:pointer; }
        .btn.secondary { background:#fff; color:#0f172a; }
        .btn.danger { background:#ef4444; }
        .btn:disabled { opacity: 0.6; cursor:not-allowed; }
        .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .field { display:flex; flex-direction:column; gap:6px; margin-bottom:8px; }
        .field label { font-size:12px; color:#334155; }
        .field input, .field select, .field textarea { border:1px solid #cbd5e1; border-radius:10px; padding:8px 10px; font-size:14px; }
        .list { display:flex; flex-direction:column; gap:8px; max-height:260px; overflow:auto; }
        .item { display:flex; align-items:center; justify-content:space-between; border:1px solid #e2e8f0; padding:8px 10px; border-radius:10px; }
        .svgWrap { background: radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 55%, #e2e8f0 100%); border:1px solid #e5e7eb; border-radius:16px; }
        .footer { text-align:center; margin-top:10px; font-size:12px; color:#475569; }
        .pickerOverlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center; padding:16px; }
        .pickerModal { background:#fff; width:min(680px, 96vw); border-radius:14px; border:1px solid #e5e7eb; box-shadow: 0 8px 30px rgba(2,6,23,0.2); padding:12px; }
        .emojiGrid { display:grid; grid-template-columns: repeat(10, 1fr); gap:8px; max-height:50vh; overflow:auto; }
        @media (max-width: 520px) { .emojiGrid { grid-template-columns: repeat(6, 1fr); } }
        .emojiBtn { font-size:22px; line-height:1; padding:8px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; cursor:pointer; }
      `}</style>

      <h1>Mapa radial de comportamiento (hora → ángulo, día → radio)</h1>
      <p className="muted">Registra un evento con fecha y hora. El ícono se ubicará <b>sobre la línea</b> del horario (24 radios) y en el anillo del <b>día</b> del mes.</p>

      <div className="grid">
        {/* Lienzo / Gráfico (RESPONSIVO) */}
        <div ref={wrapRef} className="card svgWrap" style={{ width: "100%", aspectRatio: "1/1" }}>
          <SVGBehaviorChart
            size={size}
            innerR={innerR}
            outerR={outerR}
            nDays={nDays}
            hours={hours}
            events={monthEvents}
            categories={categories}
            angleForTime={angleForTime}
            radiusForDay={radiusForDay}
          />
        </div>

        {/* Controles */}
        <div className="card">
          <h2>1) Mes en visualización</h2>
          <div className="toolbar">
            <button className="btn secondary" onClick={() => setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1))}>◀ Anterior</button>
            <div style={{flex:1, textAlign:"center"}}><b>{monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b></div>
            <button className="btn secondary" onClick={() => setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1))}>Siguiente ▶</button>
          </div>

          <h2>2) Registrar evento</h2>
          <form onSubmit={addEvent}>
            <div className="row">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
              </div>
              <div className="field">
                <label>Hora</label>
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} step={300} required />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Categoría</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} required>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Ícono (emoji)</label>
                <div className="row">
                  <input value={formIcon} onChange={e => setFormIcon(e.target.value)} placeholder="p.ej. ⛏️, 🔫, ⚠️" />
                  <button type="button" className="btn secondary" onClick={() => { setPickerTarget("event"); setShowPicker(true); }}>Elegir</button>
                </div>
              </div>
            </div>
            <div className="field">
              <label>Nota (opcional)</label>
              <textarea rows={2} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Descripción corta del evento" />
            </div>
            <div className="toolbar" style={{justifyContent:"space-between"}}>
              <button className="btn" type="submit">➕ Agregar al gráfico</button>
              <button className="btn danger" type="button" onClick={clearMonthEvents}>🧹 Limpiar eventos del mes</button>
            </div>
          </form>

          <h2>3) Leyenda / categorías</h2>
          <div className="legend">
            {categories.map(c => (
              <span key={c.id} className="badge" title={c.name} style={{ borderColor: c.color }}>
                <span style={{fontSize:16}}>{c.icon}</span>
                <span>{c.name}</span>
              </span>
            ))}
          </div>

          <form onSubmit={addCategory} style={{marginTop:8}}>
            <div className="row">
              <div className="field">
                <label>Nueva categoría</label>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="field">
                <label>Ícono</label>
                <div className="row">
                  <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} />
                  <button type="button" className="btn secondary" onClick={() => { setPickerTarget("category"); setShowPicker(true); }}>Elegir</button>
                </div>
              </div>
              <div className="field">
                <label>Color</label>
                <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} />
              </div>
            </div>
            <button className="btn" type="submit">➕ Agregar categoría</button>
          </form>

          <h2>4) Eventos del mes</h2>
          <div className="list">
            {monthEvents.length === 0 && (
              <div className="muted">No hay eventos en este mes.</div>
            )}
            {monthEvents.map(ev => {
              const d = new Date(ev.datetimeISO);
              const cat = categories.find(c => c.id === ev.categoryId);
              return (
                <div className="item" key={ev.id}>
                  <div className="row" style={{alignItems:"center"}}>
                    <span className="badge" style={{borderColor: cat?.color || "#cbd5e1"}}>
                      <span style={{fontSize:16}}>{ev.icon || cat?.icon || "❖"}</span>
                      <span>{cat?.name || "(sin cat)"}</span>
                    </span>
                    <div style={{flex:2}}>
                      <div><b>{d.toLocaleDateString()} {d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</b></div>
                      {ev.note && <div className="muted">{ev.note}</div>}
                    </div>
                  </div>
                  <button className="btn secondary" onClick={() => deleteEvent(ev.id)}>Eliminar</button>
                </div>
              );
            })}
          </div>

          <div className="footer">POWERED BY: <b>Wilmer Buestan</b></div>
        </div>
      </div>

      {/* Selector de emojis (modal sencillo) */}
      {showPicker && (
        <EmojiPickerModal onClose={() => setShowPicker(false)} onPick={(em) => {
          if (pickerTarget === "category") setNewCatIcon(em); else setFormIcon(em);
          setShowPicker(false);
        }} />
      )}
    </div>
  );
}

// ============================
// Subcomponente del SVG radial
// ============================

type SVGProps = {
  size: number;
  innerR: number;
  outerR: number;
  nDays: number;
  hours: number[];
  events: EventItem[];
  categories: Category[];
  angleForTime: (d: Date) => number;
  radiusForDay: (day: number) => number;
};

function SVGBehaviorChart(props: SVGProps) {
  const { size, innerR, outerR, nDays, hours, events, categories, angleForTime, radiusForDay } = props;

  const cx = size / 2;
  const cy = size / 2;
  const rings = Array.from({ length: nDays }, (_, i) => innerR + (i + 1) * ((outerR - innerR) / nDays));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Fondo */}
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={outerR} fill="url(#bg)" />

      {/* Círculos concéntricos (días) + numeración completa */}
      {rings.map((r, i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={1} />
          {/* Número del día en la parte superior */}
          <text x={cx} y={cy - r} fontSize={Math.max(8, size * 0.012)} textAnchor="middle" dominantBaseline="central" fill="#334155">{i + 1}</text>
        </g>
      ))}

      {/* Radios horarios (24) */}
      {hours.map(h => {
        const a = ((h / 24) * Math.PI * 2) - Math.PI / 2;
        const x1 = cx + innerR * Math.cos(a);
        const y1 = cy + innerR * Math.sin(a);
        const x2 = cx + outerR * Math.cos(a);
        const y2 = cy + outerR * Math.sin(a);
        return (
          <g key={h}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={h % 6 === 0 ? 2 : 1} />
            <text x={cx + (innerR - Math.max(14, size*0.02)) * Math.cos(a)} y={cy + (innerR - Math.max(14, size*0.02)) * Math.sin(a)} fontSize={Math.max(8, size*0.012)} textAnchor="middle" dominantBaseline="middle" fill="#334155">
              {String(h).padStart(2, '0')}
            </text>
          </g>
        );
      })}

      {/* Eventos */}
      {events.map(ev => {
        const d = new Date(ev.datetimeISO);
        const angle = angleForTime(d);
        const day = d.getDate();
        const r = radiusForDay(day);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const cat = categories.find(c => c.id === ev.categoryId);
        const icon = ev.icon || cat?.icon || "❖";
        const dotR = Math.max(6, size * 0.01);
        const font = Math.max(10, size * 0.016);
        return (
          <g key={ev.id}>
            <circle cx={x} cy={y} r={dotR} fill="#ffffff" stroke={cat?.color || "#334155"} strokeWidth={2} />
            <text x={x} y={y} fontSize={font} textAnchor="middle" dominantBaseline="central">{icon}</text>
            <title>{`${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} — ${cat?.name || 'Evento'}${ev.note ? "" + ev.note : ""}`}</title>
          </g>
        );
      })}

      {/* Centro */}
      <circle cx={cx} cy={cy} r={innerR - 10} fill="#ffffff" stroke="#cbd5e1" />
      <text x={cx} y={cy} fontSize={Math.max(10, size * 0.016)} textAnchor="middle" dominantBaseline="central" fill="#0f172a">
        24 horas
      </text>
    </svg>
  );
}

// ============================
// Modal de selección de emojis (picker sencillo)
// ============================

type PickerProps = {
  onClose: () => void;
  onPick: (emoji: string) => void;
};

const EMOJIS: string[] = [
  "⛏️","⛽","🌲","🪧","⚠️","🔫","🚨","🧨","🧭","🛰️","📡",
  "🚁","🛡️","🧪","📷","🎯","🧰","🪓","🔧","🧯","💣","📍","🕘",
  "🌙","☀️","🌧️","🌀","🔥","💼","📦","🚧","📜","🏛️","🔒",
  "🏴","🔭","🔍"
];

function EmojiPickerModal({ onClose, onPick }: PickerProps) {
  return (
    <div className="pickerOverlay" role="dialog" aria-modal="true">
      <div className="pickerModal">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <b>Elige un ícono (emoji)</b>
          <button className="btn secondary" onClick={onClose}>Cerrar ✕</button>
        </div>
        <div className="emojiGrid">
          {EMOJIS.map((em, i) => (
            <button key={i} className="emojiBtn" onClick={() => onPick(em)} title={em}>{em}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

