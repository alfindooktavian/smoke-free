'use client';

interface SensorCardProps {
  title: string;
  value: string | number;
}

export default function SensorCard({ title, value }: SensorCardProps) {
  return (
    <div className="backdrop-blur-lg bg-white/10 rounded-xl p-5 shadow-lg border border-white/20 text-white">
      <h2 className="text-xl font-semibold mb-2 drop-shadow">{title}</h2>
      <p className="text-4xl font-bold drop-shadow">{value}</p>
    </div>
  );
}
