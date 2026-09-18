package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.notification.domain.MailFormat;
import com.bimap.iam.modules.notification.service.EmailLogService;
import com.bimap.iam.modules.notification.service.MailProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.Year;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/// Turns a campaign into the message one recipient receives: personalised, wrapped in the list
/// layout with its unsubscribe footer, and with a plain-text alternative alongside the HTML.
/// @author Khova Krishna Pilato
@Component
@RequiredArgsConstructor
public class CampaignRenderer {

    private static final Pattern LINE_BREAKING = Pattern.compile("(?i)<br\\s*/?>|</p>|</div>|</h[1-6]>|</li>|</tr>");
    private static final Pattern TAG = Pattern.compile("<[^>]+>");
    private static final Pattern EXCESS_BLANK_LINES = Pattern.compile("\\n{3,}");

    private final SpringTemplateEngine templateEngine;
    private final MailProperties mail;

    public Rendered render(Campaign campaign, Recipient recipient) {
        var listName = campaign.getList().getName();
        var markup = EmailLogService.formatOf(campaign.getBody()) == MailFormat.HTML;
        var values = mergeValues(recipient, listName);

        var subject = MergeTags.apply(campaign.getSubject(), values, false);
        var preheader = MergeTags.apply(campaign.getPreheader(), values, false);
        var body = MergeTags.apply(campaign.getBody(), values, markup);

        var context = new Context(Locale.of("it", "IT"));
        context.setVariable("subject", subject);
        context.setVariable("preheader", preheader);
        context.setVariable("bodyHtml", markup ? body : paragraphs(body));
        context.setVariable("listName", listName);
        context.setVariable("email", recipient.email());
        context.setVariable("manageUrl", recipient.manageUrl());
        context.setVariable("appBaseUrl", mail.appBaseUrl());
        context.setVariable("year", Year.now().getValue());

        var html = templateEngine.process("mail/campaign", context);
        var text = (markup ? plainText(body) : body).strip() + footer(listName, recipient.manageUrl());
        return new Rendered(subject, html, text);
    }

    /// Who a message is for, and where their links go.
    /// @author Khova Krishna Pilato
    public record Recipient(String email, String firstName, String lastName, String manageUrl, String oneClickUrl) {
    }

    /// @author Khova Krishna Pilato
    public record Rendered(String subject, String html, String text) {
    }

    private static Map<String, String> mergeValues(Recipient recipient, String listName) {
        var first = nullToEmpty(recipient.firstName());
        var last = nullToEmpty(recipient.lastName());

        var values = new HashMap<String, String>();
        values.put("firstName", first);
        values.put("lastName", last);
        values.put("fullName", (first + " " + last).strip());
        values.put("email", recipient.email());
        values.put("listName", listName);
        values.put("manageUrl", recipient.manageUrl());
        values.put("unsubscribeUrl", recipient.manageUrl());
        return values;
    }

    /// Prose becomes paragraphs: a blank line starts a new one, a single newline stays a line break.
    static String paragraphs(String text) {
        return Arrays.stream(text.strip().split("\\R\\s*\\R"))
                .map(paragraph -> HtmlUtils.htmlEscape(paragraph.strip()).replaceAll("\\R", "<br/>"))
                .map(paragraph -> "<p style=\"margin:0 0 16px 0;\">" + paragraph + "</p>")
                .collect(Collectors.joining());
    }

    /// Good enough for the text part of a multipart message, which few clients ever show.
    static String plainText(String markup) {
        var withBreaks = LINE_BREAKING.matcher(markup).replaceAll("\n");
        var stripped = HtmlUtils.htmlUnescape(TAG.matcher(withBreaks).replaceAll(""));
        var lines = Arrays.stream(stripped.split("\\R")).map(String::strip).collect(Collectors.joining("\n"));
        return EXCESS_BLANK_LINES.matcher(lines).replaceAll("\n\n");
    }

    private static String footer(String listName, String manageUrl) {
        return "\n\n--\nYou are receiving this because you subscribed to %s.\nManage or unsubscribe: %s\n"
                .formatted(listName, manageUrl);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
