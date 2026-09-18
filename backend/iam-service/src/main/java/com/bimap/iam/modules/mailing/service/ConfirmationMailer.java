package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.notification.domain.MailMessage;
import com.bimap.iam.modules.notification.domain.MailTemplate;
import com.bimap.iam.modules.notification.service.MailDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/// Sends confirmation links after the subscribers they confirm actually exist.
///
/// Listening after commit means a rolled-back import sends nothing, and pacing the batch on one
/// virtual thread keeps a five-thousand-row import from opening five thousand SMTP connections.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class ConfirmationMailer {

    private final MailDispatcher dispatcher;
    private final MailingProperties properties;

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onConfirmationsRequested(ConfirmationsRequested event) {
        var remaining = event.confirmations().size();

        for (var confirmation : event.confirmations()) {
            dispatcher.deliver(message(confirmation));
            if (--remaining > 0 && !pause()) {
                log.warn("Stopped sending confirmations with {} still to go", remaining);
                return;
            }
        }
    }

    private static MailMessage message(ConfirmationsRequested.Confirmation confirmation) {
        var message = MailMessage.to(confirmation.email())
                .template(MailTemplate.SUBSCRIPTION_CONFIRMATION)
                .subject("Confirm your subscription to " + confirmation.listName())
                .with("email", confirmation.email())
                .with("listName", confirmation.listName())
                .with("confirmLink", confirmation.confirmLink());

        if (confirmation.firstName() != null) {
            message.with("firstName", confirmation.firstName());
        }
        return message.build();
    }

    private boolean pause() {
        try {
            Thread.sleep(properties.sendInterval());
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
