package com.bimap.iam.modules.notification.domain;

/// Every transactional email the platform sends, bound to its Thymeleaf view and subject.
/// @author Khova Krishna Pilato
public enum MailTemplate {

    ACCOUNT_ACTIVATION("mail/account-activation", "Confirm your BiMap account"),
    ACCOUNT_INVITATION("mail/account-invitation", "You have been invited to BiMap"),
    WELCOME("mail/welcome", "Welcome to BiMap"),
    PASSWORD_RESET("mail/password-reset", "Reset your BiMap password"),
    PASSWORD_CHANGED("mail/password-changed", "Your BiMap password was changed"),
    ACCOUNT_LOCKED("mail/account-locked", "Your BiMap account has been locked");

    private final String view;
    private final String subject;

    MailTemplate(String view, String subject) {
        this.view = view;
        this.subject = subject;
    }

    public String view() {
        return view;
    }

    public String subject() {
        return subject;
    }
}
