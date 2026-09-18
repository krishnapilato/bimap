package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/// A batch of addresses, usually parsed from a spreadsheet by the client.
///
/// Rows are deliberately not validated as a whole: one malformed address must not reject the
/// other four thousand, so each row is checked on its own and reported back.
///
/// @param updateExisting Correct the names of addresses already on the list. Their status is never
///                       touched, so an import cannot resubscribe someone who opted out.
/// @author Khova Krishna Pilato
@Schema(description = "Addresses to import into a list")
public record SubscriberImportRequest(

        @NotEmpty List<Row> rows,

        @NotNull ConsentMode consent,

        boolean updateExisting) {

    public SubscriberImportRequest {
        rows = rows == null ? List.of() : List.copyOf(rows);
    }

    /// @author Khova Krishna Pilato
    public record Row(String email, String firstName, String lastName) {
    }
}
