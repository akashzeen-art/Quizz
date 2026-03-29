package com.nserve.quiz.constants;

import java.util.Set;

/**
 * Keep in sync with {@code frontend/src/constants/locations.ts} — {@code PRESET_LOCATIONS}.
 */
public final class PresetLocations {

  private static final Set<String> ALLOWED =
      Set.of(
          "New York, USA",
          "Los Angeles, USA",
          "Chicago, USA",
          "London, UK",
          "Paris, France",
          "Berlin, Germany",
          "Amsterdam, Netherlands",
          "Dubai, UAE",
          "Singapore",
          "Tokyo, Japan",
          "Seoul, South Korea",
          "Sydney, Australia",
          "Toronto, Canada",
          "Mumbai, India",
          "Delhi, India",
          "Bangalore, India",
          "Hyderabad, India",
          "Chennai, India",
          "Kolkata, India",
          "São Paulo, Brazil",
          "Mexico City, Mexico",
          "Nairobi, Kenya",
          "Cape Town, South Africa");

  private PresetLocations() {}

  /** {@code value} must be trimmed; empty is not allowed here (caller treats empty as clear). */
  public static boolean isAllowed(String trimmedValue) {
    return ALLOWED.contains(trimmedValue);
  }
}
