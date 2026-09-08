package com.bimap.iam.modules.notification.service;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.domain.MailAttachment;
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
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

/// Renders a Thymeleaf template and posts it, off the request thread.
///
/// Every attempt is written to the delivery log first and settled afterwards, so a message that is
/// still in flight, or one that failed, is as visible as one that arrived. The log is written in
/// its own transaction — evidence that disappears with a rolled-back request is not evidence.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class MailDispatcher {

    private final JavaMailSender transport;
    private final SpringTemplateEngine templateEngine;
    private final MailProperties properties;
    private final EmailLogService deliveryLog;

    @Async("mailExecutor")
    public CompletableFuture<Void> send(MailMessage message) {
        var rendered = render(message);
        var row = deliveryLog.record(message.to(), message.template().subject(), message.template().name(),
                rendered, message.attachments(), DeliveryStatus.QUEUED, null);

        if (!properties.enabled()) {
            log.info("Mail disabled, would have sent {} to {}", message.template(), message.to());
            return CompletableFuture.completedFuture(null);
        }

        try {
            transport.send(compose(message, rendered));
            deliveryLog.settle(row.getId(), DeliveryStatus.SENT, null);
            log.info("Sent {} to {}", message.template(), message.to());
            return CompletableFuture.completedFuture(null);
        } catch (Exception failure) {
            deliveryLog.settle(row.getId(), DeliveryStatus.FAILED, failure.getMessage());
            log.error("Could not send {} to {}", message.template(), message.to(), failure);
            return CompletableFuture.failedFuture(failure);
        }
    }

    /// A message written by hand rather than triggered by an event: no template, and the content
    /// type worked out from what the body actually contains.
    public SentEmailOutcome sendComposed(String to, String subject, String body, List<MailAttachment> attachments) {
        var row = deliveryLog.record(to, subject, null, body, attachments, DeliveryStatus.QUEUED, null);

        if (!properties.enabled()) {
            log.info("Mail disabled, would have sent an ad-hoc message to {}", to);
            return new SentEmailOutcome(row.getId(), DeliveryStatus.QUEUED, null);
        }

        try {
            var mime = transport.createMimeMessage();
            var helper = new MimeMessageHelper(mime, !attachments.isEmpty(), StandardCharsets.UTF_8.name());
            helper.setFrom(properties.from(), properties.fromName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, EmailLogService.formatOf(body) == com.bimap.iam.modules.notification.domain.MailFormat.HTML);

            for (var attachment : attachments) {
                helper.addAttachment(attachment.filename(), attachment.asResource(), attachment.contentType());
            }

            transport.send(mime);
            deliveryLog.settle(row.getId(), DeliveryStatus.SENT, null);
            return new SentEmailOutcome(row.getId(), DeliveryStatus.SENT, null);
        } catch (Exception failure) {
            deliveryLog.settle(row.getId(), DeliveryStatus.FAILED, failure.getMessage());
            log.error("Could not send an ad-hoc message to {}", to, failure);
            return new SentEmailOutcome(row.getId(), DeliveryStatus.FAILED, failure.getMessage());
        }
    }

    /// What happened, for a caller that is waiting on the answer rather than firing and forgetting.
    public record SentEmailOutcome(Long id, DeliveryStatus status, String failureReason) {
    }

    private MimeMessage compose(MailMessage message, String rendered) throws Exception {
        var mime = transport.createMimeMessage();
        var helper = new MimeMessageHelper(mime, message.hasAttachments(), StandardCharsets.UTF_8.name());

        helper.setFrom(properties.from(), properties.fromName());
        helper.setTo(message.to());
        helper.setSubject(message.template().subject());
        helper.setText(rendered, true);

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
