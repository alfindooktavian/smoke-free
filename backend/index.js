const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const app = express();
const port = 3000;

app.use(cors());

// ================= HTTP SERVER =================
const server = app.listen(port, () => {
  console.log(`✅ Server berjalan di http://192.168.0.109:${port}`);
});

// ================= WEBSOCKET SERVER =================
const wss = new WebSocketServer({ server });

// ================= CLIENT LIST =================
let clients = [];

// ================= DATA GLOBAL =================
let sensorData = {
  temperature: 0,
  mq2: 0,

  fan1: false,
  fan2: false,

  fan1Mode: "AUTO",
  fan2Mode: "AUTO",
};

// ✅ REFERENSI NILAI AUTO DARI ESP (ANTI NYANGKUT)
let autoFan1 = false;
let autoFan2 = false;

// ================= WEBSOCKET =================
wss.on("connection", (ws) => {
  console.log("✅ Client connected");
  clients.push(ws);

  // Kirim data awal ke client
  ws.send(JSON.stringify(sensorData));

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (err) {
      console.log("❌ Invalid JSON:", msg.toString());
      return;
    }

    console.log("📩 DARI CLIENT:", data);

    // ================= DATA SENSOR DARI ESP =================
    if (typeof data.temperature === "number" && typeof data.mq2 === "number") {
      sensorData.temperature = data.temperature;
      sensorData.mq2 = data.mq2;

      // ✅ SIMPAN AUTO VALUE DARI ESP SAJA
      if (typeof data.fan1 === "boolean") autoFan1 = data.fan1;
      if (typeof data.fan2 === "boolean") autoFan2 = data.fan2;

      // ✅ JIKA MODE AUTO → IKUT SENSOR
      if (sensorData.fan1Mode === "AUTO") sensorData.fan1 = autoFan1;
      if (sensorData.fan2Mode === "AUTO") sensorData.fan2 = autoFan2;

      broadcast(sensorData);
      return;
    }

    // ================= COMMAND FAN MANUAL =================
    if (data.action === "FAN") {
      const id = Number(data.id);
      const state = data.state?.toUpperCase();

      if (![1, 2].includes(id)) return;
      if (!["ON", "OFF"].includes(state)) return;

      // ✅ UPDATE STATE HANYA JIKA MODE MANUAL
      if (id === 1 && sensorData.fan1Mode === "MANUAL") {
        sensorData.fan1 = state === "ON";
      }

      if (id === 2 && sensorData.fan2Mode === "MANUAL") {
        sensorData.fan2 = state === "ON";
      }

      // ✅ PERINTAH DIKIRIM KE ESP
      broadcast({ action: "FAN", id, state });
      broadcast(sensorData);
      return;
    }

    // ================= SWITCH MODE AUTO / MANUAL =================
    if (data.action === "MODE") {
      const id = Number(data.id);
      const mode = data.mode?.toUpperCase();

      if (![1, 2].includes(id)) return;
      if (!["AUTO", "MANUAL"].includes(mode)) return;

      if (id === 1) {
        sensorData.fan1Mode = mode;
        if (mode === "AUTO") sensorData.fan1 = autoFan1;
      }

      if (id === 2) {
        sensorData.fan2Mode = mode;
        if (mode === "AUTO") sensorData.fan2 = autoFan2;
      }

      // ✅ KIRIM PERUBAHAN MODE KE ESP & FRONTEND
      broadcast({ action: "MODE", id, mode });
      broadcast(sensorData);
      return;
    }
  });

  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
    console.log("❌ Client disconnected");
  });
});

// ================= BROADCAST =================
function broadcast(obj) {
  const str = JSON.stringify(obj);
  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(str);
    }
  });
}

// ================= HTTP API FAN =================
app.get("/fan/:id/:state", (req, res) => {
  const id = Number(req.params.id);
  const state = req.params.state.toUpperCase();

  if (![1, 2].includes(id) || !["ON", "OFF"].includes(state)) {
    return res.status(400).send("Invalid parameters");
  }

  if (id === 1 && sensorData.fan1Mode === "MANUAL") {
    sensorData.fan1 = state === "ON";
  }

  if (id === 2 && sensorData.fan2Mode === "MANUAL") {
    sensorData.fan2 = state === "ON";
  }

  broadcast({ action: "FAN", id, state });
  broadcast(sensorData);
  res.send("OK");
});

// ================= HTTP API MODE =================
app.get("/fan/:id/mode/:mode", (req, res) => {
  const id = Number(req.params.id);
  const mode = req.params.mode.toUpperCase();

  if (![1, 2].includes(id) || !["AUTO", "MANUAL"].includes(mode)) {
    return res.status(400).send("Invalid parameters");
  }

  if (id === 1) {
    sensorData.fan1Mode = mode;
    if (mode === "AUTO") sensorData.fan1 = autoFan1;
  }

  if (id === 2) {
    sensorData.fan2Mode = mode;
    if (mode === "AUTO") sensorData.fan2 = autoFan2;
  }

  broadcast({ action: "MODE", id, mode });
  broadcast(sensorData);
  res.send("OK");
});
