#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SensirionI2CSen5x.h>
#include <time.h>

#define SDA_PIN 21
#define SCL_PIN 22

// WiFi setup
//const char* ssid = "EE-Mini-Hub-1889-2.4GHz";
//const char* password = "GRNRhED3ATbq";

const char* ssid = "Ollie";
const char* password = "ankeside";

// ThingSpeak setup
String apiKey = "SLB4JGCEAOZA1T8I";
const char* tsServer = "http://api.thingspeak.com/update";

SensirionI2CSen5x sen5x;

unsigned long interval = 300000; // 5 minutes
unsigned long lastRead = 0;

bool timeSynced = false;


//Setup RTC
void syncTime() {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov"); 
    Serial.print("Syncing time");

    struct tm timeinfo;
    while (!getLocalTime(&timeinfo)) {
        Serial.print(".");
        delay(500);
    }
    Serial.println("\nTime synced!");
    timeSynced = true;
}
// Wifi connect
void connectWiFi() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(300);
    }
    Serial.println("\nWiFi connected!");
}

void setup() {
    Serial.begin(115200);
    delay(1500);

    Wire.begin(SDA_PIN, SCL_PIN);

    Serial.println("Initialising SEN55...");

    connectWiFi();
    syncTime();

    //From Sensirions measurement library
    uint16_t error;
    
    sen5x.begin(Wire);

    error = sen5x.deviceReset();
    if (error) Serial.println("Device reset error");

    error = sen5x.startMeasurement();
    if (error) Serial.println("Start measurement error");

    Serial.println("SEN55 warming up (30 seconds)...");
    delay(30000);
}

void loop() {
    if (!timeSynced) return;

    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Time fetch error");
        delay(1000);
        return;
    }

    int minuteNow = timeinfo.tm_min;
    int secondNow = timeinfo.tm_sec;

    // Upload at :00, :05, :10, :15 ...
    if (minuteNow % 5 == 0 && secondNow == 0) {

        Serial.println("=== Time-aligned measurement triggered ===");

        float pm1, pm2_5, pm4, pm10;
        float humidity, temp, voc, nox;

        uint16_t error = sen5x.readMeasuredValues(
            pm1, pm2_5, pm4, pm10, humidity, temp, voc, nox
        );

        if (error) {
            Serial.print("Read error: ");
            Serial.println(error);
        } else {
            Serial.println("---- SEN55 Reading ----");
            Serial.print("PM1.0: ");  Serial.println(pm1);
            Serial.print("PM2.5: ");  Serial.println(pm2_5);
            Serial.print("PM4.0: ");  Serial.println(pm4);
            Serial.print("PM10: ");   Serial.println(pm10);
            Serial.print("Humidity: "); Serial.println(humidity);
            Serial.print("Temperature: "); Serial.println(temp);
            Serial.print("VOC Index: "); Serial.println(voc);
            Serial.print("NOx Index: "); Serial.println(nox);
            Serial.println("------------------------");

            if (WiFi.status() == WL_CONNECTED) {
                HTTPClient http;

                String url = String(tsServer)
                    + "?api_key=" + apiKey
                    + "&field1=" + String(pm1)
                    + "&field2=" + String(pm2_5)
                    + "&field3=" + String(pm4)
                    + "&field4=" + String(pm10)
                    + "&field5=" + String(temp)
                    + "&field6=" + String(humidity)
                    + "&field7=" + String(voc)
                    + "&field8=" + String(nox);

                http.begin(url);
                int httpCode = http.GET();
                if (httpCode > 0) Serial.println("ThingSpeak upload OK");
                else Serial.println("Upload failed");

                http.end();
            }
        }

        // Prevent multiple uploads in the same minute
        delay(1500);
    }

    delay(500);  // Check ~2× per second
}


