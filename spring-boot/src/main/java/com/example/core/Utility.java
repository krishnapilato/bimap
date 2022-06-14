package com.example.core;

import java.io.BufferedReader;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Properties;

import org.springframework.stereotype.Service;

import com.example.beans.FormModel;

import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
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

	public void sendEmail(String email, String content) throws AddressException, MessagingException, IOException {
		Properties props = new Properties();
		props.put("mail.smtp.auth", "true");
		props.put("mail.smtp.starttls.enable", "true");
		props.put("mail.smtp.host", "smtp.mailtrap.io");
		props.put("mail.smtp.port", "2525");

		Session session = Session.getInstance(props, new jakarta.mail.Authenticator() {
			protected PasswordAuthentication getPasswordAuthentication() {
				return new PasswordAuthentication("59b1e4c1b90440", "94a25817592678");
			}
		});
		Message msg = new MimeMessage(session);
		msg.setFrom(new InternetAddress("system.admin@gmail.com", false));

		msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
		msg.setSubject("User Credentials");
		msg.setContent(content, "text/html");

		Transport.send(msg);
	}
}