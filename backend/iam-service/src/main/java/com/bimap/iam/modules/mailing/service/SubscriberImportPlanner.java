package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.dto.SubscriberImportReport.Rejection;
import com.bimap.iam.modules.mailing.dto.SubscriberImportRequest.Row;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

/// Decides what an import will do with each row before anything touches the database.
/// @author Khova Krishna Pilato
final class SubscriberImportPlanner {

    private SubscriberImportPlanner() {
    }

    /// A row that passed every check, with its address normalised.
    record Candidate(int row, String email, String firstName, String lastName) {
    }

    /// @param duplicates Rows that repeated an address already seen earlier in the same batch.
    record Plan(List<Candidate> candidates, List<Rejection> rejected, int duplicates) {
    }

    private record Checked(
            @NotBlank(message = "The address is missing")
            @Email(message = "This is not a valid email address")
            @Size(max = 254, message = "The address is longer than 254 characters")
            String email,

            @Size(max = 80, message = "The first name is longer than 80 characters")
            String firstName,

            @Size(max = 80, message = "The last name is longer than 80 characters")
            String lastName) {
    }

    static Plan plan(List<Row> rows, Validator validator) {
        var seen = new HashSet<String>();
        var candidates = new ArrayList<Candidate>();
        var rejected = new ArrayList<Rejection>();
        var duplicates = 0;

        for (var index = 0; index < rows.size(); index++) {
            var row = rows.get(index);
            var number = index + 1;
            var checked = new Checked(
                    normaliseEmail(row == null ? null : row.email()),
                    blankToNull(row == null ? null : row.firstName()),
                    blankToNull(row == null ? null : row.lastName()));

            var violations = validator.validate(checked);
            if (!violations.isEmpty()) {
                rejected.add(new Rejection(number, row == null ? null : row.email(),
                        violations.iterator().next().getMessage()));
                continue;
            }
            if (!seen.add(checked.email())) {
                duplicates++;
                continue;
            }
            candidates.add(new Candidate(number, checked.email(), checked.firstName(), checked.lastName()));
        }
        return new Plan(List.copyOf(candidates), List.copyOf(rejected), duplicates);
    }

    private static String normaliseEmail(String value) {
        return value == null || value.isBlank() ? null : value.strip().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
