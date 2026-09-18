package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/// What an import did, row by row where it matters.
///
/// @param unchanged Rows that matched an address already on the list, or repeated an earlier row.
/// @author Khova Krishna Pilato
@Schema(description = "The outcome of an import")
public record SubscriberImportReport(
        int received,
        int created,
        int updated,
        int unchanged,
        List<Rejection> rejected) {

    /// @param row Position in the submitted rows, starting at 1.
    /// @author Khova Krishna Pilato
    public record Rejection(int row, String email, String reason) {
    }
}
