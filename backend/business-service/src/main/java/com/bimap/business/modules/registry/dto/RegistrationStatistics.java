package com.bimap.business.modules.registry.dto;

import java.util.Map;

/// Headline counts for the registry dashboard.
/// @author Khova Krishna Pilato
public record RegistrationStatistics(long total, Map<String, Long> byStatus, Map<String, Long> topRegions) {
}
