package com.research.culturalmap.cultural_map_explorer.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Properties;
import java.util.Random;

import com.research.culturalmap.cultural_map_explorer.model.FormModel;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;

/**
 * Service class providing utility functions for the application.
 * Contains methods for file operations, email handling, and data writing.
 */
@Service
public class Utility {

    private static final String DIRECTORY_PATH = Paths.get(System.getProperty("user.home"), "SimpleMapExercise").toString();
    private static final String CSV_FILE_PATH = Paths.get(DIRECTORY_PATH, "csv_file.csv").toString();

    /**
     * Creates the necessary directories and files for storing application data.
     *
     * @throws IOException If an I/O error occurs during directory or file creation.
     */
    public void createFiles() throws IOException {
        Files.createDirectories(Paths.get(DIRECTORY_PATH));
        new File(CSV_FILE_PATH).createNewFile();
    }

    /**
     * Counts the number of rows in the specified file.
     *
     * @param fileName The name of the file to count rows in.
     * @return The number of rows in the file.
     * @throws IOException If an I/O error occurs while reading the file.
     */
    public int countFileRows(String fileName) throws IOException {
        try (BufferedReader bufferedReader = new BufferedReader(new FileReader(fileName))) {
            return (int) bufferedReader.lines().count();
        }
    }

    /**
     * Writes a new row of data into the CSV file based on the provided form model.
     *
     * @param formModel The data model containing values to write into the CSV file.
     * @throws IOException If an I/O error occurs while writing to the file.
     */
    public void writeCSVFile(FormModel formModel) throws IOException {
        StringBuilder data = new StringBuilder();

        try (FileWriter fileWriter = new FileWriter(CSV_FILE_PATH, true)) {
            fileWriter.write(data.toString());
        }
    }

    /**
     * Generates a random email address of the specified length.
     *
     * @return A randomly generated email address.
     */
    private static String generateRandomEmail() {
        final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        Random random = new Random();
        return random.ints(16, 0, CHARACTERS.length())
                .mapToObj(CHARACTERS::charAt)
                .collect(StringBuilder::new, StringBuilder::append, StringBuilder::append)
                .toString() + "@gmail.com";
    }

    /**
     * Sends an email with the specified content to the recipient email address.
     *
     * @param recipientEmail The email address of the recipient.
     * @param content The content of the email to send.
     * @throws MessagingException If an error occurs while sending the email.
     */
    public void sendEmail(String recipientEmail, String content) throws MessagingException {
        Properties properties = new Properties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.host", "smtp.mailtrap.io");
        properties.put("mail.smtp.port", "2525");

        Session session = Session.getInstance(properties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication("9a4f765dbe185a", "929d826701bafa");
            }
        });

        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(generateRandomEmail()));
        message.setRecipient(Message.RecipientType.TO, new InternetAddress(recipientEmail));
        message.setSubject("User Credentials");
        message.setContent(content, "text/html");

        Transport.send(message);
    }
}