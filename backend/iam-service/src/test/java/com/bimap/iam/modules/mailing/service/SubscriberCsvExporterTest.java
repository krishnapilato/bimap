package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.mailing.domain.SubscriptionSource;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class SubscriberCsvExporterTest {

    @ParameterizedTest(name = "neutralises [{0}]")
    @ValueSource(strings = {"=HYPERLINK(\"x\")", "+1+1", "-2+3", "@SUM(A1)"})
    @DisplayName("a cell that a spreadsheet would evaluate is written as text")
    void neutralisesFormulas(String hostile) {
        assertThat(SubscriberCsvExporter.cell(hostile)).isEqualTo("'" + hostile);
    }

    @Test
    @DisplayName("ordinary values and nulls pass through")
    void keepsOrdinaryValues() {
        assertThat(SubscriberCsvExporter.cell("Giulia")).isEqualTo("Giulia");
        assertThat(SubscriberCsvExporter.cell(null)).isEmpty();
    }

    @Test
    @DisplayName("the file opens in Excel with accents intact and a header row first")
    void writesBomAndHeader() throws Exception {
        var subscriber = Subscriber.builder()
                .email("niccolò@example.com")
                .firstName("Niccolò")
                .status(SubscriptionStatus.SUBSCRIBED)
                .source(SubscriptionSource.IMPORT)
                .build();

        var output = new ByteArrayOutputStream();
        new SubscriberCsvExporter().writeTo(output, List.of(subscriber));
        var csv = output.toString(StandardCharsets.UTF_8);

        assertThat(csv).startsWith("﻿\"email\",\"first_name\"");
        assertThat(csv).contains("\"niccolò@example.com\",\"Niccolò\",\"\",\"SUBSCRIBED\",\"IMPORT\"");
    }
}
