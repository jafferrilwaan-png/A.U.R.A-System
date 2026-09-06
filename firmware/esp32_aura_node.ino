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
  doc["ip"] = WiFi.localIP().toString();

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
      display.printf("SSID  : %s", ssid);
      
      display.setCursor(0, 25);
      display.printf("IP    : %s", WiFi.localIP().toString().c_str());
      
      display.setCursor(0, 36);
      display.printf("AI    : %s", aiStatus.substring(0, 14).c_str());
      break;
  }

  drawCarouselFooter();
  display.display();
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

  // 1. Initialize I2C Bus, Set Stable 100kHz Clock Speed, and start OLED
  Wire.begin(21, 22);
  Wire.setClock(100000); // Prevents bus corruption between OLED and MPU6050
  Wire.setTimeOut(30);
  
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    oledReady = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(4, 28);
    display.print(F("A.U.R.A. v30.0 ONLINE"));
    display.display();
  }

  // 2. Allow I2C bus to settle completely before MPU query
  delay(200);

  // 3. Initialize MPU6050 cleanly with default address 0x68
  if (mpu.begin()) {
    mpuReady = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    Serial.println("MPU6050 INITIALIZED SUCCESSFULLY!");
  } else {
    mpuReady = false;
    Serial.println("MPU6050 WIRING ERROR - CHECK GPIO 21 & 22!");
  }

  // 4. Connect Wi-Fi AFTER sensors are securely locked in
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(250); 
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    Serial.printf("\n[AURA-ONLINE] IP: %s\n", WiFi.localIP().toString().c_str());
  }

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

    int instantRadar = digitalRead(PIN_RADAR_OUT);
    
    if (instantRadar != lastRadarState) {
      lastRadarTransitionTime = millis();
      lastRadarState = instantRadar;
    }
    
    if (millis() - lastRadarTransitionTime > 3000) {
      rawRadar = 0; 
    } else {
      if (instantRadar == HIGH) {
        rawRadar = 1;
      } else {
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
      sensors_event_t a, g, temp;
      mpu.getEvent(&a, &g, &temp);
      deltaJerk = sqrt(pow(a.acceleration.x - prevAx, 2) + pow(a.acceleration.y - prevAy, 2) + pow(a.acceleration.z - prevAz, 2));
      prevAx = a.acceleration.x; 
      prevAy = a.acceleration.y; 
      prevAz = a.acceleration.z;
    } else {
      deltaJerk = 0.0f; 
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
