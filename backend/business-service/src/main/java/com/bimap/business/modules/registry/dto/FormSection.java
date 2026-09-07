package com.bimap.business.modules.registry.dto;

import java.util.List;

/// @author Khova Krishna Pilato
public record FormSection(String id, String title, String description, List<FormField> fields) {
}
