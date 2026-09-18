package com.bimap.iam.modules.mailing.service;

import org.springframework.web.util.HtmlUtils;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/// Fills `{{firstName}}`-style placeholders in a campaign for one recipient.
///
/// Values are escaped when the body is markup, because a subscriber chooses their own name and a
/// name is not allowed to become HTML in someone else's inbox. Unknown tags are left as written, so
/// a typo shows up in the test send rather than silently vanishing.
///
/// @author Khova Krishna Pilato
public final class MergeTags {

    /// Every tag a campaign body may use.
    public static final List<String> SUPPORTED = List.of(
            "firstName", "lastName", "fullName", "email", "listName", "manageUrl", "unsubscribeUrl");

    private static final Pattern TAG = Pattern.compile("\\{\\{\\s*([A-Za-z]+)\\s*}}");

    private MergeTags() {
    }

    public static String apply(String body, Map<String, String> values, boolean markup) {
        if (body == null || body.isEmpty()) {
            return body;
        }
        return TAG.matcher(body).replaceAll(match -> {
            var value = values.get(match.group(1));
            if (value == null) {
                return Matcher.quoteReplacement(match.group());
            }
            return Matcher.quoteReplacement(markup ? HtmlUtils.htmlEscape(value) : value);
        });
    }
}
