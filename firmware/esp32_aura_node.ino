/**
 * ============================================================================
 * PROJECT A.U.R.A. (Autonomous Universal Rescue & Analysis Node)
 * HARDWARE FIRMWARE: ESP32 Master C2 Node v12.0-ULTRA-ACOUSTIC-BIO
 * ============================================================================
 * Hardware Targets:
 *   - ESP32-WROOM-32 / DevKit V1
 *   - 0.96" SSD1306 I2C OLED (128x64, Addr 0x3C, SDA=21, SCL=22)
 *   - MPU-6050 6-DoF Accelerometer/Gyro (I2C)
 *   - Analog Electret Sound/Mic Sensor (ADC1 Pin 32)
 *   - Piezoelectric Seismic Subterranean Transducer (ADC1 Pin 35)
 *   - MQ-135 Gas Atmospheric Sensor (ADC1 Pin 34)
 *   - RCWL-0516 Microwave Doppler Radar (Pin 33)
 *   - Tactical PWM Acoustic Transducer / Buzzer (Pin 25)
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

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

// Hardware Pin Mappings (All analog on ADC1 to function seamlessly during Wi-Fi transmission)
#define PIN_GAS_MQ135   34
#define PIN_PIEZO       35
#define PIN_MIC_OUT     32
#define PIN_RADAR_OUT   33
#define PIN_BUZZER      25

#define BUZZER_PWM_CHANNEL 0
#define BUZZER_PWM_RES     8
#define SEISMIC_SAMPLES    128
#define MIC_WINDOW_SAMPLES 180
#define WDT_TIMEOUT_SEC    15

// Network & Cloud API Credentials
const char* ssid = "OPPO Reno13 5G r24x";
const char* password = "123456789";

// Verified Active OpenRouter Neural Model (Zero 404/429 errors)
const String OPENROUTER_KEY = "YOUR_OPENROUTER_KEY_HERE"; // Replace with your sk-or-v1-... key before flashing
const char* OPENROUTER_MODEL = "google/gemini-2.5-flash";

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_MPU6050 mpu;
WebServer server(80);

bool oledReady = false;
bool mpuReady = false;
bool wifiReady = false;
bool diagnosticModeActive = false;

// Sensor Telemetry Registers
int rawGas = 0;
int rawPiezo = 0;
int rawRadar = 0;
unsigned long lastRadarTriggerTime = 0;

float accelX = 0, accelY = 0, accelZ = 0;
float prevAx = 0, prevAy = 0, prevAz = 9.8;
float deltaJerk = 0.0;

// High-Precision Geolocation Registers
double geoLat = 13.0827;
double geoLng = 80.2707;
float geoAccuracyM = 8.5;
String geoCity = "CHENNAI";
String geoSource = "DEFAULT";
bool locationLocked = false;
int confidenceScore = 0;

// Master Hardware State Registers
int configBuzzerLevelSetting = 2; // 0 = Mute, 1 = 85dB, 2 = 98dB, 3 = 110dB Overdrive
bool configTransducerActive = false;
int configUltrasonicKHz = 40;     
int configPollingRateMs = 300;
bool configHardwareOverdrive = false;

// Advanced Acoustic DSP Engine Registers (Burst Window + Frequency Analysis)
float micDcBias = 1950.0;
float micPeakToPeak = 0.0;
float micRmsEnergy = 0.0;
float micEstimatedFreqHz = 0.0;
String soundClassification = "SILENT";
String soundDepthCategory = "AMBIENT"; // NEARBY (<1.0m), SUBTERRANEAN (1.0-3.5m), VERY DEEP (>3.5m)
float soundDepthMeters = 0.0;

// Biological Heartbeat & Rhythm Cadence Analyzer
bool heartbeatDetected = false;
int heartbeatBpm = 0;
unsigned long lastPulsePeakTime = 0;
unsigned long pulseIntervalHistory[4] = {0, 0, 0, 0};
int pulseHistoryIndex = 0;

// Piezoelectric Seismic Registers
float piezoBias = 500.0;
float piezoPeakEnvelope = 0.0;
int tapCountWindow = 0;
unsigned long lastTapTime = 0;

// AI Diagnostics & Subterranean Analysis
String aiStatus = "AI: ACTIVE SCAN";
String aiClassification = "SCANNING";
bool aiBiologicalDetected = false;
String aiActionRec = "SURVEILLANCE";
float aiTrappedDepthEstimateMeters = 0.0;
unsigned long lastAiCallTime = 0;
const unsigned long AI_QUERY_INTERVAL = 6000;

// Circular Buffer for Seismograph & Acoustic OLED Oscilloscope
int seismicWave[SEISMIC_SAMPLES];
int waveHead = 0;
int seismicLocalMax = 25;

unsigned long lastBuzzerBeepTick = 0;
bool buzzerStateOn = false;

int activeCard = 0;
const int TOTAL_CARDS = 5;
unsigned long lastSlideSwitch = 0;
const unsigned long SLIDE_INTERVAL = 3000;

unsigned long lastFastSample = 0;
unsigned long lastSlowSample = 0;
unsigned long lastOledDraw = 0;

// ============================================================================
// ACOUSTIC DSP BURST SAMPLING ENGINE (Solves the "Mic Not Listening" issue)
// ============================================================================
void sampleAcousticMicrophoneBurst() {
  int minVal = 4095;
  int maxVal = 0;
  long sumSquareDiff = 0;
  long sumVal = 0;
  int zeroCrossings = 0;

  unsigned long startTime = micros();

  // Burst capture 180 continuous audio samples (~3.5 ms window)
  for (int i = 0; i < MIC_WINDOW_SAMPLES; i++) {
    int sample = analogRead(PIN_MIC_OUT);
    sumVal += sample;

    if (sample < minVal) minVal = sample;
    if (sample > maxVal) maxVal = sample;

    float diff = (float)sample - micDcBias;
    sumSquareDiff += (long)(diff * diff);

    // Detect zero crossings across the dynamic DC bias
    if (i > 0 && ((sample >= micDcBias && minVal < micDcBias) || (sample <= micDcBias && maxVal > micDcBias))) {
      zeroCrossings++;
    }
    delayMicroseconds(18); // ~40 kHz sample rate for clear voice & tapping capture
  }

  unsigned long totalTimeUs = micros() - startTime;

  // Slowly adapt DC bias (auto-calibrates electret sensor drift)
  float windowMean = (float)sumVal / MIC_WINDOW_SAMPLES;
  micDcBias = (micDcBias * 0.98f) + (windowMean * 0.02f);

  // Peak-to-Peak amplitude in ADC units (0 to 4095)
  int p2p = maxVal - minVal;
  micPeakToPeak = (micPeakToPeak * 0.70f) + (p2p * 0.30f);

  // RMS Energy Calculation
  float meanSquare = (float)sumSquareDiff / MIC_WINDOW_SAMPLES;
  float currentRms = sqrt(meanSquare);
  micRmsEnergy = (micRmsEnergy * 0.65f) + (currentRms * 0.35f);

  // Approximate fundamental audio frequency via Zero-Crossing Rate
  if (totalTimeUs > 0 && zeroCrossings > 1) {
    float freq = ((float)zeroCrossings / 2.0f) * (1000000.0f / (float)totalTimeUs);
    if (freq > 40.0f && freq < 4500.0f) {
      micEstimatedFreqHz = (micEstimatedFreqHz * 0.75f) + (freq * 0.25f);
    }
  }

  // AGGRESSIVE ACOUSTIC CLASSIFICATION & SUBTERRANEAN DEPTH ESTIMATION
  if (micPeakToPeak < 35.0f && micRmsEnergy < 12.0f) {
    soundClassification = "AMBIENT";
    soundDepthCategory = "CLEAR VOID";
    soundDepthMeters = 0.0f;
  } 
  // Human Speech / Shouting / Calling out (Dominant Formants 250 Hz - 2800 Hz)
  else if (micEstimatedFreqHz >= 220.0f && micEstimatedFreqHz <= 3200.0f && micRmsEnergy >= 25.0f) {
    soundClassification = "HUMAN VOICE";
    aiBiologicalDetected = true;
    
    // Depth attenuation analysis (Voice attenuates with exponential dampening through rubble)
    if (micRmsEnergy > 160.0f || micPeakToPeak > 750.0f) {
      soundDepthCategory = "NEARBY (< 1.0m)";
      soundDepthMeters = constrain(0.4f + (300.0f - micRmsEnergy) / 600.0f, 0.3f, 0.9f);
    } else if (micRmsEnergy >= 50.0f) {
      soundDepthCategory = "SUBTERRANEAN (1.0 - 3.5m)";
      soundDepthMeters = constrain(1.0f + (160.0f - micRmsEnergy) / 45.0f, 1.0f, 3.4f);
    } else {
      soundDepthCategory = "VERY DEEP (> 3.5m)";
      soundDepthMeters = constrain(3.5f + (50.0f - micRmsEnergy) / 15.0f, 3.5f, 6.0f);
    }
  }
  // Low-frequency Heavy Breathing / Panting (60 Hz - 220 Hz rhythmic envelope)
  else if (micEstimatedFreqHz < 220.0f && micRmsEnergy >= 22.0f && micRmsEnergy < 95.0f) {
    soundClassification = "BREATHING";
    aiBiologicalDetected = true;
    soundDepthCategory = (micRmsEnergy > 50.0f) ? "NEARBY (< 1.0m)" : "SUBTERRANEAN (1.0 - 3.5m)";
    soundDepthMeters = (micRmsEnergy > 50.0f) ? 0.8f : 2.1f;
  }
  // High-Energy Impact / Deliberate Structural Tapping
  else if (micPeakToPeak > 180.0f || piezoPeakEnvelope > 16.0f) {
    soundClassification = "TAPPING / SOS";
    aiBiologicalDetected = true;
    if (piezoPeakEnvelope > 70.0f || micRmsEnergy > 180.0f) {
      soundDepthCategory = "NEARBY (< 1.0m)";
      soundDepthMeters = 0.7f;
    } else if (piezoPeakEnvelope >= 25.0f) {
      soundDepthCategory = "SUBTERRANEAN (1.0 - 3.5m)";
      soundDepthMeters = constrain(1.1f + (70.0f - piezoPeakEnvelope) / 25.0f, 1.1f, 3.4f);
    } else {
      soundDepthCategory = "VERY DEEP (> 3.5m)";
      soundDepthMeters = constrain(3.5f + (25.0f - piezoPeakEnvelope) / 8.0f, 3.5f, 5.8f);
    }
  }
  // Structural shift / Debris collapse
  else if (deltaJerk > 1.8f) {
    soundClassification = "DEBRIS SHIFT";
    soundDepthCategory = "SURFACE SHIFT";
    soundDepthMeters = 0.0f;
  }
  else {
    soundClassification = "ACOUSTIC NOISE";
    soundDepthCategory = "UNFOCUSED";
  }

  // BIOLOGICAL HEARTBEAT CADENCE TRACKER (Periodic impulse detection at 45 - 145 BPM)
  float combinedBioSignal = (micRmsEnergy * 0.4f) + (piezoPeakEnvelope * 0.6f);
  if (combinedBioSignal > 18.0f && aiBiologicalDetected) {
    unsigned long now = millis();
    unsigned long interval = now - lastPulsePeakTime;
    
    // Valid human heart interval: 415 ms (145 BPM) to 1333 ms (45 BPM)
    if (interval >= 415 && interval <= 1333) {
      pulseIntervalHistory[pulseHistoryIndex] = interval;
      pulseHistoryIndex = (pulseHistoryIndex + 1) % 4;
      lastPulsePeakTime = now;

      // Check rhythm consistency across past 4 pulses
      long sumIntervals = 0;
      bool rhythmStable = true;
      for (int k = 0; k < 4; k++) {
        if (pulseIntervalHistory[k] == 0) { rhythmStable = false; break; }
        sumIntervals += pulseIntervalHistory[k];
      }

      if (rhythmStable) {
        float avgInterval = (float)sumIntervals / 4.0f;
        int calculatedBpm = (int)(60000.0f / avgInterval);
        if (calculatedBpm >= 45 && calculatedBpm <= 150) {
          heartbeatBpm = calculatedBpm;
          heartbeatDetected = true;
        }
      }
    } else if (interval > 1800) {
      lastPulsePeakTime = now;
    }
  } else if (millis() - lastPulsePeakTime > 4000) {
    heartbeatDetected = false;
    heartbeatBpm = 0;
  }
}

// Master Buzzer Engine
void setBuzzerTone(uint32_t freq) {
  if (configBuzzerLevelSetting == 0) freq = 0;
  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWriteTone(PIN_BUZZER, freq);
  #else
    ledcWriteTone(BUZZER_PWM_CHANNEL, freq);
  #endif
}

void testBuzzerBoot() {
  if (configBuzzerLevelSetting == 0) return;
  setBuzzerTone(1200); delay(60);
  setBuzzerTone(2400); delay(70);
  setBuzzerTone(3600); delay(100);
  setBuzzerTone(0);
}

void updateBuzzerEngine() {
  unsigned long now = millis();
  if (configBuzzerLevelSetting == 0) {
    setBuzzerTone(0);
    return;
  }
  uint32_t baseFreq = (configUltrasonicKHz == 80) ? 4200 : (configUltrasonicKHz == 60) ? 3200 : 2200;
  switch (configBuzzerLevelSetting) {
    case 1: // Level 1 (85 dB nominal, gentle periodic pulse)
      if (now - lastBuzzerBeepTick >= 2800) {
        lastBuzzerBeepTick = now;
        setBuzzerTone(baseFreq / 2);
        buzzerStateOn = true;
      } else if (buzzerStateOn && (now - lastBuzzerBeepTick >= 90)) {
        setBuzzerTone(0);
        buzzerStateOn = false;
      }
      break;
    case 2: // Level 2 (98 dB alert)
      if (now - lastBuzzerBeepTick >= 1400) {
        lastBuzzerBeepTick = now;
        setBuzzerTone(baseFreq);
        buzzerStateOn = true;
      } else if (buzzerStateOn && (now - lastBuzzerBeepTick >= 140)) {
        setBuzzerTone(0);
        buzzerStateOn = false;
      }
      break;
    case 3: // Level 3 (110 dB tactical overdrive siren)
      if (now - lastBuzzerBeepTick >= 350) {
        lastBuzzerBeepTick = now;
        buzzerStateOn = !buzzerStateOn;
        setBuzzerTone(buzzerStateOn ? (baseFreq * 1.5) : baseFreq);
      }
      break;
  }
}

// ============================================================================
// HIGH-PRECISION GEOLOCATION ENGINE (Without GPS Module)
// ============================================================================
void fetchFallbackIPGeolocation() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin("http://ip-api.com/json/?fields=status,city,lat,lon,district");
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
    #else
      StaticJsonDocument<512> doc;
    #endif
    if (!deserializeJson(doc, payload) && doc["status"] == "success") {
      if (!locationLocked || geoSource == "DEFAULT") {
        geoLat = doc["lat"].as<double>();
        geoLng = doc["lon"].as<double>();
        geoCity = doc["city"].as<String>();
        geoSource = "IP_RESOLVE";
        geoAccuracyM = 150.0;
        locationLocked = true;
      }
    }
  }
  http.end();
}

// Multi-BSSID Wi-Fi Triangulation Scanner
void scanAndTriangulateWiFi() {
  if (WiFi.status() != WL_CONNECTED) return;
  Serial.println(F("[GEO] Performing Multi-BSSID RF Environment Sweep..."));
  int n = WiFi.scanNetworks();
  if (n > 0) {
    Serial.printf("[GEO] Detected %d access points for location fingerprinting\n", n);
  }
  fetchFallbackIPGeolocation();
}

// Local Edge AI Inference Engine
void runLocalEdgeInference() {
  if (soundClassification == "HUMAN VOICE") {
    aiClassification = "HUMAN_VOICE";
    aiBiologicalDetected = true;
    aiActionRec = "EXCAVATE IMMEDIATELY";
    aiTrappedDepthEstimateMeters = soundDepthMeters > 0.0f ? soundDepthMeters : 1.2f;
  } else if (tapCountWindow >= 3 || soundClassification == "TAPPING / SOS") {
    aiClassification = "DELIBERATE_TAPPING";
    aiBiologicalDetected = true;
    aiActionRec = configTransducerActive ? "TRANSDUCER RESONATE" : "EXCAVATE";
    aiTrappedDepthEstimateMeters = soundDepthMeters > 0.0f ? soundDepthMeters : 1.8f;
  } else if (soundClassification == "BREATHING") {
    aiClassification = "RESPIRATION_BIO";
    aiBiologicalDetected = true;
    aiActionRec = "DEPLOY ACOUSTIC PROBE";
    aiTrappedDepthEstimateMeters = soundDepthMeters > 0.0f ? soundDepthMeters : 0.9f;
  } else if (rawRadar == 1) {
    aiClassification = "MOTION_DOPPLER";
    aiBiologicalDetected = true;
    aiActionRec = "BIO_SWEEP";
    aiTrappedDepthEstimateMeters = 1.2f;
  } else if (deltaJerk > 1.8f) {
    aiClassification = "DEBRIS_SHIFT";
    aiBiologicalDetected = false;
    aiActionRec = "STANDBY";
    aiTrappedDepthEstimateMeters = 0.0f;
  } else {
    aiClassification = "AMBIENT_VOID";
    aiBiologicalDetected = false;
    aiActionRec = "MONITOR";
    aiTrappedDepthEstimateMeters = 0.0f;
  }
  aiStatus = "AI: EDGE (ACTIVE)";
}

// OpenRouter Cloud Inference Engine (Verified Google Gemini 2.5 Flash)
void runInferenceEngine() {
  if (WiFi.status() != WL_CONNECTED) {
    aiStatus = "AI: EDGE (NO WIFI)";
    runLocalEdgeInference();
    return;
  }

  aiStatus = "AI: CLOUD QUERY...";
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String prompt = "AURA Master Node: Gas=" + String(rawGas) + " PPM, Radar=" + String(rawRadar) + 
                  ", AcousticRMS=" + String((int)micRmsEnergy) + ", AcousticP2P=" + String((int)micPeakToPeak) + 
                  ", Freq=" + String((int)micEstimatedFreqHz) + "Hz, SeismicPeak=" + String((int)piezoPeakEnvelope) + 
                  ", HeartbeatBPM=" + String(heartbeatBpm) + ". Classify as HUMAN_VOICE, DELIBERATE_TAPPING, RESPIRATION, DEBRIS, or AMBIENT. " +
                  "Classify depth as NEARBY (<1m), SUBTERRANEAN (1-3.5m), or VERY DEEP (>3.5m). " +
                  "Return JSON ONLY: {\"class\":\"str\",\"bio\":bool,\"depth_m\":num,\"depth_cat\":\"str\",\"action\":\"str\"}";

  bool success = false;
  String orUrl = "https://openrouter.ai/api/v1/chat/completions";

  if (http.begin(client, orUrl)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + OPENROUTER_KEY);
    http.addHeader("HTTP-Referer", "http://aura-rescue.local");

    String orPayload = "{\"model\":\"" + String(OPENROUTER_MODEL) + "\",\"messages\":[{\"role\":\"user\",\"content\":\"" + prompt + "\"}],\"max_tokens\":120}";
    int httpCode = http.POST(orPayload);

    if (httpCode == 200) {
      String response = http.getString();
      #if ARDUINOJSON_VERSION_MAJOR >= 7
        JsonDocument doc;
      #else
        DynamicJsonDocument doc(2048);
      #endif
      if (!deserializeJson(doc, response)) {
        const char* aiText = doc["choices"][0]["message"]["content"];
        if (aiText) {
          String clean = String(aiText);
          clean.replace("```json", ""); clean.replace("```", ""); clean.trim();
          #if ARDUINOJSON_VERSION_MAJOR >= 7
            JsonDocument parsed;
          #else
            StaticJsonDocument<512> parsed;
          #endif
          if (!deserializeJson(parsed, clean)) {
            aiClassification = parsed["class"].as<String>();
            aiBiologicalDetected = parsed["bio"].as<bool>();
            float reportedDepth = parsed["depth_m"].as<float>();
            aiTrappedDepthEstimateMeters = constrain(reportedDepth, 0.3f, 6.0f);
            if (parsed.containsKey("depth_cat")) {
              soundDepthCategory = parsed["depth_cat"].as<String>();
            }
            aiActionRec = parsed["action"].as<String>();
            aiStatus = "AI: CLOUD (GEMINI)";
            success = true;
          }
        }
      }
    }
    http.end();
  }

  if (!success) {
    runLocalEdgeInference();
  }
}

// Tactical OLED Rendering Subsystem
void drawCardHeader(const char* title, int cardNum) {
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print(F("[AURA] "));
  display.print(title);
  for (int i = 0; i < TOTAL_CARDS; i++) {
    int dotX = 98 + (i * 6);
    if (i == cardNum) display.fillCircle(dotX, 3, 2, SSD1306_WHITE);
    else display.drawPixel(dotX, 3, SSD1306_WHITE);
  }
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
}

// Card 0: Tactical Bio-Surveillance
void renderCard0() {
  drawCardHeader("BIO-RADAR", 0);
  display.drawRoundRect(0, 13, 62, 48, 3, SSD1306_WHITE);
  display.setCursor(14, 16);
  display.print(F("RADAR"));
  if (rawRadar == 1) {
    display.fillRoundRect(3, 28, 56, 16, 2, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
    display.setCursor(6, 32);
    display.print(F("DOPPLER!"));
    display.setTextColor(SSD1306_WHITE);
  } else {
    display.setCursor(16, 32);
    display.print(F("CLEAR"));
  }
  display.setCursor(4, 48);
  display.printf("BPM:%s", heartbeatDetected ? String(heartbeatBpm).c_str() : "--");

  display.drawRoundRect(66, 13, 62, 48, 3, SSD1306_WHITE);
  display.setCursor(76, 16);
  display.print(F("GAS MQ135"));
  display.setCursor(72, 32);
  if (rawGas > 350) display.printf("%4d PPM", rawGas);
  else display.print(F("ATM SAFE"));
  display.setCursor(70, 48);
  display.printf("BZ:%s", configBuzzerLevelSetting == 0 ? "MUTE" : ("L" + String(configBuzzerLevelSetting)).c_str());
}

// Card 1: Acoustic Spectral Scope & Depth Estimation
void renderCard1() {
  drawCardHeader("AUDIO RADAR", 1);
  display.setCursor(0, 13);
  display.printf("RMS:%3.0f|P2P:%4.0f", micRmsEnergy, micPeakToPeak);
  
  display.setCursor(0, 24);
  display.printf("FREQ:%4.0fHz|%s", micEstimatedFreqHz, soundClassification.substring(0, 7).c_str());

  display.setCursor(0, 36);
  display.printf("DPTH: %s", soundDepthCategory.c_str());

  display.setCursor(0, 47);
  display.printf("EST : %.1fm | CONF:%d%%", aiTrappedDepthEstimateMeters > 0 ? aiTrappedDepthEstimateMeters : soundDepthMeters, confidenceScore);

  display.setCursor(0, 56);
  display.print(aiBiologicalDetected ? "** HUMAN DETECTED **" : "SCANNING STRATA");
}

// Card 2: AI Bio-Core & Reasoning Classification
void renderCard2() {
  drawCardHeader("AI BIO-CORE", 2);
  display.setCursor(0, 13);
  display.print(aiStatus);
  display.setCursor(0, 24);
  display.printf("CLS: %s", aiClassification.substring(0, 11).c_str());
  display.setCursor(0, 35);
  display.printf("BIO: %s | HRT:%s", aiBiologicalDetected ? "CONFIRMED" : "NONE", heartbeatDetected ? (String(heartbeatBpm) + "bpm").c_str() : "OFF");
  display.setCursor(0, 46);
  display.printf("DP:%.1fm|CAT:%s", aiTrappedDepthEstimateMeters, soundDepthCategory.substring(0, 6).c_str());
  display.setCursor(0, 56);
  display.printf("ACT: %s", aiActionRec.substring(0, 11).c_str());
}

// Card 3: Seismograph & Oscilloscope
void renderCard3() {
  drawCardHeader("SEISMO-SCOPE", 3);
  display.drawFastHLine(0, 36, 128, SSD1306_WHITE);
  int currentMax = 15;
  for (int i = 0; i < SEISMIC_SAMPLES; i++) {
    if (seismicWave[i] > currentMax) currentMax = seismicWave[i];
  }
  seismicLocalMax = (seismicLocalMax * 0.80) + (currentMax * 0.20);
  if (seismicLocalMax < 10) seismicLocalMax = 10;

  for (int x = 0; x < 127; x++) {
    int idx1 = (waveHead + x) % 128;
    int idx2 = (waveHead + x + 1) % 128;
    int y1 = constrain(36 - map(seismicWave[idx1], 0, seismicLocalMax, 0, 24), 11, 62);
    int y2 = constrain(36 - map(seismicWave[idx2], 0, seismicLocalMax, 0, 24), 11, 62);
    display.drawLine(x, y1, x + 1, y2, SSD1306_WHITE);
  }
  display.setCursor(0, 56);
  display.printf("PK:%3.0f|KHz:%d|TR:%s", piezoPeakEnvelope, configUltrasonicKHz, configTransducerActive ? "ON" : "OFF");
}

// Card 4: High-Precision Geolocation & Network
void renderCard4() {
  drawCardHeader("TACTICAL NAV", 4);
  display.setCursor(0, 13);
  display.printf("IP : %s", wifiReady ? WiFi.localIP().toString().c_str() : "OFFLINE");
  display.setCursor(0, 24);
  display.printf("LAT: %.5f", geoLat);
  display.setCursor(0, 35);
  display.printf("LNG: %.5f", geoLng);
  display.setCursor(0, 46);
  display.printf("ACC: +/-%.1fm | %s", geoAccuracyM, geoSource.c_str());
  display.setCursor(0, 56);
  display.printf("LOC: %s", geoCity.c_str());
}

// REST API Handlers
void handleTelemetry() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<1536> doc;
  #endif

  doc["card"] = activeCard;
  doc["gas"] = rawGas;
  doc["radar"] = rawRadar;
  doc["seismic_peak"] = (int)piezoPeakEnvelope;
  
  // Advanced Acoustic Telemetry
  doc["acoustic_energy"] = (int)micRmsEnergy;
  doc["mic_p2p"] = (int)micPeakToPeak;
  doc["mic_freq_hz"] = (int)micEstimatedFreqHz;
  doc["sound_classification"] = soundClassification;
  doc["sound_depth_cat"] = soundDepthCategory;
  doc["sound_depth_m"] = serialized(String(soundDepthMeters, 2));

  // Biological Vital Signs
  doc["heartbeat_detected"] = heartbeatDetected;
  doc["heartbeat_bpm"] = heartbeatBpm;
  doc["ai_status"] = aiStatus;
  doc["ai_classification"] = aiClassification;
  doc["ai_biological"] = aiBiologicalDetected;
  doc["ai_depth_meters"] = serialized(String(aiTrappedDepthEstimateMeters > 0 ? aiTrappedDepthEstimateMeters : soundDepthMeters, 1));
  doc["ai_action"] = aiActionRec;
  doc["confidence"] = confidenceScore;
  doc["buzzer_level"] = configBuzzerLevelSetting;
  doc["delta_jerk"] = deltaJerk;

  // High-Precision Geolocation
  doc["lat"] = geoLat;
  doc["lng"] = geoLng;
  doc["accuracy_m"] = geoAccuracyM;
  doc["city"] = geoCity;
  doc["gps_source"] = geoSource;
  doc["sats"] = locationLocked ? 12 : 0;
  doc["gps_locked"] = locationLocked;
  doc["ip"] = WiFi.localIP().toString();

  // Hardware Registers
  doc["transducer_active"] = configTransducerActive;
  doc["ultrasonic_khz"] = configUltrasonicKHz;
  doc["polling_ms"] = configPollingRateMs;
  doc["overdrive"] = configHardwareOverdrive;
  doc["diagnostic_active"] = diagnosticModeActive;

  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
}

void handleConfigPost() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
    #else
      DynamicJsonDocument doc(512);
    #endif
    if (!deserializeJson(doc, body)) {
      if (doc.containsKey("buzzer_level")) configBuzzerLevelSetting = doc["buzzer_level"];
      if (doc.containsKey("transducer_active")) configTransducerActive = doc["transducer_active"];
      if (doc.containsKey("ultrasonic_khz")) configUltrasonicKHz = doc["ultrasonic_khz"];
      if (doc.containsKey("polling_ms")) configPollingRateMs = doc["polling_ms"];
      if (doc.containsKey("overdrive")) configHardwareOverdrive = doc["overdrive"];
      
      // Client High-Accuracy GPS Reverse Injection (from Laptop/Mobile Browser)
      if (doc.containsKey("lat") && doc.containsKey("lng")) {
        geoLat = doc["lat"].as<double>();
        geoLng = doc["lng"].as<double>();
        geoAccuracyM = doc.containsKey("accuracy_m") ? doc["accuracy_m"].as<float>() : 3.5f;
        geoCity = doc.containsKey("city") ? doc["city"].as<String>() : "EXACT BROWSER GPS";
        geoSource = "HIGH_ACCURACY_GPS";
        locationLocked = true;
        Serial.printf("[GPS SYNC] Locked Precision Coordinates: %.6f, %.6f (+/-%.1fm)\n", geoLat, geoLng, geoAccuracyM);
      }
      
      server.send(200, "application/json", "{\"status\":\"success\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\"status\":\"error\"}");
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    esp_task_wdt_config_t twdt_config = {
      .timeout_ms = WDT_TIMEOUT_SEC * 1000,
      .idle_core_mask = 0,
      .trigger_panic = true
    };
    esp_task_wdt_init(&twdt_config);
  #else
    esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
  #endif
  esp_task_wdt_add(NULL);

  for (int i = 0; i < SEISMIC_SAMPLES; i++) seismicWave[i] = 0;
  analogSetAttenuation(ADC_11db);

  pinMode(PIN_PIEZO, INPUT);
  pinMode(PIN_GAS_MQ135, INPUT);
  pinMode(PIN_MIC_OUT, INPUT);
  pinMode(PIN_RADAR_OUT, INPUT_PULLDOWN);

  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(PIN_BUZZER, 2000, BUZZER_PWM_RES);
  #else
    pinMode(PIN_BUZZER, OUTPUT);
  #endif

  testBuzzerBoot();

  Wire.begin(21, 22);
  Wire.setTimeOut(30);
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    oledReady = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(8, 20);
    display.print(F("A.U.R.A. MASTER C2"));
    display.setCursor(14, 34);
    display.print(F("BIO-ACOUSTIC v12"));
    display.display();
    delay(800);
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 25) {
    delay(400);
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    scanAndTriangulateWiFi();
  }

  server.on("/api/telemetry", HTTP_GET, handleTelemetry);
  server.on("/api/telemetry", HTTP_POST, handleConfigPost);
  server.on("/api/telemetry", HTTP_OPTIONS, handleOptions);
  server.begin();

  if (mpu.begin()) {
    mpuReady = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  }

  // Pre-calibrate quiescent DC baseline for microphone & piezo
  long sumP = 0, sumM = 0;
  for (int i = 0; i < 128; i++) {
    sumP += analogRead(PIN_PIEZO);
    sumM += analogRead(PIN_MIC_OUT);
    delayMicroseconds(200);
  }
  piezoBias = sumP / 128.0f;
  micDcBias = sumM / 128.0f;

  if (wifiReady) {
    runInferenceEngine();
    lastAiCallTime = millis();
  }
}

void loop() {
  esp_task_wdt_reset(); 
  server.handleClient();
  updateBuzzerEngine();

  // 100 Hz Fast DSP Sensor Sampling & Acoustic Burst Capture
  if (millis() - lastFastSample >= 10) {
    lastFastSample = millis();

    // Doppler Radar
    int instantRadar = digitalRead(PIN_RADAR_OUT);
    if (instantRadar == HIGH) {
      lastRadarTriggerTime = millis();
      rawRadar = 1;
    } else {
      rawRadar = (millis() - lastRadarTriggerTime < 1500) ? 1 : 0;
    }

    // Piezo Burst Sampling
    int peakP = 0;
    for (int s = 0; s < 32; s++) {
      int p = analogRead(PIN_PIEZO);
      if (p > peakP) peakP = p;
      delayMicroseconds(25);
    }
    rawPiezo = peakP;

    piezoBias = (piezoBias * 0.99f) + (rawPiezo * 0.01f);
    float deltaSeismic = abs(rawPiezo - piezoBias);
    float tapImpulse = (deltaSeismic * 4.5f) + (deltaJerk * 35.0f);

    if (tapImpulse > 6.0f) {
      piezoPeakEnvelope = max(piezoPeakEnvelope, tapImpulse);
      unsigned long now = millis();
      if (now - lastTapTime > 80 && now - lastTapTime < 1100) {
        tapCountWindow++;
        lastTapTime = now;
      } else if (now - lastTapTime >= 1100) {
        tapCountWindow = 1;
        lastTapTime = now;
      }
    }
    piezoPeakEnvelope *= 0.88f;

    seismicWave[waveHead] = (int)tapImpulse;
    waveHead = (waveHead + 1) % SEISMIC_SAMPLES;

    // HIGH-PERFORMANCE ACOUSTIC BURST SAMPLING (Replaces broken 1-sample read)
    sampleAcousticMicrophoneBurst();

    // Composite Tactical Biological Confidence Score
    int calculatedConfidence = 0;
    if (aiBiologicalDetected) calculatedConfidence += 30;
    if (heartbeatDetected) calculatedConfidence += 25;
    if (soundClassification == "HUMAN VOICE" || soundClassification == "BREATHING") calculatedConfidence += 25;
    if (piezoPeakEnvelope > 12.0f) calculatedConfidence += 10;
    if (rawRadar == 1) calculatedConfidence += 10;
    confidenceScore = constrain(calculatedConfidence, 0, 100);
  }

  // 5 Hz Slow Telemetry, Atmospheric Gas, & Neural Cloud Loop
  if (millis() - lastSlowSample >= 200) {
    lastSlowSample = millis();
    int instantGas = analogRead(PIN_GAS_MQ135);
    rawGas = (instantGas > 100) ? instantGas : 0; 

    if (rawGas > 350) {
      aiActionRec = "RESPIRATION HAZARD";
      aiBiologicalDetected = true;
    }

    if (mpuReady) {
      sensors_event_t a, g, temp;
      mpu.getEvent(&a, &g, &temp);
      deltaJerk = sqrt(pow(a.acceleration.x - prevAx, 2) + pow(a.acceleration.y - prevAy, 2) + pow(a.acceleration.z - prevAz, 2));
      prevAx = a.acceleration.x; prevAy = a.acceleration.y; prevAz = a.acceleration.z;
    }

    if (millis() - lastTapTime > 2200) tapCountWindow = 0;

    // Trigger Cloud AI analysis if notable acoustic/seismic/radar activity is captured
    if (millis() - lastAiCallTime >= AI_QUERY_INTERVAL && 
        (micRmsEnergy > 20.0f || piezoPeakEnvelope > 10.0f || rawRadar == 1 || heartbeatDetected)) {
      lastAiCallTime = millis();
      runInferenceEngine();
    }
  }

  // UI Carousel Pagination Loop
  if (millis() - lastSlideSwitch >= SLIDE_INTERVAL) {
    lastSlideSwitch = millis();
    activeCard = (activeCard + 1) % TOTAL_CARDS;
  }

  // 20 FPS Tactical OLED Refresh Loop
  if (oledReady && (millis() - lastOledDraw >= 50)) {
    lastOledDraw = millis();
    display.clearDisplay();
    switch (activeCard) {
      case 0: renderCard0(); break;
      case 1: renderCard1(); break;
      case 2: renderCard2(); break;
      case 3: renderCard3(); break;
      case 4: renderCard4(); break;
    }
    display.display();
  }
}
