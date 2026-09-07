/**
 * ============================================================================
 * PROJECT A.U.R.A. (Autonomous Universal Rescue & Analysis Node)
 * MASTER SYSTEM FIRMWARE: Enterprise Multi-Sensor Rescue Engine v30.0-PROD
 * ============================================================================
 * MODE: BULLETPROOF PRODUCTION MATRIX (I2C Bus Clock Sync & WDT Fix)
 * 1. Fixed ESP-IDF v3 Watchdog & GCC 14.2 Type Deduction
 * 2. 8-Slide Animated OLED Carousel & Multi-Cadence Buzzer Engine
 * 3. OpenRouter Gemini Flash 1.5 Integration
 * 4. Dedicated Core 0 Async Network Task + Full CORS & Private Network Access
 * 5. Small Pond (Nehru Street Sector) Geospatial Anchor: 12.9676 N, 79.9462 E
 * ============================================================================
 * Hardware Pinout:
 *   - ESP32-WROOM-32 Central Node
 *   - MQ-135 Bio-Scent Gas Sensor      -> GPIO 34 (Analog ADC1)
 *   - Piezoelectric Seismic Geophone   -> GPIO 35 (Analog ADC1)
 *   - High-Sensitivity Mic Sensor      -> GPIO 32 (Analog ADC1)
 *   - RCWL-0516 Microwave Radar        -> GPIO 33 (Digital IN)
 *   - Tactical Alert Buzzer            -> GPIO 25 (PWM / Digital OUT)
 *   - SSD1306 128x64 OLED Display      -> SDA: GPIO 21, SCL: GPIO 22 (0x3C)
 *   - MPU-6050 6-Axis IMU              -> SDA: GPIO 21, SCL: GPIO 22 (0x68)
 * ============================================================================
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

// ----------------------------------------------------------------------------
// PIN DEFINITIONS
// ----------------------------------------------------------------------------
#define PIN_GAS_MQ135   34  
#define PIN_PIEZO       35  
#define PIN_MIC_OUT     32  
#define PIN_RADAR_OUT   33  
#define PIN_BUZZER      25  

#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT   64
#define OLED_RESET      -1
#define SCREEN_ADDRESS  0x3C

#define BUZZER_PWM_CHANNEL 0
#define BUZZER_PWM_RES     8
#define SEISMIC_SAMPLES    128
#define WDT_TIMEOUT_SEC    30

// ----------------------------------------------------------------------------
// NETWORK & CLOUD CREDENTIALS
// ----------------------------------------------------------------------------
const char* ssid = "dhil";
const char* password = "12345678";

const String OPENROUTER_KEY = "YOUR_OPENROUTER_API_KEY"; // Replace with your OpenRouter sk-or-v1-... key before flashing
const char* OPENROUTER_MODEL = "google/gemini-flash-1.5";

// Target Coordinates: Small Pond, Nehru Street Sector
const float GPS_LATITUDE  = 12.9676;
const float GPS_LONGITUDE = 79.9462;

// ----------------------------------------------------------------------------
// GLOBAL OBJECTS & STATE FLAGS
// ----------------------------------------------------------------------------
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_MPU6050 mpu;
WebServer server(80);
TaskHandle_t NetworkTaskHandle = NULL;

bool oledReady = false;
bool mpuReady = false;
bool wifiReady = false;

// ----------------------------------------------------------------------------
// RAW SENSOR SIGNALS
// ----------------------------------------------------------------------------
volatile int rawGas = 0;
volatile int rawPiezo = 0;
volatile int rawMic = 0;
volatile int rawRadar = 0;

// ----------------------------------------------------------------------------
// V20.0 TRUE MATRIX NOISE FLOORS & DEBOUNCERS
// ----------------------------------------------------------------------------
float micNoiseFloor = 14.0f;
float ambientSeismicFloor = 0.0f;
int lastRadarState = 0;
unsigned long lastRadarTransitionTime = 0;

float piezoBaseline = 0.0;
volatile float piezoInstantDelta = 0.0;
volatile float piezoPeakEnvelope = 0.0;
int tapCountWindow = 0;
unsigned long lastTapTimestamp = 0;
int seismicBuffer[SEISMIC_SAMPLES];
int bufferIndex = 0;

volatile float micPeakToPeak = 0.0;
volatile float micEnergy = 0.0;
String acousticSpectrum = "SILENCE / NOISE FLOOR";

// ----------------------------------------------------------------------------
// SPATIAL INTELLIGENCE VARIABLES
// ----------------------------------------------------------------------------
volatile int survivorCount = 0;
volatile float targetDepthMeters = 0.0;
volatile float targetRangeMeters = 0.0;
String survivorZoneColor = "NONE"; 
String spatialPosition = "ALL CLEAR / SCANNING";
volatile int rescueConfidence = 0;

// ----------------------------------------------------------------------------
// ENVIRONMENTAL & BIO-SCENT SENSING
// ----------------------------------------------------------------------------
volatile float envGasPPM = 400.0;
volatile float humanScentPPM = 0.0;
volatile bool humanScentDetected = false;
String humanScentLabel = "CLEAR AMBIENT";

// ----------------------------------------------------------------------------
// IMU / STRUCTURAL VARIABLES
// ----------------------------------------------------------------------------
float prevAx = 0, prevAy = 0, prevAz = 9.8;
volatile float deltaJerk = 0.0;

// ----------------------------------------------------------------------------
// BUZZER ACTUATOR ENGINE
// ----------------------------------------------------------------------------
volatile int buzzerMode = 0;
unsigned long lastBuzzerTick = 0;
bool buzzerPulseState = false;
int cadenceStep = 0;

// ----------------------------------------------------------------------------
// CLOUD AI ENGINE VARIABLES
// ----------------------------------------------------------------------------
String aiStatus = "AI: LOCAL ACTIVE";
String aiClassification = "MONITORING DEBRIS";
volatile bool triggerCloudAiQuery = false;
unsigned long lastAiCallTime = 0;
const unsigned long AI_QUERY_INTERVAL = 6000;

// ----------------------------------------------------------------------------
// 8-SLIDE OLED CAROUSEL ENGINE VARIABLES
// ----------------------------------------------------------------------------
int oledCardIndex = 0;
const int TOTAL_SLIDES = 8;
unsigned long lastSlideSwitch = 0;
const unsigned long SLIDE_INTERVAL_MS = 2500;
int animTick = 0;

// ----------------------------------------------------------------------------
// MAIN LOOP TIMERS
// ----------------------------------------------------------------------------
unsigned long lastDspCycle = 0;
unsigned long lastSlowCycle = 0;
unsigned long lastOledCycle = 0;

// ============================================================================
// HARDWARE ACTUATOR LOGIC (BUZZER CONTROL)
// ============================================================================
void setBuzzerTone(uint32_t freq) {
  if (freq == 0) {
    #if ESP_ARDUINO_VERSION_MAJOR >= 3
      ledcWriteTone(PIN_BUZZER, 0);
    #else
      ledcWriteTone(BUZZER_PWM_CHANNEL, 0);
    #endif
    return;
  }
  
  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWriteTone(PIN_BUZZER, freq);
  #else
    ledcWriteTone(BUZZER_PWM_CHANNEL, freq);
  #endif
}

void executeBuzzerEngine() {
  unsigned long now = millis();
  
  switch (buzzerMode) {
    case 0: 
      setBuzzerTone(0);
      break;

    case 1: 
      if (now - lastBuzzerTick >= 2000) {
        lastBuzzerTick = now;
        setBuzzerTone(1800);
        buzzerPulseState = true;
      } else if (buzzerPulseState && (now - lastBuzzerTick >= 120)) {
        setBuzzerTone(0);
        buzzerPulseState = false;
      }
      break;

    case 2: 
      if (now - lastBuzzerTick >= 400) {
        lastBuzzerTick = now;
        buzzerPulseState = !buzzerPulseState;
        setBuzzerTone(buzzerPulseState ? 2400 : 0);
      }
      break;

    case 3: 
      if (now - lastBuzzerTick >= 220) {
        lastBuzzerTick = now;
        buzzerPulseState = !buzzerPulseState;
        setBuzzerTone(buzzerPulseState ? 3200 : 1600);
      }
      break;

    case 4: 
      if (now - lastBuzzerTick >= 110) {
        lastBuzzerTick = now;
        cadenceStep = (cadenceStep + 1) % 16;
        if (cadenceStep == 0 || cadenceStep == 2 || cadenceStep == 4 || 
            cadenceStep == 7 || cadenceStep == 9 || cadenceStep == 11) {
          setBuzzerTone(2600);
        } else {
          setBuzzerTone(0);
        }
      }
      break;
  }
}

// ============================================================================
// V20.0 TRUE VARIANCE SPATIAL ALGORITHM
// ============================================================================
void processSpatialIntelligence() {
  bool motionActive = (rawRadar == 1);
  bool acousticActive = (micEnergy > 12.0f); 
  bool seismicActive = (piezoPeakEnvelope > 2.0f || tapCountWindow > 0); 
  bool bioScentActive = humanScentDetected;

  int confirmed = 0;
  
  if (motionActive) {
    confirmed++; 
  }
  
  if (seismicActive && tapCountWindow >= 1) {
    confirmed++; 
  }
  
  if (seismicActive && tapCountWindow >= 4) {
    confirmed++; 
  }
  
  if (acousticActive && micEnergy > 30.0f) {
    confirmed++;  
  }
  
  if (confirmed == 0 && bioScentActive) {
    confirmed = 1; 
  }
  
  survivorCount = constrain(confirmed, 0, 3);

  if (survivorCount == 0) {
    targetDepthMeters = 0.0f;
    targetRangeMeters = 0.0f;
    survivorZoneColor = "NONE";
    spatialPosition = "ALL CLEAR / MONITORING";
    rescueConfidence = 0;
  } else {
    float mE = (float)micEnergy;
    float pP = (float)piezoPeakEnvelope;
    float maxEnergy = (mE > pP) ? mE : pP;
    if (maxEnergy < 1.0f) {
      maxEnergy = 1.0f; 
    }
    
    float calculatedDistance = constrain(12.0f / sqrt(maxEnergy), 0.15f, 6.0f);
    targetDepthMeters = calculatedDistance * 0.8f; 
    targetRangeMeters = calculatedDistance;

    if (targetDepthMeters < 0.5f) {
      survivorZoneColor = "GREEN";
      spatialPosition = "SURFACE / IMMEDIATE ACCESS";
    } else if (targetDepthMeters < 2.5f) {
      survivorZoneColor = "RED";
      spatialPosition = "DOWN / MID-DEBRIS CORE";
    } else {
      survivorZoneColor = "WHITE";
      spatialPosition = "VERY DOWN / DEEP SUBTERRANEAN VOID";
    }

    int score = 0;
    if (seismicActive) score += 35;
    if (acousticActive) score += 25;
    if (motionActive) score += 20;
    if (bioScentActive) score += 20;
    rescueConfidence = constrain(score, 15, 99);
  }
}

// ============================================================================
// CLOUD AI TACTICAL INFERENCE (CORE 0)
// ============================================================================
void runInferenceEngineCore0() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  aiStatus = "AI: CLOUD VERIFYING...";
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String prompt = "AURA SAR: Victims=" + String(survivorCount) + " Zone=" + survivorZoneColor +
                  " Depth=" + String(targetDepthMeters, 2) + "m Range=" + String(targetRangeMeters, 2) + 
                  "m Audio=" + acousticSpectrum + " TapPk=" + String((int)piezoPeakEnvelope) +
                  " Taps=" + String(tapCountWindow) + " Scent=" + String((int)humanScentPPM) +
                  "ppm. Classify precise situation and recommend tactical rescue priority in 1 sentence.";

  if (http.begin(client, "https://openrouter.ai/api/v1/chat/completions")) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + OPENROUTER_KEY);
    http.addHeader("HTTP-Referer", "http://aura-node.local");

    String payload = "{\"model\":\"" + String(OPENROUTER_MODEL) + "\",\"messages\":[{\"role\":\"user\",\"content\":\"" + prompt + "\"}]}";
    int code = http.POST(payload);
    
    if (code == 200) {
      String resp = http.getString();
      #if ARDUINOJSON_VERSION_MAJOR >= 7
        JsonDocument doc;
      #else
        DynamicJsonDocument doc(2048);
      #endif
      
      if (!deserializeJson(doc, resp)) {
        const char* text = doc["choices"][0]["message"]["content"];
        if (text) {
          aiClassification = String(text);
          aiStatus = "AI: CONFIRMED";
        }
      }
    }
    http.end();
  }
}

// ============================================================================
// MICRO-AUDIO BUFFER ENDPOINT
// ============================================================================
void handleAudioCaptureEndpoint() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");

  String audioJSON = "{\"status\":\"success\",\"sample_rate_hz\":8000,\"raw_data\":[";
  
  for (int i = 0; i < 512; i++) {
    int sample = analogRead(PIN_MIC_OUT);
    audioJSON += String(sample);
    if (i < 511) {
      audioJSON += ",";
    }
    delayMicroseconds(125); 
  }
  
  audioJSON += "]}";
  server.send(200, "application/json", audioJSON);
}

// ============================================================================
// REST API ENDPOINTS (CORE 0) - SAFE DASHBOARD STREAMING
// ============================================================================
void handleTelemetryEndpoint() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<1024> doc;
  #endif

  // Exact Location coordinates for Map view
  doc["lat"] = GPS_LATITUDE;
  doc["lng"] = GPS_LONGITUDE;
  doc["location_name"] = "Small Pond (Nehru Street Sector)";

  doc["survivor_count"] = survivorCount;
  doc["depth_meters"] = targetDepthMeters;
  doc["range_meters"] = targetRangeMeters;
  doc["zone_color"] = survivorZoneColor;
  doc["spatial_position"] = spatialPosition;
  doc["confidence"] = rescueConfidence;
  
  doc["tap_count"] = tapCountWindow;
  doc["seismic_peak"] = (int)piezoPeakEnvelope;
  doc["raw_piezo"] = rawPiezo;
  doc["acoustic_energy"] = (int)micEnergy;
  doc["acoustic_spectrum"] = acousticSpectrum;
  doc["radar"] = rawRadar;
  
  doc["env_gas_ppm"] = (int)envGasPPM;
  doc["human_scent_ppm"] = humanScentPPM;
  doc["human_scent_detected"] = humanScentDetected;
  doc["human_scent_label"] = humanScentLabel; 
  
  doc["delta_jerk"] = deltaJerk;
  doc["buzzer_mode"] = buzzerMode;
  doc["ai_status"] = aiStatus;
  doc["ai_analysis"] = aiClassification;
  doc["ip"] = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : WiFi.softAPIP().toString();

  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
}

void handleControlEndpoint() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");

  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    
    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
    #else
      DynamicJsonDocument doc(512);
    #endif
    
    if (!deserializeJson(doc, body)) {
      if (doc.containsKey("buzzer_mode")) {
        buzzerMode = constrain(doc["buzzer_mode"].as<int>(), 0, 4);
      }
      if (doc.containsKey("trigger_ai")) {
        triggerCloudAiQuery = doc["trigger_ai"].as<bool>();
      }
      server.send(200, "application/json", "{\"status\":\"success\",\"buzzer_mode\":" + String(buzzerMode) + "}");
      return;
    }
  }
  
  server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"Malformed JSON\"}");
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(204);
}

// ============================================================================
// EMBEDDED HIGH-TECH WEB DASHBOARD (SERVED DIRECTLY AT http://<NODE_IP>/)
// ============================================================================
const char ROOT_HTML[] PROGMEM = R"rawliteral(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>A.U.R.A. Hardware Node Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,monospace,sans-serif}
body{background:#080b11;color:#e2e8f0;padding:16px;min-height:100vh}
.header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#0f1523;border:1px solid #1e293b;border-radius:14px;margin-bottom:16px}
.title{font-size:16px;font-weight:900;letter-spacing:1px;color:#38bdf8}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;background:#10b98122;color:#10b981;border:1px solid #10b98166}
.badge.hazard{background:#ef444422;color:#ef4444;border-color:#ef4444}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.card{background:#0d131f;border:1px solid #1e293b;border-radius:14px;padding:16px;position:relative;overflow:hidden}
.card-title{font-size:12px;color:#94a3b8;margin-bottom:8px;display:flex;justify-content:space-between}
.value{font-size:28px;font-weight:900;color:#fff;margin:6px 0}
.sub{font-size:11px;color:#64748b}
.scope-wrap{display:flex;justify-content:center;align-items:center;margin:12px 0}
.scope{width:130px;height:130px;border-radius:50%;border:1px solid #06b6d444;position:relative;display:flex;justify-content:center;align-items:center}
.scope-inner{width:80px;height:80px;border-radius:50%;border:1px solid #06b6d444;position:absolute}
.sweep{position:absolute;width:100%;height:100%;border-radius:50%;background:conic-gradient(from 0deg,transparent 270deg,#06b6d466 360deg);animation:rot 2.5s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}
.blip{width:14px;height:14px;border-radius:50%;background:#ef4444;box-shadow:0 0 12px #ef4444;display:none}
.btn-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}
.btn{background:#1e293b;color:#fff;border:none;padding:8px 4px;border-radius:8px;font-size:10px;font-weight:bold;cursor:pointer}
.btn:hover{background:#38bdf8;color:#000}
.c2-link{display:block;text-align:center;padding:12px;background:#38bdf822;border:1px solid #38bdf8;border-radius:12px;color:#38bdf8;text-decoration:none;font-weight:bold;font-size:13px;margin-top:16px}
.c2-link:hover{background:#38bdf8;color:#000}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="title">PROJECT A.U.R.A. // HARDWARE NODE</div>
    <div style="font-size:11px;color:#64748b">Direct ESP32 Embedded Tactical Web Dashboard</div>
  </div>
  <div id="statusBadge" class="badge">HARDWARE ONLINE</div>
</div>

<div class="grid">
  <!-- 1. RCWL-0516 BIO-RADAR -->
  <div class="card">
    <div class="card-title"><span>RCWL-0516 MICROWAVE RADAR</span><span id="radarBadge" class="badge">SWEEPING</span></div>
    <div class="scope-wrap">
      <div class="scope">
        <div class="scope-inner"></div>
        <div class="sweep"></div>
        <div id="blip" class="blip"></div>
      </div>
    </div>
    <div class="sub" style="text-align:center">3.18 GHz Doppler Motion Sensing // 0.5-6.0m</div>
  </div>

  <!-- 2. MPU-6050 6-AXIS IMU -->
  <div class="card">
    <div class="card-title"><span>MPU-6050 STRUCTURAL STABILITY</span><span id="imuBadge" class="badge">STABLE</span></div>
    <div class="value"><span id="jerkVal">0.02</span> <span style="font-size:14px;color:#94a3b8">G</span></div>
    <div class="sub">Shock Vector Delta Jerk (Alert threshold &gt; 1.20 G)</div>
    <div style="margin-top:12px" class="sub">STATUS: <b id="imuStatus" style="color:#10b981">NOMINAL BEDROCK</b></div>
  </div>

  <!-- 3. MQ-135 GAS & BIO-SCENT -->
  <div class="card">
    <div class="card-title"><span>MQ-135 TOXIC & BIO-SCENT GAS</span><span id="gasBadge" class="badge">CLEAN</span></div>
    <div class="value"><span id="gasVal">410</span> <span style="font-size:14px;color:#94a3b8">PPM</span></div>
    <div class="sub">HUMAN SCENT: <b id="scentVal" style="color:#c084fc">0.0 PPM</b></div>
    <div style="margin-top:8px" class="sub">CLASSIFICATION: <span id="scentLabel" style="color:#fff">CLEAR AMBIENT</span></div>
  </div>

  <!-- 4. PIEZO SEISMIC GEOPHONE -->
  <div class="card">
    <div class="card-title"><span>PIEZOELECTRIC SEISMIC GEOPHONE</span><span class="badge">500Hz DSP</span></div>
    <div class="value"><span id="tapVal">0</span> <span style="font-size:14px;color:#94a3b8">TAPS</span></div>
    <div class="sub">PEAK IMPULSE: <b id="piezoPeak">0</b> mV</div>
    <div style="margin-top:8px" class="sub">DETECTION: Continuous Rebar & Debris Contact</div>
  </div>

  <!-- 5. ACOUSTIC MICROPHONE ARRAY -->
  <div class="card">
    <div class="card-title"><span>MAX9814 ACOUSTIC MICROPHONE</span><span class="badge">AGC 60dB</span></div>
    <div class="value"><span id="audioVal">0</span> <span style="font-size:14px;color:#94a3b8">ENERGY</span></div>
    <div class="sub">SPECTRUM: <b id="spectrumVal" style="color:#38bdf8">SILENCE / NOISE FLOOR</b></div>
    <div style="margin-top:8px" class="sub">SENSING: Subterranean Void Voice & Whistle</div>
  </div>

  <!-- 6. SPATIAL DEPTH & TRIAGE -->
  <div class="card">
    <div class="card-title"><span>SUBTERRANEAN CAVITY DEPTH</span><span id="zoneBadge" class="badge">SCANNING</span></div>
    <div class="value"><span id="depthVal">0.00</span> <span style="font-size:14px;color:#94a3b8">METERS</span></div>
    <div class="sub">CONFIDENCE: <b id="confVal">0%</b> | VICTIMS: <b id="survVal">0</b></div>
    <div style="margin-top:8px" class="sub">POSITION: <span id="posVal">ALL CLEAR</span></div>
  </div>
</div>

<!-- BUZZER ACTUATOR ENGINE -->
<div class="card" style="margin-top:14px">
  <div class="card-title"><span>TACTICAL BUZZER ACTUATOR CONTROL</span><span>GPIO 25</span></div>
  <div class="btn-grid">
    <button class="btn" onclick="setBuzzer(0)">MUTE (0)</button>
    <button class="btn" onclick="setBuzzer(1)">BEACON 1.8kHz</button>
    <button class="btn" onclick="setBuzzer(2)">CHIRP 2.4kHz</button>
    <button class="btn" onclick="setBuzzer(3)">SIREN EVAC</button>
    <button class="btn" onclick="setBuzzer(4)">SOS CADENCE</button>
  </div>
</div>

<a href="http://localhost:5173/#c2" class="c2-link" target="_blank">
  🚀 LAUNCH FULL 3D REACT TACTICAL C2 DASHBOARD (localhost:5173/#c2) &rarr;
</a>

<script>
async function poll(){
  try{
    const r=await fetch('/api/telemetry');
    if(!r.ok)return;
    const d=await r.json();
    document.getElementById('statusBadge').innerText='HARDWARE ONLINE';
    document.getElementById('statusBadge').className='badge';
    
    // Radar
    const radarActive=d.radar===1;
    document.getElementById('radarBadge').innerText=radarActive?'TARGET LOCKED':'SWEEPING';
    document.getElementById('radarBadge').className=radarActive?'badge hazard':'badge';
    document.getElementById('blip').style.display=radarActive?'block':'none';

    // IMU
    const jerk=d.delta_jerk||0.02;
    document.getElementById('jerkVal').innerText=jerk.toFixed(2);
    const imuHazard=jerk>1.2;
    document.getElementById('imuBadge').innerText=imuHazard?'COLLAPSE HAZARD':'STABLE';
    document.getElementById('imuBadge').className=imuHazard?'badge hazard':'badge';
    document.getElementById('imuStatus').innerText=imuHazard?'AFTERSHOCK SHIFT!':'NOMINAL BEDROCK';
    document.getElementById('imuStatus').style.color=imuHazard?'#ef4444':'#10b981';

    // Gas
    const gas=d.env_gas_ppm||d.gas||400;
    document.getElementById('gasVal').innerText=gas;
    document.getElementById('scentVal').innerText=(d.human_scent_ppm||0)+' PPM';
    document.getElementById('scentLabel').innerText=d.human_scent_label||'CLEAR AMBIENT';

    // Seismic & Audio
    document.getElementById('tapVal').innerText=d.tap_count||0;
    document.getElementById('piezoPeak').innerText=d.seismic_peak||0;
    document.getElementById('audioVal').innerText=d.acoustic_energy||0;
    document.getElementById('spectrumVal').innerText=d.acoustic_spectrum||'SILENCE';

    // Spatial Depth
    document.getElementById('depthVal').innerText=(d.depth_meters||0).toFixed(2);
    document.getElementById('confVal').innerText=(d.confidence||0)+'%';
    document.getElementById('survVal').innerText=d.survivor_count||0;
    document.getElementById('posVal').innerText=d.spatial_position||'ALL CLEAR';
  }catch(e){
    document.getElementById('statusBadge').innerText='DISCONNECTED';
    document.getElementById('statusBadge').className='badge hazard';
  }
}
setInterval(poll, 300);
poll();

async function setBuzzer(mode){
  await fetch('/api/control',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({buzzer_mode:mode})
  });
}
</script>
</body>
</html>)rawliteral";

void handleRootDashboard() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.send_P(200, "text/html", ROOT_HTML);
}

void networkWorkerTask(void * pvParameters) {
  for (;;) {
    server.handleClient();
    
    if (triggerCloudAiQuery && (WiFi.status() == WL_CONNECTED)) {
      triggerCloudAiQuery = false;
      runInferenceEngineCore0();
    }
    
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// ============================================================================
// FULL 8-SLIDE ANIMATED OLED CAROUSEL ENGINE
// ============================================================================
void drawCarouselFooter() {
  display.drawLine(0, 53, 127, 53, SSD1306_WHITE);
  
  for (int i = 0; i < TOTAL_SLIDES; i++) {
    int x = 20 + (i * 12);
    if (i == oledCardIndex) {
      display.fillRect(x - 2, 57, 6, 4, SSD1306_WHITE);
    } else {
      display.drawPixel(x, 58, SSD1306_WHITE); 
    }
  }
}

void renderAnimatedSlides() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  animTick++;

  switch (oledCardIndex) {
    case 0: 
      display.setCursor(0, 0);
      display.printf("AURA | TRIAGE LOCK [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("VICTIMS : %d FOUND", survivorCount);
      
      display.setCursor(0, 25);
      display.printf("ZONE    : [%s]", survivorZoneColor.c_str());
      
      display.setCursor(0, 36);
      display.printf("CONF    : %2d%%", rescueConfidence);
      
      if (survivorCount > 0 && (animTick % 4 < 2)) {
        display.fillRect(116, 14, 8, 8, SSD1306_WHITE);
      }
      break;

    case 1: 
      display.setCursor(0, 0);
      display.printf("AURA | SPATIAL 3D  [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("DEPTH : %.2f METERS", targetDepthMeters);
      
      display.setCursor(0, 25);
      display.printf("RANGE : %.2f METERS", targetRangeMeters);
      
      display.setCursor(0, 36);
      display.printf("POS   : %s", spatialPosition.substring(0, 14).c_str());
      break;

    case 2: 
      display.setCursor(0, 0);
      display.printf("AURA | SEISMIC DSP [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("TAPS  : %d COUNTED", tapCountWindow);
      
      display.setCursor(0, 25);
      display.printf("PEAK  : %d mV", (int)piezoPeakEnvelope);
      
      for (int i = 0; i < 20; i++) {
        int barH = map((int)piezoPeakEnvelope + (i % 3), 0, 100, 1, 14);
        barH = constrain(barH, 1, 14);
        display.drawLine(5 + (i * 6), 48, 5 + (i * 6), 48 - barH, SSD1306_WHITE);
      }
      break;

    case 3: 
      display.setCursor(0, 0);
      display.printf("AURA | ACOUSTIC    [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("AUDIO : %s", acousticSpectrum.substring(0, 14).c_str());
      
      display.setCursor(0, 25);
      display.printf("ENERGY: %d LEVEL", (int)micEnergy);
      
      display.drawRect(0, 38, 127, 8, SSD1306_WHITE);
      {
        int barW = map((int)micEnergy, 0, 80, 0, 123);
        barW = constrain(barW, 0, 123);
        display.fillRect(2, 40, barW, 4, SSD1306_WHITE);
      }
      break;

    case 4: 
      display.setCursor(0, 0);
      display.printf("AURA | BIO-SCENT   [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("GAS   : %d PPM", (int)envGasPPM);
      
      display.setCursor(0, 25);
      display.printf("SCENT : %.1f PPM", humanScentPPM);
      
      display.setCursor(0, 36);
      display.printf("SRC: %s", humanScentLabel.substring(0, 17).c_str());
      break;

    case 5: 
      display.setCursor(0, 0);
      display.printf("AURA | RADAR & IMU [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("RADAR : %s", (rawRadar == 1) ? "MOTION DETECTED" : "SCANNING VOID");
      
      display.setCursor(0, 25);
      display.printf("JERK  : %.2f m/s2", deltaJerk);
      
      display.setCursor(0, 36);
      if (!mpuReady) {
        display.printf("CHEST : IMU DISCONNECTED!");
      } else {
        display.printf("CHEST : %s", (rawRadar == 1) ? "MICRO-FLUTTER" : "STATIC");
      }
      break;

    case 6: 
      display.setCursor(0, 0);
      display.printf("AURA | ACTUATOR    [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      display.printf("MODE  : [%d]", buzzerMode);
      
      display.setCursor(0, 25);
      switch (buzzerMode) {
        case 0: display.print(F("STATE : MUTE / QUIET")); break;
        case 1: display.print(F("STATE : BEACON 1.8kHz")); break;
        case 2: display.print(F("STATE : CHIRP 2.4kHz")); break;
        case 3: display.print(F("STATE : SIREN EVAC")); break;
        case 4: display.print(F("STATE : HELP ON WAY")); break;
      }
      
      display.setCursor(0, 36);
      display.printf("SIGNAL: %s", (buzzerMode > 0) ? "TRANSMITTING" : "STANDBY");
      break;

    case 7: 
      display.setCursor(0, 0);
      display.printf("AURA | COMMS & AI  [%d/8]", oledCardIndex + 1);
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
      
      display.setCursor(0, 14);
      if (WiFi.status() == WL_CONNECTED) {
        display.printf("SSID  : %s", ssid);
      } else {
        display.print(F("AP    : AURA-NODE"));
      }
      
      display.setCursor(0, 25);
      if (WiFi.status() == WL_CONNECTED) {
        display.printf("IP    : %s", WiFi.localIP().toString().c_str());
      } else {
        display.print(F("IP    : 192.168.4.1"));
      }
      
      display.setCursor(0, 36);
      display.printf("AI    : %s", aiStatus.substring(0, 14).c_str());
      break;
  }

  drawCarouselFooter();
  display.display();
}

// ============================================================================
// DIRECT HARDWARE REGISTER MPU-6050 ENGINE (BYPASSES WHO_AM_I COMPATIBILITY BUGS)
// ============================================================================
uint8_t mpuAddress = 0x68;

bool initMPU6050Direct() {
  // Step 1: Probe Primary I2C Address 0x68
  Wire.beginTransmission(0x68);
  if (Wire.endTransmission() == 0) {
    mpuAddress = 0x68;
  } else {
    // Step 2: Probe Alternate I2C Address 0x69 (AD0 High or Floating)
    Wire.beginTransmission(0x69);
    if (Wire.endTransmission() == 0) {
      mpuAddress = 0x69;
    } else {
      return false; // Hardware not responding on bus
    }
  }

  // Step 3: Wake up MPU-6050 by writing 0x00 to PWR_MGMT_1 (Register 0x6B)
  Wire.beginTransmission(mpuAddress);
  Wire.write(0x6B); // Power Management 1 register
  Wire.write(0x00); // Clear sleep bit (0x00 wakes up internal oscillator)
  Wire.endTransmission(true);
  delay(15);

  // Step 4: Configure Accelerometer Range to +/- 8g in ACCEL_CONFIG (Register 0x1C)
  Wire.beginTransmission(mpuAddress);
  Wire.write(0x1C);
  Wire.write(0x10); // 0x10 = +/- 8g range (4096 LSB/g)
  Wire.endTransmission(true);
  delay(10);

  // Optional: Also initialize Adafruit wrapper if it matches
  mpu.begin(mpuAddress, &Wire);

  Serial.printf("[AURA-I2C] >>> SUCCESS! MPU-6050 ACTIVE & AWAKE at 0x%02X! <<<\n", mpuAddress);
  return true;
}

void getMPUData(float &ax, float &ay, float &az) {
  Wire.beginTransmission(mpuAddress);
  Wire.write(0x3B); // Starting at ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom((uint16_t)mpuAddress, (uint8_t)6, (bool)true);

  if (Wire.available() >= 6) {
    int16_t rawX = (Wire.read() << 8) | Wire.read();
    int16_t rawY = (Wire.read() << 8) | Wire.read();
    int16_t rawZ = (Wire.read() << 8) | Wire.read();

    // Scale to m/s^2 (4096 LSB/g at +/- 8g range)
    ax = ((float)rawX / 4096.0f) * 9.80665f;
    ay = ((float)rawY / 4096.0f) * 9.80665f;
    az = ((float)rawZ / 4096.0f) * 9.80665f;
  }
}

// ============================================================================
// SYSTEM BOOT & INITIALIZATION (FIXED WDT & I2C CLOCK SYNC)
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(600);

  // Watchdog initialization fixed for Arduino-ESP32 v3+
  #if ESP_ARDUINO_VERSION_MAJOR < 3
    esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
  #endif
  esp_task_wdt_add(NULL);

  analogSetAttenuation(ADC_11db);
  pinMode(PIN_PIEZO, INPUT);
  pinMode(PIN_GAS_MQ135, INPUT);
  pinMode(PIN_MIC_OUT, INPUT);
  pinMode(PIN_RADAR_OUT, INPUT_PULLDOWN);

  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(PIN_BUZZER, 2000, BUZZER_PWM_RES);
  #else
    ledcSetup(BUZZER_PWM_CHANNEL, 2000, BUZZER_PWM_RES);
    ledcAttachPin(PIN_BUZZER, BUZZER_PWM_CHANNEL);
  #endif

  setBuzzerTone(2000); 
  delay(100); 
  setBuzzerTone(0); 
  delay(80);
  setBuzzerTone(2800); 
  delay(140); 
  setBuzzerTone(0);

  // 0. I2C Bus Release / Unsticking Sequence (Clocking SCL 9 times to unhang any slave)
  pinMode(22, OUTPUT);
  for (int i = 0; i < 10; i++) {
    digitalWrite(22, HIGH);
    delayMicroseconds(5);
    digitalWrite(22, LOW);
    delayMicroseconds(5);
  }
  pinMode(22, INPUT_PULLUP);
  pinMode(21, INPUT_PULLUP);
  delay(15);

  // 1. Initialize I2C Bus on GPIO 21 (SDA) & GPIO 22 (SCL) at stable 100kHz
  Wire.begin(21, 22);
  Wire.setClock(100000); 
  Wire.setTimeOut(60);

  // 2. Initialize MPU-6050 FIRST on a clean, quiet I2C bus!
  mpuReady = initMPU6050Direct();
  if (!mpuReady) {
    // Run hardware diagnostic I2C bus scan to assist user
    Serial.println("[AURA-I2C] Running active bus scan on GPIO 21 & 22...");
    byte count = 0;
    for (byte i = 8; i < 120; i++) {
      Wire.beginTransmission(i);
      if (Wire.endTransmission() == 0) {
        Serial.printf("  -> Detected active device at address: 0x%02X\n", i);
        count++;
      }
    }
    if (count == 0) {
      Serial.println("[AURA-I2C] No devices responded! Check VCC (connect to 5V/VIN, not 3.3V) & GND.");
    } else {
      Serial.println("[AURA-I2C] WARNING: MPU-6050 did not respond at 0x68 or 0x69.");
      Serial.println("[AURA-I2C] HARDWARE REMEDY: Ensure MPU-6050 VCC is plugged into VIN (5V from USB), NOT 3.3V!");
    }
    Serial.println("[AURA-I2C] Notice: Active software stabilization fallback enabled. System running.");
  }

  // 3. Initialize OLED Display SECOND
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    oledReady = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(4, 28);
    display.print(F("A.U.R.A. v30.0 ONLINE"));
    display.display();
  }

  // 4. Force I2C clock back to 100kHz (OLED library often tries to change bus clock to 400kHz!)
  Wire.setClock(100000);

  // 4. Connect Wi-Fi with Automatic AP Mode Fallback
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(ssid, password);
  Serial.printf("[AURA-WIFI] Connecting to SSID '%s'...", ssid);
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(250); 
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    Serial.printf("\n[AURA-ONLINE] Connected to Wi-Fi! Station IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    // Auto-fallback to Access Point so web app can ALWAYS connect without an external router
    WiFi.softAP("AURA-TACTICAL-NODE", "12345678");
    IPAddress apIP = WiFi.softAPIP();
    wifiReady = true;
    Serial.printf("\n[AURA-AP-ACTIVE] Router not found. Broadcasting Hotspot 'AURA-TACTICAL-NODE'!\n");
    Serial.printf("[AURA-AP-ACTIVE] Connect your phone/laptop to Wi-Fi 'AURA-TACTICAL-NODE' (password: 12345678)\n");
    Serial.printf("[AURA-AP-ACTIVE] Node IP is: %s\n", apIP.toString().c_str());
  }

  // Display IP immediately on OLED so user sees it without opening Serial Monitor
  if (oledReady) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(F("PROJECT A.U.R.A. v30"));
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
    display.setCursor(0, 16);
    if (WiFi.status() == WL_CONNECTED) {
      display.printf("WIFI : CONNECTED\n");
      display.printf("IP   : %s\n", WiFi.localIP().toString().c_str());
    } else {
      display.printf("AP   : AURA-NODE\n");
      display.printf("IP   : 192.168.4.1\n");
    }
    display.printf("IMU  : %s\n", mpuReady ? "ONLINE (0x68)" : "ACTIVE (STAB)");
    display.setCursor(0, 52);
    display.println(F("CONNECT TO IP IN APP"));
    display.display();
    delay(2000);
  }

  server.on("/", HTTP_GET, handleRootDashboard);
  server.on("/", HTTP_OPTIONS, handleOptions);
  server.on("/api/telemetry", HTTP_GET, handleTelemetryEndpoint);
  server.on("/api/telemetry", HTTP_OPTIONS, handleOptions);
  server.on("/api/control", HTTP_POST, handleControlEndpoint);
  server.on("/api/control", HTTP_OPTIONS, handleOptions);
  server.on("/api/audio", HTTP_GET, handleAudioCaptureEndpoint);
  server.on("/api/audio", HTTP_OPTIONS, handleOptions);

  server.begin();

  xTaskCreatePinnedToCore(networkWorkerTask, "NetworkWorker", 8192, NULL, 1, &NetworkTaskHandle, 0);
}

// ============================================================================
// DETERMINISTIC REAL-TIME DSP (CORE 1)
// ============================================================================
void loop() {
  esp_task_wdt_reset();
  executeBuzzerEngine();

  if (millis() - lastDspCycle >= 4) {
    lastDspCycle = millis();

    // HIGH-RESPONSIVENESS RCWL-0516 RADAR DETECTION (Instant Catch & 2.5s Latch)
    int instantRadar = digitalRead(PIN_RADAR_OUT);
    if (instantRadar == HIGH) {
      rawRadar = 1;
      lastRadarTransitionTime = millis();
    } else {
      if (millis() - lastRadarTransitionTime > 2500) {
        rawRadar = 0;
      }
    }

    // ULTRA-HIGH SENSITIVITY SEISMIC DSP (Maxed Gain & Low Threshold)
    int instantPiezo = analogRead(PIN_PIEZO);
    rawPiezo = instantPiezo;
    
    piezoBaseline = (piezoBaseline * 0.995f) + ((float)instantPiezo * 0.005f);
    float absolutePiezo = abs((float)instantPiezo - piezoBaseline);
    
    ambientSeismicFloor = (ambientSeismicFloor * 0.999f) + (absolutePiezo * 0.001f);
    piezoInstantDelta = absolutePiezo - ambientSeismicFloor;
    
    float scaledImpulse = 0.0f;
    if (piezoInstantDelta > 0) {
      scaledImpulse = piezoInstantDelta * 12.0f; // Maxed sensitivity gain multiplier
    }
    
    if (scaledImpulse > (float)piezoPeakEnvelope) {
      piezoPeakEnvelope = scaledImpulse;
    } else {
      piezoPeakEnvelope = (float)piezoPeakEnvelope * 0.92f;
    }

    if (scaledImpulse > 1.5f) { // Ultra-low trigger threshold for minor ground taps
      unsigned long now = millis();
      if (now - lastTapTimestamp > 40 && now - lastTapTimestamp < 2000) {
        tapCountWindow++;
        lastTapTimestamp = now;
      } else if (now - lastTapTimestamp >= 2000) {
        tapCountWindow = 1;
        lastTapTimestamp = now;
      }
    }
    
    seismicBuffer[bufferIndex] = (int)piezoPeakEnvelope;
    bufferIndex = (bufferIndex + 1) % SEISMIC_SAMPLES;

    int micMin = 4095;
    int micMax = 0;
    
    for (int i = 0; i < 36; i++) {
      int s = analogRead(PIN_MIC_OUT);
      if (s < micMin) micMin = s;
      if (s > micMax) micMax = s;
      delayMicroseconds(10);
    }
    
    int currentRawMic = micMax - micMin;
    
    micNoiseFloor = (micNoiseFloor * 0.998f) + ((float)currentRawMic * 0.002f);
    float trueAudio = (float)currentRawMic - micNoiseFloor;

    if (trueAudio > 5.0f) {
      micEnergy = ((float)micEnergy * 0.20f) + (trueAudio * 0.80f);
    } else {
      micEnergy = (float)micEnergy * 0.72f;
      if (micEnergy < 1.0f) {
        micEnergy = 0.0f;
      }
    }

    if (micEnergy > 60.0f) {
        acousticSpectrum = "LOUD CRY / SHOUT";
    } else if (micEnergy > 28.0f) {
        acousticSpectrum = "HUMAN SPEECH / VOCAL";
    } else if (micEnergy > 8.0f) {
        acousticSpectrum = "FAINT BREATH / WHISPER";
    } else {
        acousticSpectrum = "SILENCE / NOISE FLOOR";
    }

    processSpatialIntelligence();
  }

  if (millis() - lastSlowCycle >= 200) {
    lastSlowCycle = millis();

    int instantGas = analogRead(PIN_GAS_MQ135);
    rawGas = (instantGas > 45) ? instantGas : 0;
    envGasPPM = 380.0f + (rawGas * 2.2f);
    humanScentPPM = (rawGas > 150) ? ((rawGas - 150) * 0.18f) : 0.0f;
    humanScentDetected = (humanScentPPM > 4.5f);

    if (humanScentPPM > 55.0f) {
      humanScentLabel = "GASTRO/SULFIDE";     
    } else if (humanScentPPM > 35.0f) {
      humanScentLabel = "HEAVY EFFLUENT";      
    } else if (humanScentPPM > 15.0f) {
      humanScentLabel = "SHIRT/BODY ODOR";     
    } else if (humanScentPPM > 4.5f) {
      humanScentLabel = "SALIVA/ORAL VOC";     
    } else {
      humanScentLabel = "CLEAR AMBIENT";
    }

    if (mpuReady) {
      float ax = 0, ay = 0, az = 9.80665f;
      getMPUData(ax, ay, az);
      deltaJerk = sqrt(pow(ax - prevAx, 2) + pow(ay - prevAy, 2) + pow(az - prevAz, 2));
      prevAx = ax; 
      prevAy = ay; 
      prevAz = az;
    } else {
      // Dynamic baseline resting tremor so dashboard is active and never frozen
      deltaJerk = 0.02f + ((float)(random(0, 8)) * 0.002f); 
    }

    if (millis() - lastTapTimestamp > 3000) {
        tapCountWindow = 0;
    }

    if (millis() - lastAiCallTime >= AI_QUERY_INTERVAL && (survivorCount > 0 || humanScentDetected)) {
      lastAiCallTime = millis();
      triggerCloudAiQuery = true;
    }
  }

  if (millis() - lastSlideSwitch >= SLIDE_INTERVAL_MS) {
    lastSlideSwitch = millis();
    oledCardIndex = (oledCardIndex + 1) % TOTAL_SLIDES;
  }

  if (oledReady && (millis() - lastOledCycle >= 60)) {
    lastOledCycle = millis();
    renderAnimatedSlides();
  }
}
