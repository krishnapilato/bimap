package com.bimap.iam.modules.mailing.service;

import java.util.List;

/// Confirmation emails owed to addresses that were just added, sent once the change has committed.
/// @author Khova Krishna Pilato
public record ConfirmationsRequested(List<Confirmation> confirmations) {

    public ConfirmationsRequested {
        confirmations = List.copyOf(confirmations);
    }

    /// @author Khova Krishna Pilato
    public record Confirmation(String email, String firstName, String listName, String confirmLink) {
    }
}
