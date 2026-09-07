package com.bimap.business.modules.registry.dto;

/// @author Khova Krishna Pilato
public record TableColumn(
        String field,
        String header,
        FieldType type,
        boolean sortable,
        boolean filterable,
        boolean visibleByDefault) {
}
