# Wanas → Home Assistant (ESPHome + Modbus RTU)

Lokalna integracja rekuperatora **Wanas** ze sterownikiem **ST-340 V2** (panel dotykowy „Display V2”) z Home Assistant. Bez chmury i bez modułu internetowego Wanas: ESP32 rozmawia ze sterownikiem po RS485 (Modbus RTU) i wystawia encje do HA przez ESPHome.

Dlaczego tak: sterownik ma dwa wbudowane porty Modbus RTU typu slave. Moduł Wanas Mobile Control (W-15 / W-19) działa tylko przez chmurę emodul.eu, a integracje HA dla eModul przy sterownikach wentylacji dają raczej tylko odczyt.

> **Status:** konfiguracja kompiluje się w CI, ale **nie była jeszcze testowana na prawdziwej centrali**. Patrz [Do sprawdzenia przy pierwszym uruchomieniu](#do-sprawdzenia-przy-pierwszym-uruchomieniu).

## Schemat podłączenia

![Schemat połączeń ESP32, modułu MAX3485 i płyty Wanas](docs/wiring.svg)

| ESP32 DevKit | Moduł MAX3485 | | Płyta Wanas „Modbus 1” |
|---|---|---|---|
| D4 / GPIO4 | EN | | |
| 3V3 | VCC | | |
| RX2 / GPIO16 | RXD | | |
| TX2 / GPIO17 | TXD | | |
| GND | GND (lewa strona) | | |
| | GND (prawa strona) | ↔ | GND |
| | A | ↔ | A |
| | B | ↔ | B |

- **VCC modułu tylko do 3V3.** Piny ESP32 przyjmują najwyżej 3,3 V, dlatego moduł MAX3485, a nie MAX485 na 5 V.
- Kieruj się napisami na płytkach, nie kolejnością na rysunku.
- Rekuperator przed odkręcaniem zacisków **odłącz od prądu (230 V)**. Złącza „DISP”, „Modbus 2” i „TECH RS” zostaw w spokoju. „DISP” to panel dotykowy, który ma własną magistralę, więc ESP jest jedynym masterem na „Modbus 1”.
- Do rekuperatora poprowadź skrętkę, np. wolną parę z kabla UTP: A i B w jednej parze, GND osobno.

## Części

| Część | Uwagi |
|---|---|
| ESP32 DevKit z ESP-WROOM-32 (np. wersja z CH340 i USB-C) | `board: esp32dev`. Nie WROVER, bo tam GPIO16/17 zajmuje PSRAM |
| Moduł RS485 na **MAX3485, 3,3 V** (np. „RS485 V2.01” z pinami EN, VCC, RXD, TXD, GND) | Wersja CSA albo ESA, obie wystarczą w domu. Moduł z automatycznym kierunkiem (bez EN) też zadziała, wtedy usuń `flow_control_pin` |
| Kabelki dupont żeński–żeński, skrętka do centrali | |
| Zasilanie | Zasilacz USB 5 V do ESP **albo** przetwornica step-down z wyjścia „DC 24V max 0,5A” na płycie Wanas na pin 5V/VIN. Nigdy 24 V prosto na ESP |

## Wgranie

1. `cp secrets.yaml.example secrets.yaml` i uzupełnij dane Wi-Fi. Klucz wygeneruj: `openssl rand -base64 32`. Służy do szyfrowania API i OTA.
2. Pierwsze wgranie przez USB: `esphome run wanas-rekuperator.yaml` (albo Docker: `docker run --rm -it -v "$PWD":/config --device /dev/ttyUSB0 esphome/esphome run wanas-rekuperator.yaml`). Na Macu dla CH340 może być potrzebny sterownik.
3. Kolejne aktualizacje idą przez Wi-Fi (OTA).
4. Home Assistant wykryje urządzenie w *Ustawienia → Urządzenia i usługi → ESPHome*. Podaj ten sam klucz.

## Co pojawi się w Home Assistant

**Odczyt:** wydatek nawiewu i wywiewu (m³/h, 0 przy braku funkcji XF), bieg nawiewu i wywiewu, temperatury (zewnętrzna, wyrzutu, nawiewu, pomieszczenia), dni do wymiany filtra, kod błędów, stan bypassu i GWC, „Filtr do wymiany”.

**Sterowanie:** biegi stref 1–5 programu tygodniowego, funkcja impreza (0–720 min), kominek, ręczny bypass, urlop (0–30 dni).

ST-340 **nie ma rejestru „ustaw bieg teraz”**. Dlatego:
- bieg na stałe ustawiasz tym samym biegiem we wszystkich 5 strefach;
- do chwilowego wietrzenia służy funkcja impreza, np. automatyzacja „wilgotność w łazience > 70% → impreza 30 min”.

## Mapa rejestrów

Źródło: instrukcja Wanas 350/550/355/555 (V_041021), rozdz. 8 „MODBUS RTU”. Transmisja: **19200 b/s, 8E1, adres 1**, funkcje 0x03 / 0x06 / 0x10, wszystko to holding registers.

Adres w konfiguracji = **numer z instrukcji − 4001**. Poradnik Grentona czyta „4003 Bieg nawiewu” spod adresu 2.

| Adres | Nr w instrukcji | Nazwa | R/W | Wartości |
|---|---|---|---|---|
| 0 | 4001 | Wydatek nawiewu | R | m³/h, 0 = brak funkcji XF |
| 1 | 4002 | Wydatek wywiewu | R | m³/h |
| 2 | 4003 | Bieg nawiewu | R | 0 postój, 1 pusty dom, 2 praca, 3 wietrzenie |
| 3 | 4004 | Bieg wywiewu | R | jw. |
| 4–7 | 4005–4008 | Temp. zewnętrzna, wyrzutowa, nawiewowa, pomieszczenia | R | 0,1 °C ze znakiem, 63066 = błąd czujnika |
| 8 | 4009 | Dzień tygodnia | R/W | 0 niedziela … 6 sobota |
| 10–13 | 4011–4014 | Koniec strefy 1–4 | R/W | minuty od północy, krok 15 |
| 14–18 | 4015–4019 | Bieg strefy 1–5 | R/W | 0–3 |
| 19–23 | 4020–4024 | Temp. strefy 1–5 | R/W | 10–30 °C |
| 24 | 4025 | Adres Modbus | R/W | 1–254 |
| 25 | 4026 | Baud rate | R/W | 0:2400 1:4800 2:9600 3:19200 4:38400 5:57600 6:115200 |
| 26 | 4027 | Parametry transmisji | R/W | 0:N-8-1 1:E-8-1 2:O-8-1 3:N-8-2 4:E-8-2 5:O-8-2 |
| 29 | 4030 | EXTRA TEMP | R | jak temperatury |
| 30–35 | 4031–4036 | Stan: GWC, bypass, nawilżacz, nagrzewnica, chłodnica, urlop | R | 1 aktywne |
| 36 | 4037 | Wymiana filtra | R | 0 = wymień, 1–252 = dni do wymiany |
| 37 | 4038 | Błędy | R | bitowo |
| 38–43 | 4039–4044 | Aktywacja: GWC, bypass, nawilżacz (0/1), nagrzewnica (≤60 dni), chłodnica (≤60 dni), urlop (≤30 dni) | R/W | |
| 44 | 4045 | Funkcja kominek | R/W | instrukcja: „maks. 180 sekund” |
| 45 | 4046 | Funkcja impreza | R/W | minuty, maks. 720 |
| 46–49 | 4047–4050 | Wejścia: bieg 1, bieg 3, okap, ppoż. | R | |
| 50, 51 | 4051, 4052 | Data, godzina | R/W | |

**Kolejność bajtów:** sterownik wysyła młodszy bajt pierwszy. U Grentona surowa wartość 512 to bieg 2, a 61696 to 24,1 °C. Zamianę robią helpery w [`wanas_modbus.h`](wanas_modbus.h) (`wanas_word`, `wanas_encode`, `wanas_temperature`), przy odczycie i przy zapisie.

## Do sprawdzenia przy pierwszym uruchomieniu

| Objaw w logach ESPHome | Co zrobić |
|---|---|
| Same timeouty, brak odpowiedzi | Zamień RXD ↔ TXD, potem A ↔ B. Pomyłka niczego nie uszkodzi |
| Wartości 256 razy za duże (bieg 512, temperatura 6000+) | W `wanas_modbus.h` ustaw `WANAS_SWAP_BYTES 0` |
| Wartości przesunięte o jeden rejestr (np. temperatura nawiewu tam, gdzie wyrzutu) | Adresacja jest od 1, nie od 0: dodaj 1 do każdego `address:` |
| Exception 0x02 (illegal address) | jw. albo inna wersja oprogramowania sterownika |

Instrukcja jest z 2021 r. Sterownik, na którym to powstało, ma wersję wyświetlacza 2.1.27 GR i modułu 2.1.27 G. Inna wersja może mieć przesuniętą mapę rejestrów.

## Pliki

- [`wanas-rekuperator.yaml`](wanas-rekuperator.yaml): konfiguracja ESPHome
- [`wanas_modbus.h`](wanas_modbus.h): zamiana bajtów, temperatury, kod błędu czujnika
- [`secrets.yaml.example`](secrets.yaml.example): wzór sekretów
- [`docs/wiring.svg`](docs/wiring.svg): schemat, generowany przez `node docs/wiring-svg.mjs docs/wiring.svg`
- [`.github/workflows/compile.yml`](.github/workflows/compile.yml): CI kompiluje firmware na `esphome/esphome:stable`, żeby wyłapać zmiany API ESPHome

## Źródła

- [Instrukcja Wanas 350/550/355/555 (PDF): Modbus RTU, schemat płyty Display V2](https://knowledgebase.grenton.com/hubfs/Documentation_Wanas.pdf)
- [Grenton: integracja z rekuperatorem Wanas](https://knowledgebase.grenton.com/integration-with-wanas-recuperator) (adresy rejestrów i kolejność bajtów ze zrzutów ekranu)
- [ESPHome Modbus Controller](https://esphome.io/components/modbus_controller/)
