package com.bimap.iam.modules.notification.service;

import com.bimap.iam.modules.notification.domain.MailAttachment;
import com.bimap.iam.modules.notification.domain.MailMessage;
import com.bimap.iam.modules.notification.domain.MailTemplate;
import com.bimap.iam.modules.user.domain.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/// The events worth emailing about, in the language of the domain.
/// @author Khova Krishna Pilato
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final MailDispatcher mailDispatcher;
    private final MailProperties properties;

    public void sendActivation(UserAccount account, String token, Duration validFor) {
        mailDispatcher.send(base(account, MailTemplate.ACCOUNT_ACTIVATION)
                .with("activationLink", properties.activationLink(token))
                .with("validForHours", validFor.toHours())
                .build());
    }

    public void sendInvitation(UserAccount account, String token, Duration validFor, String invitedBy) {
        mailDispatcher.send(base(account, MailTemplate.ACCOUNT_INVITATION)
                .with("activationLink", properties.activationLink(token))
                .with("validForHours", validFor.toHours())
                .with("invitedBy", invitedBy)
                .with("role", account.getRole().name())
                .build());
    }

    public void sendWelcome(UserAccount account) {
        mailDispatcher.send(base(account, MailTemplate.WELCOME).build());
    }

    public void sendPasswordReset(UserAccount account, String token, Duration validFor) {
        mailDispatcher.send(base(account, MailTemplate.PASSWORD_RESET)
                .with("resetLink", properties.passwordResetLink(token))
                .with("validForMinutes", validFor.toMinutes())
                .build());
    }

    public void sendPasswordChanged(UserAccount account) {
        mailDispatcher.send(base(account, MailTemplate.PASSWORD_CHANGED).build());
    }

    public void sendAccountLocked(UserAccount account, Duration lockedFor) {
        mailDispatcher.send(base(account, MailTemplate.ACCOUNT_LOCKED)
                .with("lockedForMinutes", lockedFor.toMinutes())
                .build());
    }

    /// Escape hatch for reports and exports that need to reach an inbox.
    public void sendWithAttachments(UserAccount account, MailTemplate template, List<MailAttachment> attachments) {
        var builder = base(account, template);
        attachments.forEach(builder::attach);
        mailDispatcher.send(builder.build());
    }

    private MailMessage.Builder base(UserAccount account, MailTemplate template) {
        return MailMessage.to(account.getEmail())
                .template(template)
                .with("firstName", account.getFirstName())
                .with("fullName", account.fullName())
                .with("email", account.getEmail());
    }
}
