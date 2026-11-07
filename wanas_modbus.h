#pragma once
#include <cmath>
#include <cstdint>

// A real ST-340 (firmware 2.1.27) sends gear 2 as "00 02": high byte first, as Modbus
// specifies. Grenton's guide shows swapped values (512 for gear 2), perhaps from its
// own gateway. Set to 1 if every value reads 256x too big.
#define WANAS_SWAP_BYTES 0

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
