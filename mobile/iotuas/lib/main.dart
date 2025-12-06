import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'ESP32 Dashboard',
      theme: ThemeData.dark(),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late WebSocketChannel channel;

  double temperature = 0;
  int mq2 = 0;

  bool fan1 = false;
  bool fan2 = false;

  String fan1Mode = "AUTO";
  String fan2Mode = "AUTO";

  final List<SensorData> sensorHistory = [];
  late TooltipBehavior _tooltipBehavior;
  late TrackballBehavior _trackballBehavior;

  int dataIndex = 0; // index pengganti DateTime biar grafik mulus

  @override
  void initState() {
    super.initState();
    _tooltipBehavior = TooltipBehavior(enable: true);
    _trackballBehavior = TrackballBehavior(
      enable: true,
      activationMode: ActivationMode.singleTap, // klik titik untuk lihat data
      tooltipAlignment: ChartAlignment.near,
      tooltipDisplayMode: TrackballDisplayMode.groupAllPoints,
      markerSettings: const TrackballMarkerSettings(
        markerVisibility: TrackballVisibilityMode.visible,
        height: 10,
        width: 10,
      ),
    );

    sensorHistory.clear();
    dataIndex = 0;

    channel = IOWebSocketChannel.connect("ws://192.168.0.109:3000");

    // Ganti bagian listen channel
channel.stream.listen((message) {
  final data = jsonDecode(message);

  setState(() {
    if (data["temperature"] != null) temperature = data["temperature"] * 1.0;
    if (data["mq2"] != null) mq2 = data["mq2"];

    if (data["fan1"] != null) fan1 = data["fan1"];
    if (data["fan2"] != null) fan2 = data["fan2"];

    sensorHistory.add(SensorData(
      index: dataIndex++,
      temperature: temperature,
      mq2: mq2.toDouble(),
    ));

    // Hanya simpan 5-10 data terakhir (misal 10)
    if (sensorHistory.length > 10) {
      sensorHistory.removeAt(0);
    }
  });
});

  }

  void toggleFan(int id, bool state) {
    channel.sink.add(jsonEncode({
      "action": "FAN",
      "id": id,
      "state": state ? "ON" : "OFF"
    }));
  }

  void switchMode(int id, String mode) {
    channel.sink.add(jsonEncode({
      "action": "MODE",
      "id": id,
      "mode": mode
    }));
  }

  @override
  void dispose() {
    channel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    double maxY = 100;
    if (sensorHistory.isNotEmpty) {
      maxY = sensorHistory
              .map((e) => e.temperature > e.mq2 ? e.temperature : e.mq2)
              .reduce((a, b) => a > b ? a : b) +
          10;
    }

    return Scaffold(
      backgroundColor: Colors.deepPurple.shade900,
      appBar: AppBar(
        title: const Text("ESP32 Control Dashboard"),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: ListView(
          children: [
            Row(
              children: [
                Expanded(child: _buildCard(title: "Suhu (°C)", value: temperature.toStringAsFixed(1))),
                const SizedBox(width: 12),
                Expanded(child: _buildCard(title: "MQ2", value: mq2.toString())),
              ],
            ),

            const SizedBox(height: 20),

            const Text("Kontrol Kipas",
                style: TextStyle(fontSize: 22, color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            _buildFanControl(
              title: "Fan 1",
              status: fan1,
              mode: fan1Mode,
              onOn: fan1Mode == "MANUAL" ? () => toggleFan(1, true) : null,
              onOff: fan1Mode == "MANUAL" ? () => toggleFan(1, false) : null,
              onAuto: () => switchMode(1, "AUTO"),
              onManual: () => switchMode(1, "MANUAL"),
            ),

            const SizedBox(height: 10),

            _buildFanControl(
              title: "Fan 2",
              status: fan2,
              mode: fan2Mode,
              onOn: fan2Mode == "MANUAL" ? () => toggleFan(2, true) : null,
              onOff: fan2Mode == "MANUAL" ? () => toggleFan(2, false) : null,
              onAuto: () => switchMode(2, "AUTO"),
              onManual: () => switchMode(2, "MANUAL"),
            ),

            const SizedBox(height: 20),

            const Text("Grafik Sensor Realtime",
                style: TextStyle(fontSize: 22, color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            // GRAFIK DENGAN MARKER & CLICKABLE
            SizedBox(
              height: 300,
              child: SfCartesianChart(
                legend: Legend(isVisible: true),
                tooltipBehavior: _tooltipBehavior,
                trackballBehavior: _trackballBehavior,
                primaryXAxis: NumericAxis(isVisible: false),
                primaryYAxis: NumericAxis(minimum: 0, maximum: maxY),
                series: <CartesianSeries<SensorData, int>>[
  FastLineSeries<SensorData, int>(
    name: 'Temperature',
    dataSource: sensorHistory,
    xValueMapper: (d, _) => d.index,
    yValueMapper: (d, _) => d.temperature,
    color: Colors.yellow,
    markerSettings: const MarkerSettings(
      isVisible: true,
      width: 8,
      height: 8,
      shape: DataMarkerType.circle,
      borderColor: Colors.yellow,
      borderWidth: 2,
      color: Colors.transparent, // transparan
    ),
    animationDuration: 0,
  ),
  FastLineSeries<SensorData, int>(
    name: 'MQ2',
    dataSource: sensorHistory,
    xValueMapper: (d, _) => d.index,
    yValueMapper: (d, _) => d.mq2,
    color: Colors.greenAccent,
    markerSettings: const MarkerSettings(
      isVisible: true,
      width: 8,
      height: 8,
      shape: DataMarkerType.circle,
      borderColor: Colors.greenAccent,
      borderWidth: 2,
      color: Colors.transparent, // transparan
    ),
    animationDuration: 0,
  ),
],

              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required String title, required String value}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 18)),
          const SizedBox(height: 8),
          Text(value,
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildFanControl({
    required String title,
    required bool status,
    required String mode,
    required VoidCallback? onOn,
    required VoidCallback? onOff,
    required VoidCallback onAuto,
    required VoidCallback onManual,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),

        Text("Mode: $mode",
            style: TextStyle(color: mode == "AUTO" ? Colors.orange : Colors.blueAccent)),

        Text("Status: ${status ? "NYALA" : "MATI"}",
            style: TextStyle(color: status ? Colors.greenAccent : Colors.redAccent)),

        const SizedBox(height: 10),

        Row(children: [
          Expanded(
            child: ElevatedButton(
              onPressed: onAuto,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
              child: const Text("AUTO"),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton(
              onPressed: onManual,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
              child: const Text("MANUAL"),
            ),
          ),
        ]),

        const SizedBox(height: 10),

        Row(children: [
          Expanded(
            child: ElevatedButton(
              onPressed: onOn,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              child: const Text("ON"),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton(
              onPressed: onOff,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text("OFF"),
            ),
          ),
        ]),
      ]),
    );
  }
}

class SensorData {
  final int index;
  final double temperature;
  final double mq2;

  SensorData({
    required this.index,
    required this.temperature,
    required this.mq2,
  });
}
