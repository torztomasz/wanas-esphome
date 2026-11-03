#pragma once
#include <cmath>
#include <cstdint>

// Grenton's Wanas guide reads RawValue 512 as gear 2 and 61696 as 24.1 °C,
// so the ST-340 puts the low byte first. Set to 0 if every value reads 256x too big.
#define WANAS_SWAP_BYTES 1

static const uint16_t WANAS_SENSOR_ERROR = 63066;

// Templated because ESPHome passes std::vector in older releases and std::span in newer ones.
template<typename Bytes> uint16_t wanas_word(const Bytes &data, size_t offset) {
  uint8_t first = data[offset], second = data[offset + 1];
#if WANAS_SWAP_BYTES
  return first | (second << 8);
#else
  return (first << 8) | second;
#endif
}

inline uint16_t wanas_encode(float value) {
  uint16_t v = static_cast<uint16_t>(lroundf(value));
#if WANAS_SWAP_BYTES
  return static_cast<uint16_t>((v >> 8) | (v << 8));
#else
  return v;
#endif
}

template<typename Bytes> float wanas_temperature(const Bytes &data, size_t offset) {
  uint16_t raw = wanas_word(data, offset);
  if (raw == WANAS_SENSOR_ERROR) return NAN;
  return static_cast<int16_t>(raw) / 10.0f;
}
