package com.bimap.iam.modules.notification.service;

import com.bimap.iam.modules.notification.domain.MailTemplate;
import com.bimap.iam.support.MailTemplateEngines;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.thymeleaf.context.Context;

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/// Renders every transactional template, so a broken fragment fails the build instead of a send.
/// @author Khova Krishna Pilato
class MailTemplatesTest {

    private static final Map<String, Object> MODEL = Map.of(
            "firstName", "Giulia",
            "fullName", "Giulia Rossi",
            "email", "giulia.rossi@example.com",
            "activationLink", "https://app.example.com/auth/activate?token=abc",
            "resetLink", "https://app.example.com/auth/reset-password?token=abc",
            "confirmLink", "https://app.example.com/subscriptions/confirm?token=abc",
            "listName", "Heritage bulletin",
            "validForHours", 48,
            "validForMinutes", 60,
            "lockedForMinutes", 15);

    @ParameterizedTest(name = "{0}")
    @EnumSource(MailTemplate.class)
    @DisplayName("every template renders inside the shared layout")
    void rendersEveryTemplate(MailTemplate template) {
        var context = new Context(Locale.ITALY);
        context.setVariables(MODEL);
        context.setVariable("appBaseUrl", "https://app.example.com");
        context.setVariable("year", 2026);

        var html = MailTemplateEngines.standalone().process(template.view(), context);

        assertThat(html)
                .contains("BiMap")
                .contains("giulia.rossi@example.com")
                .doesNotContainPattern("\sth:[a-z]+=");
    }

    @Test
    @DisplayName("a list email explains the list, not an account")
    void listEmailsUseTheListFooter() {
        var context = new Context(Locale.ITALY);
        context.setVariables(MODEL);
        context.setVariable("year", 2026);

        var html = MailTemplateEngines.standalone().process(MailTemplate.SUBSCRIPTION_CONFIRMATION.view(), context);

        assertThat(html)
                .contains("Heritage bulletin")
                .contains("https://app.example.com/subscriptions/confirm?token=abc")
                .doesNotContain("an account exists");
    }
}
