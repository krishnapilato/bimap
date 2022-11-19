package com.example.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Properties;
import java.util.Random;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

import org.springframework.stereotype.Service;

import com.example.beans.FormModel;

import lombok.Cleanup;

@Service
public class Utility {

	// Attributes

	private final String DIRECTORY_PATH = "C:\\Simple Map Exercise\\", CSV_FILE_PATH = DIRECTORY_PATH + "csv_file.csv";

	// Create directory and files

	public void createFiles() throws IOException {
		Files.createDirectories(Paths.get(DIRECTORY_PATH));
		new File(CSV_FILE_PATH).createNewFile();
	}

	// Count rows in a file

	public int countFileRows(String fileName) throws IOException {
		@Cleanup
		BufferedReader bufferedReader = new BufferedReader(new FileReader(fileName));
		int fileRows = 0;
		while (bufferedReader.readLine() != null)
			fileRows++;
		return fileRows;
	}

	// Write new data in a CSV file (change with OpenCSV)

	public void writeCSVFile(FormModel formModel) throws IOException {
		@Cleanup
		FileWriter fileWriter = new FileWriter(new File(CSV_FILE_PATH), true);
		fileWriter.append(Integer.toString(countFileRows(CSV_FILE_PATH)) + ", ");
		fileWriter.append(formModel.getRegion() + ", ");
		fileWriter.append(formModel.getProvince() + ", ");
		fileWriter.append(formModel.getMunicipality() + ", ");
		fileWriter.append(formModel.getNumber() + ", ");
		fileWriter.append(formModel.getGoodNaming() + ", ");
		fileWriter.append(formModel.getGoodID() + ", ");
		fileWriter.append(formModel.getIstatCode() + ", ");
		fileWriter.append(formModel.getLatitude() + ", ");
		fileWriter.append(formModel.getLongitude() + "\n");
	}

	private static String generateRandomEmail(int length) {
		final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		StringBuilder stringBuilder = new StringBuilder();
		Random random = new Random();
		while (stringBuilder.length() < length) {
			stringBuilder.append(CHARACTERS.charAt((int) (random.nextFloat() * CHARACTERS.length())));
		}
		return stringBuilder.toString().toLowerCase() + "@gmail.com";
	}

	public void sendEmail(String recipientEmail, String content)
			throws AddressException, MessagingException, IOException {
		Properties properties = new Properties();
		properties.put("mail.smtp.auth", "true");
		properties.put("mail.smtp.starttls.enable", "true");
		properties.put("mail.smtp.host", "smtp.mailtrap.io");
		properties.put("mail.smtp.port", "2525");

		final Session session = Session.getInstance(properties, new javax.mail.Authenticator() {
			@Override
			protected PasswordAuthentication getPasswordAuthentication() {
				return new PasswordAuthentication("9a4f765dbe185a", "929d826701bafa");
			}
		});

		Message message = new MimeMessage(session);
		message.setFrom(new InternetAddress(generateRandomEmail(16), false));
		message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipientEmail));
		message.setSubject("User Credentials");
		message.setContent(content, "text/html");

		Transport.send(message);
		properties.clear();
	}
}