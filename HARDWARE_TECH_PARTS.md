# Hardware Specifications & Tech Architecture

This document details the hardware components, sensor integration, and firmware logic utilized during the hackathon demonstration of A.U.R.A.

---

## 🛠️ Hardware Component Breakdown

| Component | Function | Specifications |
| :--- | :--- | :--- |
| **Piezoelectric Geophone Sensors** | Seismic acoustic pulse detection | Frequency Response: 10 Hz – 250 Hz |
| **Ultrasonic Transducers** | Subsurface void depth scanning | Range: 0.5m – 15m, 40kHz signal frequency |
| **ESP32 Edge Microcontroller** | Fast local DSP & signal filtering | Dual-core 240MHz, Integrated Wi-Fi/BLE |
| **GPS / GNSS Telemetry Module** | Location tagging for rescue tablets | Accuracy: < 2.5m CEP |
| **LiFePO4 Power System** | Field operation power supply | 12V 10Ah portable power pack |

---

## 💻 Hackathon Firmware Logic (`aura_telemetry_feed.py`)

```python
import time
import numpy as np

class AuraTelemetry:
    """
    Simulates real-time subsurface void parsing & piezoelectric acoustic tap detection.
    """
    def __init__(self, sensor_frequency=18.4):
        self.freq = sensor_frequency
        self.active_voids = []

    def scan_depth_anomalies(self):
        # Generate simulated subsurface depth readings
        anomalies = np.random.normal(3.42, 0.12, 10)
        self.active_voids = [round(d, 2) for d in anomalies if d > 3.0]
        return self.active_voids

if __name__ == "__main__":
    print("Initiating A.U.R.A. realtime cavity parsing...")
    aura = AuraTelemetry()
    for _ in range(5):
        voids = aura.scan_depth_anomalies()
        print(f"[TELEMETRY] Sub-surface scan complete: {len(voids)} active cavities found at depths {voids} meters.")
        time.sleep(1.0)
```

---

## 🛰️ Signal Pipeline Workflow

```
[Piezoelectric & Ultrasonic Sensors]
                 │
                 ▼ (Raw Analog Telemetry)
    [ESP32 Microcontroller Edge Node]
                 │
                 ▼ (DSP Noise Filtering & FFT)
    [Live Telemetry Alert Broadcast]
                 │
                 ▼ (WebSocket Feed)
    [A.U.R.A. Scrollytelling Web Dashboard]
```
