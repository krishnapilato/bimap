package com.example.core;

import com.example.beans.FormModel;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.StringJoiner;

@Slf4j
@Component
@RequiredArgsConstructor
public class Utility {

    private static final String CSV_HEADER = "region,province,municipality,address,goodNaming,number,goodID,istatCode,latitude,longitude";

    private final JavaMailSender mailSender;
    private final Object csvWriteLock = new Object();
    private Path csvPath;

    @Value("${bimap.storage.dir:}")
    private String storageDir;

    @Value("${bimap.csv.filename:csv_file.csv}")
    private String csvFileName;

    @Value("${spring.mail.username:no-reply@bimap.local}")
    private String senderAddress;

    @Value("${bimap.email.subject:BiMap Account Information}")
    private String emailSubject;

    public void createFiles() throws IOException {
        synchronized (csvWriteLock) {
            var storagePath = resolveStoragePath();
            Files.createDirectories(storagePath);

            csvPath = storagePath.resolve(csvFileName);
            if (!Files.exists(csvPath)) {
                Files.writeString(csvPath, CSV_HEADER + System.lineSeparator(), StandardCharsets.UTF_8, StandardOpenOption.CREATE);
                log.info("Created CSV file at {}", csvPath.toAbsolutePath());
            }
        }
    }

    public void writeCSVFile(FormModel formData) throws IOException {
        var row = new StringJoiner(",")
                .add(csvValue(formData.getRegion()))
                .add(csvValue(formData.getProvince()))
                .add(csvValue(formData.getMunicipality()))
                .add(csvValue(formData.getAddress()))
                .add(csvValue(formData.getGoodNaming()))
                .add(csvValue(formData.getNumber()))
                .add(csvValue(formData.getGoodID()))
                .add(csvValue(formData.getIstatCode()))
                .add(csvValue(formData.getLatitude()))
                .add(csvValue(formData.getLongitude()))
                .toString();

        synchronized (csvWriteLock) {
            if (csvPath == null || !Files.exists(csvPath)) {
                createFiles();
            }
            Files.writeString(csvPath, row + System.lineSeparator(), StandardCharsets.UTF_8, StandardOpenOption.APPEND);
        }
    }

    public void sendEmail(String email, String content) throws MessagingException, IOException {
        var message = mailSender.createMimeMessage();
        var helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
        helper.setTo(email);
        helper.setSubject(emailSubject);
        helper.setText(content, true);
        helper.setFrom(senderAddress);
        mailSender.send(message);
    }

    private Path resolveStoragePath() {
        if (storageDir != null && !storageDir.isBlank()) {
            return Path.of(storageDir);
        }
        return Path.of(System.getProperty("user.home"), "BiMap");
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "";
        }

        var raw = String.valueOf(value);
        if (raw.contains(",") || raw.contains("\"") || raw.contains("\n") || raw.contains("\r")) {
            return "\"" + raw.replace("\"", "\"\"") + "\"";
        }

        return raw;
    }
}
