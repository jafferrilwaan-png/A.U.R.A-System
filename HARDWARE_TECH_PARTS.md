# Project A.U.R.A. Hardware Specifications & Pinout Connections

![A.U.R.A. Hardware Architecture & Pinout Schematic](./public/aura_hardware_architecture.jpg)

This document details the full hardware component breakdown, wiring schematic, and pinout connection guide for the **A.U.R.A. (Autonomous Universal Rescue & Analysis Node)** Multi-Sensor Search-and-Rescue platform.

---

## 🛠️ Complete Hardware Pinout & Wiring Table

| Component | Hardware Model | Sensor Type | ESP32 Pin Connection | Operating Voltage | Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Microcontroller Core** | ESP32-WROOM-32 / DevKit V1 | Central Node & Dual-Core DSP | USB / 5V VIN & GND | 5V DC / 3.3V | Dual-Core FreeRTOS processing (Core 0: Async Network/AI, Core 1: 500Hz DSP) |
| **Bio-Scent & Gas Sensor** | MQ-135 Multi-Gas VOC Sensor | Analog Resistive Array | **Analog A0 (GPIO 34)** | 5V VCC / GND | Detects metabolic breath VOCs, $NH_3$, sulfide biomarkers, and air hazard levels |
| **Seismic Geophone** | Piezoelectric Ceramic Transducer | Contact Vibration Sensor | **Analog A1 (GPIO 35)** | 3.3V / GND | High-sensitivity detection of survivor tapping through collapsed concrete slabs |
| **Acoustic Listening Array** | High-Sensitivity Electret Mic | Acoustic Audio Sensor | **Analog A2 (GPIO 32)** | 3.3V / GND | Real-time audio spectrum analysis (whispers, shouts, distress vocalizations) |
| **Microwave Doppler Radar** | RCWL-0516 Radar Module | Microwave Motion Transceiver | **Digital IN (GPIO 33)** | 3.3V / GND | Sub-surface void motion detection, penetrating debris to detect chest flutter/movement |
| **Structural IMU** | MPU-6050 6-Axis (Accel + Gyro) | I2C Inertial Motion Sensor | **SDA (GPIO 21) / SCL (GPIO 22)** | 3.3V / GND | Detects debris micro-shifts, structural collapse risk, and seismic jerk dynamics |
| **Tactical OLED Display** | 0.96" SSD1306 (128x64) | I2C High-Contrast Screen | **SDA (GPIO 21) / SCL (GPIO 22)** | 3.3V / GND | 8-Slide animated live telemetry carousel for field rescue operators |
| **Tactical Alert Transducer** | High-Decibel Buzzer Module | PWM / Digital Actuator | **Digital OUT (GPIO 25)** | 3.3V / GND | Multi-cadence acoustic beacon, locator chirps, and emergency evacuation alarms |

---

## 🔌 Step-by-Step Hardware Assembly & Wiring Guide

### Step 1: Power & Bus Distribution
- Supply **5V DC** to the ESP32 `VIN` pin and `VCC` pin of the **MQ-135** gas sensor.
- Supply **3.3V DC** from the ESP32 `3V3` regulator rail to the **MPU-6050**, **SSD1306 OLED**, **RCWL-0516 Radar**, **Electret Mic**, and **Piezoelectric Sensor**.
- Connect all component **GND** lines to a shared common ground plane on the ESP32.

### Step 2: I2C Digital Bus (OLED Display & MPU-6050 IMU)
- Connect **SDA** pin of both SSD1306 OLED and MPU-6050 to **GPIO 21**.
- Connect **SCL** pin of both SSD1306 OLED and MPU-6050 to **GPIO 22**.
- The firmware configures the I2C bus at a rock-solid **100kHz clock speed** (`Wire.setClock(100000)`) with a 30ms timeout to ensure zero bus lockups.

### Step 3: Analog Seismic, Acoustic, and Bio-Gas Sensing (ADC1)
- Connect **Piezoelectric Geophone** output to **GPIO 35** (ADC1_CH7).
- Connect **Electret Microphone** analog output to **GPIO 32** (ADC1_CH4).
- Connect **MQ-135 Gas Sensor** analog output to **GPIO 34** (ADC1_CH6).
> *Note: All analog sensors are mapped strictly to ADC1 channels so they remain 100% functional during active Wi-Fi and TCP/IP transmissions.*

### Step 4: Digital Radar & Buzzer Actuator
- Connect **RCWL-0516 Radar OUT** pin to **GPIO 33** (configured with internal pulldown).
- Connect **Tactical Buzzer (+)** pin to **GPIO 25** (LEDC PWM / Digital output).

---

## 💻 Microcontroller Firmware

The production C++ / FreeRTOS firmware running the dual-core pipeline is located at:
📁 **[`firmware/esp32_aura_node.ino`](./firmware/esp32_aura_node.ino)**
