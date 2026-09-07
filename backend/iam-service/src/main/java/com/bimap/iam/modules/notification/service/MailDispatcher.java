package com.bimap.iam.modules.notification.service;

import com.bimap.iam.modules.notification.domain.MailMessage;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

/// Renders a Thymeleaf template and posts it, off the request thread.
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class MailDispatcher {

    private final JavaMailSender transport;
    private final SpringTemplateEngine templateEngine;
    private final MailProperties properties;

    @Async("mailExecutor")
    public CompletableFuture<Void> send(MailMessage message) {
        if (!properties.enabled()) {
            log.info("Mail disabled, would have sent {} to {}", message.template(), message.to());
            return CompletableFuture.completedFuture(null);
        }

        try {
            transport.send(compose(message));
            log.info("Sent {} to {}", message.template(), message.to());
            return CompletableFuture.completedFuture(null);
        } catch (Exception failure) {
            log.error("Could not send {} to {}", message.template(), message.to(), failure);
            return CompletableFuture.failedFuture(failure);
        }
    }

    private MimeMessage compose(MailMessage message) throws Exception {
        var mime = transport.createMimeMessage();
        var helper = new MimeMessageHelper(mime, message.hasAttachments(), StandardCharsets.UTF_8.name());

        helper.setFrom(properties.from(), properties.fromName());
        helper.setTo(message.to());
        helper.setSubject(message.template().subject());
        helper.setText(render(message), true);

        if (properties.replyTo() != null && !properties.replyTo().isBlank()) {
            helper.setReplyTo(properties.replyTo());
        }
        for (var attachment : message.attachments()) {
            helper.addAttachment(attachment.filename(), attachment.asResource(), attachment.contentType());
        }
        return mime;
    }

    private String render(MailMessage message) {
        var context = new Context(Locale.of("it", "IT"));
        context.setVariables(message.model());
        context.setVariable("appBaseUrl", properties.appBaseUrl());
        context.setVariable("year", java.time.Year.now().getValue());
        return templateEngine.process(message.template().view(), context);
    }
}
