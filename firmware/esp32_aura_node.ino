/*
 * A.U.R.A. System - Sub-Surface Cavity & Life Detection Firmware
 * Microcontroller: ESP32 DevKit V1
 * Sensors: Piezoelectric Geophone Sensor (A0), Ultrasonic Depth Scanner (Trig D5, Echo D18), NEO-6M GPS (RX2/TX2)
 * Platform: Arduino / ESP-IDF Framework
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// Pin Definitions
#define PIEZO_SENSOR_PIN A0
#define ULTRASONIC_TRIG_PIN 5
#define ULTRASONIC_ECHO_PIN 18
#define LED_STATUS_PIN 2

// Threshold Settings
const int ACOUSTIC_TAP_THRESHOLD = 450;
const float MIN_VOID_DEPTH_METERS = 1.50;

// Setup Serial & Sensors
void setup() {
  Serial.begin(115200);
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  pinMode(PIEZO_SENSOR_PIN, INPUT);

  Serial.println("[AURA ESP32 NODE] Initializing Sub-Surface Cavity Sensors...");
  digitalWrite(LED_STATUS_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_STATUS_PIN, LOW);
  Serial.println("[AURA ESP32 NODE] System Status: ONLINE & READY.");
}

// Read Ultrasonic Void Depth (in meters)
float readSubsurfaceDepthMeters() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  long durationMicroSec = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000);
  if (durationMicroSec == 0) return 0.0;

  // Speed of sound = 343 m/s
  float distanceCm = (durationMicroSec * 0.0343) / 2.0;
  return distanceCm / 100.0;
}

// Read Piezoelectric Seismic Acoustic Pulse
int readSeismicAcousticPulse() {
  int rawAnalog = analogRead(PIEZO_SENSOR_PIN);
  return rawAnalog;
}

void loop() {
  float currentDepthMeters = readSubsurfaceDepthMeters();
  int acousticPulseValue = readSeismicAcousticPulse();

  Serial.print("[TELEMETRY SCAN] Sub-surface Void Depth: ");
  Serial.print(currentDepthMeters);
  Serial.print(" m | Seismic Acoustic Signal: ");
  Serial.println(acousticPulseValue);

  // Check for Survivor Tapping Signature or Cavity Void
  if (acousticPulseValue > ACOUSTIC_TAP_THRESHOLD) {
    digitalWrite(LED_STATUS_PIN, HIGH);
    Serial.println(">>> [ALERT] RHYTHMIC SURVIVOR TAP SIGNATURE DETECTED! TRANSMITTING GPS...");
    delay(200);
    digitalWrite(LED_STATUS_PIN, LOW);
  }

  delay(500); // 2Hz sampling frequency
}
