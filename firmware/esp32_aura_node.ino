/*
 * A.U.R.A. System - Sub-Surface Cavity & Life Detection Firmware
 * Microcontroller: ESP32 DevKit V1
 * Sensors: Ultrasonic Depth Scanner (Trig D5, Echo D18), NEO-6M GPS (TinyGPS++)
 * Network: Localized Autonomous Wi-Fi SoftAP ("RESCUE_NODE_01")
 */

#include <WiFi.h>
#include <WebServer.h>
#include <TinyGPSPlus.h>

#define TRIG_PIN 5
#define ECHO_PIN 18
#define VOID_THRESHOLD_CM 45.0 // Minimum clearance indicating a survivable void

TinyGPSPlus gps;
WebServer server(80);

float measureVoidDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return -1.0;
  return (duration * 0.0343) / 2.0;
}

void handleTelemetry() {
  float depth = measureVoidDistance();
  bool voidDetected = (depth >= VOID_THRESHOLD_CM);
  
  // Format real-time tactical payload for first responders
  String json = "{";
  json += "\"status\":\"" + String(voidDetected ? "VOID_DETECTED" : "OBSTRUCTED") + "\",";
  json += "\"void_depth_cm\":" + String(depth, 1) + ",";
  json += "\"lat\":" + String(gps.location.lat(), 6) + ",";
  json += "\"lng\":" + String(gps.location.lng(), 6) + ",";
  json += "\"uptime_ms\":" + String(millis());
  json += "}";
  
  server.send(200, "application/json", json);
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Create localized, autonomous field network
  WiFi.softAP("RESCUE_NODE_01", "rescue123");
  server.on("/data", HTTP_GET, handleTelemetry);
  server.begin();
}

void loop() {
  server.handleClient();
}
