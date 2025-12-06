'use client';

import { useEffect, useState } from 'react';
import SensorCard from './components/SensorCard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SensorData {
  temperature: number;
  mq2: number;
  fan1: boolean;
  fan2: boolean;
  fan1Mode: 'AUTO' | 'MANUAL';
  fan2Mode: 'AUTO' | 'MANUAL';
  time?: string;
}

export default function Dashboard() {
  const [sensor, setSensor] = useState<SensorData>({
    temperature: 0,
    mq2: 0,
    fan1: false,
    fan2: false,
    fan1Mode: 'AUTO',
    fan2Mode: 'AUTO',
  });

  const [history, setHistory] = useState<SensorData[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://192.168.0.109:3000');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
    
        // ✅ JIKA DATA LENGKAP (SENSOR + FAN)
        if (
          typeof data.temperature === 'number' &&
          typeof data.mq2 === 'number'
        ) {
          setSensor({
            temperature: data.temperature,
            mq2: data.mq2,
            fan1: data.fan1,
            fan2: data.fan2,
            fan1Mode: data.fan1Mode,
            fan2Mode: data.fan2Mode,
          });
    
          setHistory((prev) => [
            ...prev.slice(-19),
            { ...data, time: new Date().toLocaleTimeString() },
          ]);
    
          return;
        }
    
        // ✅ JIKA HANYA COMMAND FAN / MODE
        if (data.action === 'FAN' || data.action === 'MODE') {
          setSensor((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Invalid JSON:', err);
      }
    };
    

    setWs(socket);
    return () => socket.close();
  }, []);

  // ✅ MANUAL FAN (HANYA KIRIM KE BACKEND)
  const toggleFan = (id: 1 | 2, state: boolean) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const mode = id === 1 ? sensor.fan1Mode : sensor.fan2Mode;
    if (mode === 'AUTO') return; // ✅ tidak boleh manual saat auto

    ws.send(JSON.stringify({ action: 'FAN', id, state: state ? 'ON' : 'OFF' }));
  };

  // ✅ SWITCH MODE
  const toggleMode = (id: 1 | 2, mode: 'AUTO' | 'MANUAL') => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ action: 'MODE', id, mode }));
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 drop-shadow-lg">
        ESP32 Control Dashboard
      </h1>

      {/* SENSOR CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="backdrop-blur-lg bg-white/10 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/20">
          <SensorCard title="Suhu (°C)" value={sensor.temperature.toFixed(1)} />
        </div>
        <div className="backdrop-blur-lg bg-white/10 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/20">
          <SensorCard title="MQ2" value={sensor.mq2} />
        </div>
      </div>

      {/* FAN CONTROL */}
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Kontrol Kipas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10">
        {[1, 2].map((id) => {
          const fan = id === 1 ? sensor.fan1 : sensor.fan2;
          const mode = id === 1 ? sensor.fan1Mode : sensor.fan2Mode;
          const isAuto = mode === 'AUTO';

          return (
            <div
              key={id}
              className="backdrop-blur-xl bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20"
            >
              <h2 className="text-lg sm:text-xl font-bold mb-2">Fan {id}</h2>

              <p className="mb-2 text-base sm:text-lg">
                Status:{' '}
                <span className={fan ? 'text-green-300 font-bold' : 'text-red-300 font-bold'}>
                  {fan ? 'NYALA' : 'MATI'}
                </span>
              </p>

              <p className="mb-3 text-base sm:text-lg">
                Mode:{' '}
                <span className="text-yellow-300 font-bold">{mode}</span>
              </p>

              <div className="flex gap-3 mb-3">
                <button
                  className={`flex-1 px-4 py-2 rounded-xl ${
                    !isAuto ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-500 cursor-not-allowed'
                  } shadow-lg`}
                  onClick={() => toggleFan(id as 1 | 2, true)}
                  disabled={isAuto}
                >
                  ON
                </button>

                <button
                  className={`flex-1 px-4 py-2 rounded-xl ${
                    !isAuto ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-500 cursor-not-allowed'
                  } shadow-lg`}
                  onClick={() => toggleFan(id as 1 | 2, false)}
                  disabled={isAuto}
                >
                  OFF
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  className={`flex-1 px-4 py-2 rounded-xl ${
                    isAuto ? 'bg-blue-500 hover:bg-blue-400' : 'bg-gray-500'
                  } shadow-lg`}
                  onClick={() => toggleMode(id as 1 | 2, 'AUTO')}
                >
                  AUTO
                </button>

                <button
                  className={`flex-1 px-4 py-2 rounded-xl ${
                    !isAuto ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-500'
                  } shadow-lg`}
                  onClick={() => toggleMode(id as 1 | 2, 'MANUAL')}
                >
                  MANUAL
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* GRAFIK */}
      <div className="backdrop-blur-xl bg-white/10 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/20">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Grafik Sensor Realtime</h2>

        <div className="w-full h-[250px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff50" />
              <XAxis dataKey="time" stroke="white" />
              <YAxis stroke="white" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temperature" stroke="#ffcc00" name="Suhu (°C)" />
              <Line type="monotone" dataKey="mq2" stroke="#00ff99" name="MQ2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
