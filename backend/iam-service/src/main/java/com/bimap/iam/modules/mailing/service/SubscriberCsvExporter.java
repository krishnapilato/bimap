package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.opencsv.CSVWriter;
import com.opencsv.ICSVWriter;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.List;

/// Writes a list's subscribers, with their consent record, as CSV.
/// @author Khova Krishna Pilato
@Component
public class SubscriberCsvExporter {

    /// A UTF-8 byte order mark, without which Excel opens accented names as mojibake.
    private static final String BOM = "﻿";

    private static final String[] HEADER = {
            "email", "first_name", "last_name", "status", "source",
            "subscribed_at", "unsubscribed_at", "unsubscribe_reason", "added_at"
    };

    public void writeTo(OutputStream output, List<Subscriber> subscribers) throws IOException {
        try (Writer writer = new OutputStreamWriter(output, StandardCharsets.UTF_8);
             ICSVWriter csv = new CSVWriter(writer)) {

            writer.write(BOM);
            csv.writeNext(HEADER);

            for (var subscriber : subscribers) {
                csv.writeNext(new String[]{
                        cell(subscriber.getEmail()),
                        cell(subscriber.getFirstName()),
                        cell(subscriber.getLastName()),
                        cell(subscriber.getStatus()),
                        cell(subscriber.getSource()),
                        cell(subscriber.getSubscribedAt()),
                        cell(subscriber.getUnsubscribedAt()),
                        cell(subscriber.getUnsubscribeReason()),
                        cell(subscriber.getCreatedAt())
                });
            }
            csv.flush();
        }
    }

    /// Spreadsheets evaluate a cell that starts like a formula, and subscribers choose their own
    /// names, so such a cell is written as text.
    static String cell(Object value) {
        if (value == null) {
            return "";
        }
        var text = value.toString();
        return !text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0 ? "'" + text : text;
    }
}
