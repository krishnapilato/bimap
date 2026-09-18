package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.notification.service.MailProperties;
import com.bimap.iam.support.MailTemplateEngines;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class CampaignRendererTest {

    private final CampaignRenderer renderer = new CampaignRenderer(MailTemplateEngines.standalone(),
            new MailProperties("no-reply@example.com", "BiMap", null, "https://app.example.com", true));

    private static final CampaignRenderer.Recipient GIULIA = new CampaignRenderer.Recipient(
            "giulia.rossi@example.com", "Giulia", "Rossi",
            "https://app.example.com/subscriptions/manage?token=t", "https://api.example.com/one-click?token=t");

    private static Campaign campaign(String subject, String body) {
        var list = MailingList.builder().name("Heritage bulletin").build();
        return Campaign.builder().list(list).subject(subject).preheader("Preview for {{firstName}}").body(body).build();
    }

    @Test
    @DisplayName("markup is personalised and framed with the list footer and a way out")
    void rendersMarkup() {
        var rendered = renderer.render(campaign("News for {{firstName}}", "<p>Hello {{fullName}}</p>"), GIULIA);

        assertThat(rendered.subject()).isEqualTo("News for Giulia");
        assertThat(rendered.html())
                .contains("<p>Hello Giulia Rossi</p>")
                .contains("Preview for Giulia")
                .contains("Heritage bulletin")
                .contains("https://app.example.com/subscriptions/manage?token=t");
        assertThat(rendered.text())
                .startsWith("Hello Giulia Rossi")
                .contains("Manage or unsubscribe: https://app.example.com/subscriptions/manage?token=t");
    }

    @Test
    @DisplayName("prose becomes escaped paragraphs in the HTML part and stays prose in the text part")
    void rendersProse() {
        var rendered = renderer.render(campaign("Plain", "Hello {{firstName}} & friends\n\nSecond line\nwraps"), GIULIA);

        assertThat(rendered.html())
                .contains("Hello Giulia &amp; friends</p>")
                .contains("Second line<br/>wraps</p>");
        assertThat(rendered.text()).startsWith("Hello Giulia & friends\n\nSecond line\nwraps");
    }

    @Test
    @DisplayName("the text alternative keeps line structure and drops the tags")
    void derivesPlainTextFromMarkup() {
        assertThat(CampaignRenderer.plainText("<h1>Title</h1><p>One &amp; two<br>three</p>"))
                .isEqualTo("Title\nOne & two\nthree");
    }
}
