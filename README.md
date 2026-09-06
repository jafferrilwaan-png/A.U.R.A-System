# 🌐 A.U.R.A. // Autonomous Underground Reconnaissance & Assessment
### *Subterranean Cavity Mapping, Bio-Scent Detection & Multi-Modal Life Finding Matrix*

![A.U.R.A. Status](https://img.shields.io/badge/System-Operational-purple?style=for-the-badge)
![SIH](https://img.shields.io/badge/Smart_India_Hackathon-Disaster_Management-orange?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_%7C_TypeScript_%7C_ESP32_C%2B%2B_%7C_Neural_LLM-blue?style=for-the-badge)
![AI Engine](https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash_%7C_LLaMA_3.3_70B-green?style=for-the-badge)

> *"Underneath tons of shattered concrete and steel rubble, every second is the difference between a life saved and a life lost. A.U.R.A. gives eyes, ears, and artificial intelligence to first responders where human senses end."*

---

## 💔 The Human Cost & Emotional Core

When an earthquake strikes, a mine collapses, or a severe structural disaster shatters a multi-story building into compressed pancake voids:
- **The Golden Window (First 72 Hours)**: Trapped survivors face suffocating concrete dust, toxic gas buildup, hypothermia, traumatic shock, and rapid dehydration. Survival probability plummets exponentially with every passing hour.
- **The Agony of Search-and-Rescue**: Emergency responders (NDRF, SDRF, Fire & Rescue) arrive at an impenetrable mountain of chaotic rubble. Traditional tools fail: **thermal imaging drones cannot penetrate dense reinforced concrete slabs**, while radio waves and cellular signals are **completely dead** under meters of twisted steel.
- **The Peril of Blind Excavation**: Digging blindly with heavy excavators can destabilize fragile rubble arches, triggering secondary cave-ins that crush the very survivors teams are desperately trying to reach.
- **The Voice from the Dark**: Trapped souls often tap a piece of rebar or whisper with their last breath. In the deafening roar of surface diesel generators, these faint acoustic cries go unheard.

**Project A.U.R.A. was engineered to solve this human crisis.** It is an edge-deployed tactical reconnaissance and bio-acoustic life-detection platform designed to non-invasively locate buried victims, classify respiration and pulse markers, isolate metabolic scents, and calculate pinpoint surgical excavation vectors for rescue commanders.

---

## 🎯 Smart India Hackathon (SIH) Problem Statement

### **Domain**: Disaster Management, Robotics & AI for Emergency Response
> **Problem Statement**: *Rapid Non-Invasive Subterranean Victim Localization & Structural Cavity Assessment in Post-Disaster Collapse Scenarios.*

### **Target Objectives**:
1. **Penetrative Non-Invasive Sensing**: Overcome the physical limitations of optical drones by utilizing sub-surface acoustic frequency isolation and ultrasonic strata void sonar.
2. **Dual-Gas Bio-Scent Discrimination**: Distinguish between hazardous environmental gases (combustibles, smoke, carbon monoxide) and human metabolic VOC biomarkers (ammonia $NH_3$, sweat VOCs, exhaled $CO_2$) inside collapse voids.
3. **Piezoelectric Seismic Tap Matrix**: Capture rhythmic micro-impact vibrations (distress knocks/taps) against debris and filter out surface machinery noise in real time.
4. **Autonomous Neural Tactical Triage**: Stream multi-modal sensor telemetry directly into an AI reasoning engine (Google Gemini 2.5 Flash / Meta LLaMA 3.3 70B via OpenRouter) to deliver instant excavation directives (burial depth, azimuth angle, structural hazard ratings) to field commander tablets.
5. **Zero-Failure Offline Persistence**: Anchor tactical theatre radar to the last active target coordinate fix so operations continue uninterrupted even through communication blackouts.

---

## ⚡ System Architecture & Hardware Evolution

```
                           ┌────────────────────────────────────────┐
                           │      DISASTER COLLAPSE CAVITY          │
                           └──────────────────┬─────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       ┌─────────────────────────┐                         ┌─────────────────────────┐
       │   BIO-SCENT & GAS VOC   │                         │  PIEZO GEOPHONE & SONAR │
       │  MQ-4 / MQ-135 Sensor   │                         │ Piezoelectric & HC-SR04 │
       └────────────┬────────────┘                         └────────────┬────────────┘
                    │ (PPM & VOC Signals)                               │ (Taps & Void Depth)
                    └─────────────────────────┬─────────────────────────┘
                                              │
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │      ESP32 TACTICAL HARDWARE NODE         │
                        │        (Firmware v14.x Architecture)      │
                        │  • Real-time Frequency FFT Analysis       │
                        │  • Seismic Impact Tap Counting            │
                        │  • Resonant Acoustic/Ultrasonic Beacon    │
                        │  • 300ms Low-Latency Telemetry Stream     │
                        └─────────────────────┬─────────────────────┘
                                              │ (HTTP Telemetry / LocalTunnel)
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │        A.U.R.A. TACTICAL C2 SYSTEM        │
                        │          (React 19 + TypeScript)          │
                        │                                           │
                        │  ┌─────────────────────────────────────┐  │
                        │  │     Subterranean Theatre Radar      │  │
                        │  │ (Topographic Map & Last Active Fix) │  │
                        │  └─────────────────────────────────────┘  │
                        │  ┌─────────────────────────────────────┐  │
                        │  │    Dual-Gas & Bio-Scent Matrix      │  │
                        │  │ (Metabolic VOC vs Environmental)    │  │
                        │  └─────────────────────────────────────┘  │
                        │  ┌─────────────────────────────────────┐  │
                        │  │  Acoustic Spectrum & Tap Counter    │  │
                        │  │ (Voice / Tap / Resonant Energy)     │  │
                        │  └─────────────────────────────────────┘  │
                        │  ┌─────────────────────────────────────┐  │
                        │  │    AURA Voice Orb Neural Engine     │  │
                        │  │ (Gemini 2.5 Flash / LLaMA 3.3 70B)   │  │
                        │  └─────────────────────────────────────┘  │
                        └───────────────────────────────────────────┘
```

---

## 🛠️ Hardware Subsystems & Edge Sensing

### 1. ESP32 Microcontroller Core (`firmware/esp32_aura_node.ino`)
- High-performance dual-core 240MHz microcontroller handling microsecond interrupt routines for seismic impact spikes and audio sample averaging.
- Low-latency HTTP REST server streaming 300ms telemetry packets (`/api/telemetry`) and ingesting tactical hardware commands (`/api/command`).

### 2. Dual-Gas & Metabolic Bio-Scent Array
- **Environmental Hazard Channel**: Evaluates combustible gas, smoke, and air purity in parts-per-million (PPM).
- **Human Bio-Scent VOC Channel**: Detects faint traces of ammonia ($NH_3$), sweat VOCs, and human exhaled breath concentrated in sealed subterranean cavities.
- **Dynamic Visualizer**: Real-time glow indicators on the dashboard flag biological presence vs fire hazard instantly.

### 3. Piezoelectric Geophone & Micro-Acoustic Spectrum
- **Piezo Impact Transducer**: Captures physical distress tapping on pipes, beams, and concrete slabs.
- **Acoustic Spectrum Classifier**: Distinguishes between:
  - `LOUD VOICE/SHOUT` (Immediate survivor vocalization)
  - `HUMAN SPEECH/BREATH` (Faint vocal distress)
  - `FAINT SUB-AUDIBLE` (Micro-vibrations / scratching)
  - `AMBIENT NOISE FLOOR` (Background environmental baseline)
- **Tap Counter Widget**: Live incrementing tap ledger recording impact frequency patterns.

### 4. Ultrasonic Void & Strata Depth Sonar
- High-frequency ultrasonic echo sensing measures distance to debris obstacles, calculating subterranean cavity depth (meters) and detecting structural sandwich voids.

### 5. Multi-Mode Acoustic Beacon
- Onboard variable-level directional buzzer (Levels 1–4, up to 130 dB) and ultrasonic guidance pulses to establish acoustic communication with trapped victims or guide search K9 units.

---

## 💻 Software & Tactical C2 Dashboard Features

### 🗺️ Subterranean Theatre Map & Last Active Target Persistence
- Interactive topological radar canvas displaying sub-surface strata depth slices.
- **Fault-Tolerant Last Active Fix**: If the hardware probe disconnects or signal is lost in deep rubble, the map retains and displays the last known active target fix (anchored to GPS coordinates, e.g., Sriperumbudur command post `12.9665° N, 79.9450° E`).
- Click-to-launch satellite navigation modal integrating Google Maps and OpenStreetMap.

### 🧠 Pure Neural AI Reasoning Engine (Zero Fake Scripts)
- **True LLM Pipeline**: Every question and voice query is processed directly through real neural models (**Google Gemini 2.5 Flash**, **Meta LLaMA 3.3 70B**, and **DeepSeek**) via OpenRouter API.
- **Tactical C2 Synthesis**: The AI ingests live gas levels, seismic peak, tap count, acoustic decibels, and radar depth to compute:
  - Precise excavation azimuth vectors (e.g., `320° NNW`)
  - Estimated victim burial depth (e.g., `3.2 meters`)
  - Structural collapse risk assessment (`STABLE` vs `COLLAPSE HAZARD`)
- **AURA Voice Orb**: Interactive voice assistant equipped with clean speech synthesis (zero raw markdown characters for seamless audio communication).

### 📱 Responsive Mobile Field Operations
- Optimized for ruggedized mobile tablets and smartphones carried by rescue personnel.
- 300ms live polling with automatic LocalTunnel / Ngrok bypass header injection (`Bypass-Tunnel-Reminder: true`, `ngrok-skip-browser-warning: true`).
- Military HUD glassmorphic UI with zero layout overlaps and high-contrast tactical dark mode.

---

## 📂 Repository Structure

```
A.U.R.A-System/
├── firmware/
│   └── esp32_aura_node.ino          # ESP32 C++ Microcontroller Source Code (v14.x)
├── public/
│   ├── aura_hardware_architecture.jpg # Hardware Schematic & Pinout Diagram
│   └── high_res_frames/             # Topographic Strata Visual Assets
├── src/
│   ├── components/
│   │   ├── AuraVoiceOrb.tsx          # Voice AI Assistant (OpenRouter Neural LLM)
│   │   ├── TacticalC2Dashboard.tsx   # Mobile C2 Command & Telemetry Grid
│   │   ├── SubterraneanTheatreMap.tsx # Radar & Last Active Target GPS Modal
│   │   ├── SettingsPage.tsx          # System Configuration & API Diagnostics
│   │   └── SettingsModal.tsx         # Node IP & Connection Settings
│   ├── App.tsx                       # Main Application State & View Routing
│   ├── main.tsx                      # React DOM Entrypoint
│   └── index.css                     # Tactical Military HUD Styling
├── PROBLEM_STATEMENT.md              # In-depth SIH Problem Analysis & Human Cost
├── HARDWARE_TECH_PARTS.md            # Complete Bill of Materials & Wiring Guide
├── README.md                         # Main Documentation & System Architecture
└── package.json                      # Dependencies & Build Scripts
```

---

## 🚀 Quick Start & Deployment

### 1. Prerequisites
- Node.js 18+ & npm
- Arduino IDE (with ESP32 board support)

### 2. Install & Run Web Dashboard
```bash
# Clone the repository
git clone https://github.com/jafferrilwaan-png/A.U.R.A-System.git
cd A.U.R.A-System

# Install dependencies
npm install

# Run tactical dashboard locally
npm run dev
```

### 3. Flash ESP32 Hardware Probe
1. Open `firmware/esp32_aura_node.ino` in Arduino IDE.
2. Configure your WiFi SSID and Password.
3. Connect your sensors according to `HARDWARE_TECH_PARTS.md`.
4. Upload to ESP32 Dev Module at 115200 baud.

### 4. Cloud / Vercel Environment Variables
| Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_OPENROUTER_API_KEY` | `sk-or-v1-...` | OpenRouter Neural AI Engine Key |

---

## 👥 Core Engineering Team

| Name | Role | Core Responsibility |
| :--- | :--- | :--- |
| **Jaffer Rilwaan V** | Lead Systems Architect | Full-Stack C2 Platform, Neural AI Integration & Telemetry Pipeline |
| **Hannah Blessy J** | Hardware & Sensor Lead | Piezoelectric Transducer Arrays & Bio-Scent VOC Hardware |
| **Kathiravan V** | Telemetry & Cloud Engineer | Resilient Tunnel Networking & Edge-to-Cloud Protocols |
| **Kingston** | Firmware & Signal Specialist | ESP32 Real-Time Filtering, Audio FFT & Interrupt Logic |
| **Giridhar K** | UI/UX & Tactical Ops Lead | High-Contrast Tactical C2 Interface & Field Responsiveness |

---

## 📜 License & Mission
© 2026 Project A.U.R.A. Built for disaster search-and-rescue teams worldwide.
*Dedicated to saving trapped lives beneath disaster rubble.*
