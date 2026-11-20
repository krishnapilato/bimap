package com.bimap.core;

import module java.base;

import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    public record Email(String to, String subject, String html) { }

    private final JavaMailSender mailSender;
    private final String from;

    public MailService(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void send(Email email) {
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(email.to());
            helper.setSubject(email.subject());
            helper.setText(email.html(), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new MailPreparationException("Could not prepare the email", e);
        }
    }
}
