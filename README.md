# A.U.R.A. // Sub-Surface Cavity & Life Detection System

![A.U.R.A. Status](https://img.shields.io/badge/System-Operational-purple?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/Saveetha_Hackathon-2026-brightgreen?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_%7C_TypeScript_%7C_Vite_%7C_Tailwind_v4-blue?style=for-the-badge)

> **Bridging the gap between first responders and life trapped beneath disaster rubble. Zero unmapped survivors.**

---

## 📌 Executive Summary

**A.U.R.A. (Sub-Surface Cavity & Life Detection System)** is a real-time tactical intelligence and scrollytelling web interface built for emergency disaster response teams. During structural collapses (earthquakes, explosions, and tunnel cave-ins), traditional aerial drones and thermal sensors fail to scan through dense concrete and steel layers. A.U.R.A. translates subterranean acoustic tapping patterns and ultrasonic depth anomalies into actionable 3D locational coordinates for rescue personnel.

---

## ⚡ Key Features

- **8K Frame-Scrubbing Canvas Engine:** Smooth 60fps scrollytelling rendering of high-resolution subsurface scan sequences mapped directly to viewport scroll position.
- **Real-Time Telemetry Feed:** Embedded live python scanner simulation (`aura_telemetry_feed.py`) displaying depth variance parsing.
- **Deep Space Galaxy Transition:** Seamless visual transition from subterranean tunnel scans to deep space optics at the footer reveal.
- **Responsive Tactical UI:** Built with custom white-glassmorphic typography, smooth scroll animations, and interactive scramble hover effects.
- **Zero-Latency Data Pipeline:** Low-power edge node integration for immediate GPS and acoustic alert transmission.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Custom CSS Animations
- **Motion & Physics:** Framer Motion (`useScroll`, `useTransform`)
- **Canvas Rendering:** HTML5 Canvas 2D Context with LERP interpolation
- **Typography:** *Space Grotesk* (Headers), *Plus Jakarta Sans* (Body)

---

## 📂 Project Structure

```
c:/AURA WEBSITE/
├── public/                  # Static media assets
├── src/
│   ├── App.tsx              # Main Application & Scrollytelling Engine
│   ├── main.tsx             # React DOM Mounting Entrypoint
│   └── index.css            # Tailwind v4 directives & keyframe animations
├── high_res_frames/         # 311 Extracted High-Resolution 4K Frames
├── PROBLEM_STATEMENT.md     # In-depth analysis of disaster search-and-rescue blindspots
├── HARDWARE_TECH_PARTS.md   # Firmware code & sensor component specifications
├── vite.config.ts           # Vite configuration with Tailwind CSS v4 plugin
└── package.json             # Dependencies and build scripts
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/aura-website.git
   cd aura-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

---

## 👥 Core Architecture Team

| Name | Role | Focus Area |
| :--- | :--- | :--- |
| **Jaffer Rilwaan V** | Lead Systems Architect | System Logic, Telemetry Integration & Flow |
| **Aravind Kumar** | Sensor Integration Lead | Piezoelectric Sensors & Transducers |
| **Divya S.** | Firmware Engineer | Microcontroller Logic & Real-time Filters |
| **Karthik Raja** | Cloud Infrastructure | Telemetry Alert Routing & GPS Sync |
| **Priyanka Mohan** | UI/UX Developer | High-Tech Command Dashboard & Components |

---

## 📄 Documentation

- [Problem Statement & Human Cost Analysis](./PROBLEM_STATEMENT.md)
- [Hardware & Tech Parts Specifications](./HARDWARE_TECH_PARTS.md)

---

© 2026 A.U.R.A. All Rights Reserved. Built for Hackathon Deployment.
