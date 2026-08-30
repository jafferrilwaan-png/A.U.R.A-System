/*
 * A.U.R.A. System - Sub-Surface Cavity & Life Detection Firmware
 * Microcontroller: ESP32 DevKit V1
 * Hardware: OLED SSD1306 (I2C 0x3C), Piezoelectric Geophone, Ultrasonic Sensor, NEO-6M GPS, WS2812B RGB LED
 * Platform: Arduino / ESP-IDF Framework
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <TinyGPS++.h>
#include <FastLED.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Pin Definitions
#define PIN_PIEZO A0
#define PIN_TRIG 5
#define PIN_ECHO 18
#define PIN_LED 2
#define NUM_LEDS 1

CRGB leds[NUM_LEDS];
WebServer server(80);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // RX2 = 16, TX2 = 17

// Threshold Settings
const int SEISMIC_ALERT_THRESHOLD = 450;
const float VOID_PROXIMITY_THRESHOLD = 150.0; // cm

// Global State
float voidDistance = 0.0;
int seismicLevel = 0;
double latitude = 0.0;
double longitude = 0.0;
bool gpsLocked = false;
String nodeStatus = "INITIALIZING";

const char* ssid = "AURA_RESCUE_NODE_01";
const char* password = "aurasystempass";

float getDistanceCM() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 30000);
  if (duration == 0) return 0.0;
  return (duration * 0.0343) / 2.0;
}

void handleTelemetry() {
  String json = "{";
  json += "\"status\":\"" + nodeStatus + "\",";
  json += "\"void_depth_cm\":" + String(voidDistance, 2) + ",";
  json += "\"seismic_signal\":" + String(seismicLevel) + ",";
  json += "\"gps_locked\":" + String(gpsLocked ? "true" : "false") + ",";
  json += "\"lat\":" + String(latitude, 6) + ",";
  json += "\"lng\":" + String(longitude, 6);
  json += "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_PIEZO, INPUT);

  FastLED.addLeds<WS2812B, PIN_LED, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(128);

  Wire.begin(21, 22);
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 10);
    display.println(">> A.U.R.A. ONLINE <<");
    display.setCursor(0, 30);
    display.println("Initializing Node...");
    display.display();
  }

  // Launch Wi-Fi Access Point
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("Access Point Live at: http://");
  Serial.println(IP);

  // Setup Server Route
  server.on("/data", handleTelemetry);
  server.begin();
  delay(1000);
}

void loop() {
  server.handleClient();

  // Ingest GPS NMEA Sentences
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsLocked = true;
  }

  // Acquire Sensor Data
  voidDistance = getDistanceCM();
  seismicLevel = analogRead(PIN_PIEZO);

  // Evaluate Threat / Alert State
  if (seismicLevel > SEISMIC_ALERT_THRESHOLD || (voidDistance > 0 && voidDistance < VOID_PROXIMITY_THRESHOLD)) {
    nodeStatus = "HAZARD_DETECTED";
    leds[0] = (millis() % 500 < 250) ? CRGB::Red : CRGB::Black; // Flashing Alert
  } else {
    nodeStatus = "NOMINAL_SCAN";
    leds[0] = CRGB::Green;
  }
  FastLED.show();

  // Render Mission HUD on OLED
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("AURA RESCUE NODE [01]");
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);

  display.setCursor(0, 14);
  display.print("Void Depth: ");
  display.print(voidDistance, 1);
  display.println(" cm");

  display.setCursor(0, 26);
  display.print("Seismic:    ");
  display.println(seismicLevel);

  display.setCursor(0, 38);
  display.print("GPS: ");
  if (gpsLocked) {
    display.print(latitude, 3);
    display.print(",");
    display.println(longitude, 3);
  } else {
    display.println("ACQUIRING...");
  }

  display.setCursor(0, 52);
  display.print("SYS: ");
  display.println(nodeStatus);
  display.display();

  delay(50);
}

