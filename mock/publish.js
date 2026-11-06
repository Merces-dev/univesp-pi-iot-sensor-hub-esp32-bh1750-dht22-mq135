const mqtt = require("mqtt");

const BROKER = process.env.MQTT_BROKER || "localhost";
const PORT = process.env.MQTT_PORT || "1883";
const INTERVAL = parseInt(process.env.INTERVAL_MS || "2000", 10);

const TOPIC_TELEMETRY = "esp32/sensors/telemetry";
const TOPIC_STATUS = "esp32/sensors/status";

/* ── Estado simulado (random walk) ─────────────────────── */
let temperature = 23 + Math.random() * 3;
let humidity = 55 + Math.random() * 10;
let lux = 3000 + Math.random() * 2000;
let airQuality = 140 + Math.random() * 60;
let tick = 0;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function walk(value, step, min, max) {
  return clamp(value + (Math.random() - 0.5) * step, min, max);
}

function heatIndex(t, h) {
  if (t < 25) return +t.toFixed(1);
  // Apparent temperature (Australian BoM)
  const e = (h / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return +(t + 0.33 * e - 4.0).toFixed(1);
}

/* ── Eventos esporádicos (para gerar poucos alertas) ─────
 * Cada sensor tem chance pequena por tick de iniciar um "evento"
 * que empurra o valor por algumas leituras para fora da faixa segura.
 * Com INTERVAL=2s e cooldown de 30s no backend, isso resulta em
 * alertas ocasionais, não em rajadas.
 */
const events = {
  temperature: { ticksLeft: 0, target: 0 },
  humidity: { ticksLeft: 0, target: 0 },
  lux: { ticksLeft: 0, target: 0 },
  airQuality: { ticksLeft: 0, target: 0 },
};

function maybeStartEvent(key, chance, pickTarget) {
  const ev = events[key];
  if (ev.ticksLeft > 0) return ev;
  if (Math.random() < chance) {
    ev.ticksLeft = 2 + Math.floor(Math.random() * 3); // 2–4 leituras
    ev.target = pickTarget();
  }
  return ev;
}

function eventBias(key, current, normalStep) {
  const ev = events[key];
  if (ev.ticksLeft <= 0) return 0;
  ev.ticksLeft--;
  // Bias proporcional à distância do alvo (interpolação suave)
  return (ev.target - current) * 0.5 + (Math.random() - 0.5) * normalStep;
}

function generatePayload() {
  tick++;

  // ── Luminosidade: faixa normal 200–8000 lux ──
  // Evento raro (~0.8%/tick) excede 10000 lux para disparar "lux-high".
  maybeStartEvent("lux", 0.008, () => 10500 + Math.random() * 3000);
  const luxBias = eventBias("lux", lux, 200);
  lux = walk(lux + luxBias, 200, 200, 18000);

  // ── Temperatura: faixa normal 20–28 °C ──
  // Evento raro (~0.6%/tick) sobe para 31–34 (warning) ou ocasionalmente 36+ (critical).
  maybeStartEvent("temperature", 0.006, () => {
    const critical = Math.random() < 0.25;
    return critical ? 36 + Math.random() * 2 : 31 + Math.random() * 3;
  });
  const tBias = eventBias("temperature", temperature, 0.5);
  temperature = walk(temperature + tBias, 0.5, 18, 40);

  // ── Umidade: faixa normal 45–72 % ──
  // Evento raro (~0.5%/tick) leva para >80% ou <30%.
  maybeStartEvent("humidity", 0.005, () =>
    Math.random() < 0.5 ? 82 + Math.random() * 6 : 22 + Math.random() * 6,
  );
  const hBias = eventBias("humidity", humidity, 1.5);
  humidity = walk(humidity + hBias, 1.5, 18, 92);

  // ── Qualidade do ar: faixa normal 80–260 ppm ──
  // Evento raro (~0.5%/tick) ultrapassa 300 ppm (warning).
  maybeStartEvent("airQuality", 0.005, () => 320 + Math.random() * 120);
  const aqBias = eventBias("airQuality", airQuality, 15);
  airQuality = walk(airQuality + aqBias, 15, 60, 700);

  const hi = heatIndex(temperature, humidity);

  return JSON.stringify({
    lux: +lux.toFixed(1),
    temperature: +temperature.toFixed(1),
    humidity: +humidity.toFixed(1),
    heat_index: hi,
    air_quality: +airQuality.toFixed(1),
    interval_ms: INTERVAL,
  });
}

/* ── Conexão MQTT ──────────────────────────────────────── */
const url = `mqtt://${BROKER}:${PORT}`;
console.log(`[mock] Connecting to ${url} (interval ${INTERVAL}ms)...`);

const client = mqtt.connect(url);

client.on("connect", () => {
  console.log("[mock] Connected to MQTT broker");
  client.publish(TOPIC_STATUS, "online", { retain: true });

  setInterval(() => {
    const payload = generatePayload();
    client.publish(TOPIC_TELEMETRY, payload);
    console.log(`[mock] → ${payload}`);
  }, INTERVAL);
});

client.on("error", (err) => {
  console.error(`[mock] MQTT error: ${err.message}`);
});
