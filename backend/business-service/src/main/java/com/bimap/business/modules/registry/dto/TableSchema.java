package com.bimap.business.modules.registry.dto;

import java.util.List;

/// Column definitions for the registrations table, and the sort it opens on.
/// @author Khova Krishna Pilato
public record TableSchema(String id, List<TableColumn> columns, String defaultSort, String defaultDirection) {
}
