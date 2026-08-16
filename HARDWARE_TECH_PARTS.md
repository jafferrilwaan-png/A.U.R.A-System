# Hardware Specifications & Wiring Connections

![A.U.R.A. Hardware Connection Schematic](./public/aura_hardware_architecture.jpg)

This document details the hardware schematic connections, component breakdown, and step-by-step wiring instructions for the **A.U.R.A. Sub-Surface Cavity & Life Detection System** demonstrated for the hackathon.

---

## 🔌 Hardware Step-by-Step Connection Instructions

### Step 1: Microcontroller Power Setup
- Connect the **12V LiFePO4 Battery** output to an LM2596 step-down voltage regulator tuned to **5V DC**.
- Connect the 5V Regulator Output to the **5V (VIN)** and **GND** pins on the **ESP32 DevKit V1**.

### Step 2: Piezoelectric Seismic Acoustic Sensor Setup
- Connect the **Signal (VOUT)** wire of the Piezoelectric Geophone Module to **Analog Pin A0 (GPIO 36)** on the ESP32.
- Connect the Sensor **VCC** to 3.3V and **GND** to common Ground.

### Step 3: Subsurface Ultrasonic Depth Transducer Setup
- Connect **Trigger Pin (TRIG)** on the Ultrasonic sensor to **Digital GPIO 5** on the ESP32.
- Connect **Echo Pin (ECHO)** through a 1kΩ / 2kΩ resistor voltage divider to **Digital GPIO 18** on the ESP32.
- Connect sensor VCC to 5V power rail and GND to common Ground.

### Step 4: GPS Telemetry Module Setup
- Connect **NEO-6M GPS TX** pin to **ESP32 RX2 (GPIO 16)**.
- Connect **NEO-6M GPS RX** pin to **ESP32 TX2 (GPIO 17)**.

---

## 🛠️ Hardware Component Table

| Component | Function | Specifications | Saved File Path |
| :--- | :--- | :--- | :--- |
| **ESP32 Microcontroller** | Central Processing Node & Telemetry Stream | Dual Core 240MHz, Wi-Fi/BLE | `firmware/esp32_aura_node.ino` |
| **Piezoelectric Sensor** | Seismic Survivor Tapping Detection | Range: 10Hz - 250Hz | Pin A0 (GPIO 36) |
| **Ultrasonic Transducer** | Subsurface Air Pocket Depth Scanner | 40kHz, 0.5m - 15m Range | GPIO 5 / GPIO 18 |
| **NEO-6M GPS Module** | Live Target Location Coordinates | UART Stream (RX2/TX2) | GPIO 16 / GPIO 17 |
| **Hardware Architecture Diagram** | Complete Wiring Visual Schematic | 16:9 Schematic Graphic | `public/aura_hardware_architecture.jpg` |

---

## 💻 ESP32 Microcontroller Source Code (`firmware/esp32_aura_node.ino`)

The actual C++ / Arduino firmware driving the hardware sensors is located at:
📁 **[`firmware/esp32_aura_node.ino`](./firmware/esp32_aura_node.ino)**

```cpp
// Excerpt from firmware/esp32_aura_node.ino
void loop() {
  float currentDepthMeters = readSubsurfaceDepthMeters();
  int acousticPulseValue = readSeismicAcousticPulse();

  if (acousticPulseValue > ACOUSTIC_TAP_THRESHOLD) {
    digitalWrite(LED_STATUS_PIN, HIGH);
    Serial.println(">>> [ALERT] SURVIVOR TAP SIGNATURE DETECTED! TRANSMITTING GPS...");
  }
}
```
