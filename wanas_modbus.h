#pragma once
#include <cmath>
#include <cstdint>

// The ST-340 (firmware 2.1.27) sends the high byte first, as Modbus specifies: gear 2
// arrives as "00 02". Writes need no helper: ESPHome's U_WORD write uses the same order.
// Grenton's guide shows swapped values (512 for gear 2), perhaps from its own gateway.

static const uint16_t WANAS_SENSOR_ERROR = 63066;

// Templated because ESPHome passes std::vector in older releases and std::span in newer ones.
template<typename Bytes> uint16_t wanas_word(const Bytes &data, size_t offset) {
  return (data[offset] << 8) | data[offset + 1];
}

template<typename Bytes> float wanas_temperature(const Bytes &data, size_t offset) {
  uint16_t raw = wanas_word(data, offset);
  if (raw == WANAS_SENSOR_ERROR) return NAN;
  return static_cast<int16_t>(raw) / 10.0f;
}
