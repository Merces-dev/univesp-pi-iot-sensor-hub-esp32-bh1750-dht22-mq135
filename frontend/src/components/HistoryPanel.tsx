import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Measurement {
  id: number;
  temperature: number | null;
  humidity: number | null;
  luminosity: number | null;
  airQuality: number | null;
  createdAt: string;
}

interface Summary {
  quantidade: number;
  temperaturaMedia: number | null;
  temperaturaMinima: number | null;
  temperaturaMaxima: number | null;
  umidadeMedia: number | null;
  luminosidadeMedia: number | null;
  qualidadeArMedia: number | null;
}

// Valor de <input type="datetime-local"> para uma data local
function toInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const fmt = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? '—' : v.toFixed(digits);

export default function HistoryPanel() {
  const [from, setFrom] = useState(() => toInputValue(new Date(Date.now() - 24 * 3600 * 1000)));
  const [to, setTo] = useState(() => toInputValue(new Date()));
  const [rows, setRows] = useState<Measurement[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      });
      const [r1, r2] = await Promise.all([
        fetch(`/api/measurements?${qs}&limit=1000`),
        fetch(`/api/measurements/summary?${qs}`),
      ]);
      if (!r1.ok || !r2.ok) throw new Error('Falha ao consultar o histórico');
      const list: Measurement[] = await r1.json();
      setRows(list.reverse()); // do mais antigo para o mais recente
      setSummary(await r2.json());
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = rows.map((m) => ({
    time: new Date(m.createdAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    Temperatura: m.temperature,
    Umidade: m.humidity,
  }));

  return (
    <div className="panel history">
      <div className="panel__title">Histórico por período (banco de dados)</div>

      <div className="history__filters">
        <label>
          De
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Até
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={load} disabled={loading}>
          {loading ? 'Consultando…' : 'Consultar'}
        </button>
      </div>

      {error && <div className="history__error">{error}</div>}

      {summary && (
        <div className="history__summary">
          <div><span>Registros</span><strong>{summary.quantidade}</strong></div>
          <div><span>Temp. média</span><strong>{fmt(summary.temperaturaMedia)} °C</strong></div>
          <div><span>Temp. mín.</span><strong>{fmt(summary.temperaturaMinima)} °C</strong></div>
          <div><span>Temp. máx.</span><strong>{fmt(summary.temperaturaMaxima)} °C</strong></div>
          <div><span>Umid. média</span><strong>{fmt(summary.umidadeMedia)} %</strong></div>
          <div><span>Lux médio</span><strong>{fmt(summary.luminosidadeMedia, 0)}</strong></div>
        </div>
      )}

      {data.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-state__text">Nenhuma medição no período selecionado</div>
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={48} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="Temperatura" stroke="#ef4444" dot={false} strokeWidth={1.5} connectNulls />
              <Line type="monotone" dataKey="Umidade" stroke="#3b82f6" dot={false} strokeWidth={1.5} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
