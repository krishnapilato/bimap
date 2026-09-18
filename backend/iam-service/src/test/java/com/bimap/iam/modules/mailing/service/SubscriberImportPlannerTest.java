package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.dto.SubscriberImportRequest.Row;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class SubscriberImportPlannerTest {

    private static jakarta.validation.ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @Test
    @DisplayName("addresses are normalised, and names trimmed or dropped when blank")
    void normalisesRows() {
        var plan = SubscriberImportPlanner.plan(List.of(new Row("  Giulia.Rossi@Example.com ", " Giulia ", " ")), validator);

        assertThat(plan.candidates()).singleElement().satisfies(candidate -> {
            assertThat(candidate.email()).isEqualTo("giulia.rossi@example.com");
            assertThat(candidate.firstName()).isEqualTo("Giulia");
            assertThat(candidate.lastName()).isNull();
            assertThat(candidate.row()).isEqualTo(1);
        });
    }

    @Test
    @DisplayName("a bad row is reported with its position, and the rest of the batch goes ahead")
    void rejectsRowsIndividually() {
        var rows = new ArrayList<Row>();
        rows.add(new Row("marco.bianchi@example.com", "Marco", "Bianchi"));
        rows.add(new Row("not-an-address", null, null));
        rows.add(null);
        rows.add(new Row("luca.conti@example.com", "L".repeat(81), null));

        var plan = SubscriberImportPlanner.plan(rows, validator);

        assertThat(plan.candidates()).extracting(SubscriberImportPlanner.Candidate::email)
                .containsExactly("marco.bianchi@example.com");
        assertThat(plan.rejected()).extracting(rejection -> rejection.row()).containsExactly(2, 3, 4);
        assertThat(plan.rejected().get(0).reason()).isEqualTo("This is not a valid email address");
        assertThat(plan.rejected().get(1).reason()).isEqualTo("The address is missing");
        assertThat(plan.rejected().get(2).reason()).isEqualTo("The first name is longer than 80 characters");
    }

    @Test
    @DisplayName("an address repeated in the same file is counted once")
    void collapsesDuplicatesWithinTheBatch() {
        var plan = SubscriberImportPlanner.plan(List.of(
                new Row("giulia.rossi@example.com", "Giulia", null),
                new Row("GIULIA.ROSSI@example.com", "G.", null)), validator);

        assertThat(plan.candidates()).hasSize(1);
        assertThat(plan.candidates().getFirst().firstName()).isEqualTo("Giulia");
        assertThat(plan.duplicates()).isEqualTo(1);
    }
}
