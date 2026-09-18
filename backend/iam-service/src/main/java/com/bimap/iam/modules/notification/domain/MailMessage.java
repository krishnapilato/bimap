package com.bimap.iam.modules.notification.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/// One rendered-and-ready email: recipient, template, model, and any attachments.
///
/// @param subject Replaces the template's own subject when a message needs a specific one, such as
///                naming the list a confirmation is for. Null keeps the template's.
/// @author Khova Krishna Pilato
public record MailMessage(String to, MailTemplate template, String subject, Map<String, Object> model,
                          List<MailAttachment> attachments) {

    public MailMessage {
        model = model == null ? Map.of() : Map.copyOf(model);
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    public static Builder to(String recipient) {
        return new Builder(recipient);
    }

    public boolean hasAttachments() {
        return !attachments.isEmpty();
    }

    public String resolvedSubject() {
        return subject == null || subject.isBlank() ? template.subject() : subject;
    }

    /// @author Khova Krishna Pilato
    public static final class Builder {

        private final String to;
        private final Map<String, Object> model = new LinkedHashMap<>();
        private final List<MailAttachment> attachments = new java.util.ArrayList<>();
        private MailTemplate template;
        private String subject;

        private Builder(String to) {
            this.to = to;
        }

        public Builder template(MailTemplate value) {
            this.template = value;
            return this;
        }

        public Builder subject(String value) {
            this.subject = value;
            return this;
        }

        public Builder with(String key, Object value) {
            model.put(key, value);
            return this;
        }

        public Builder attach(MailAttachment attachment) {
            attachments.add(attachment);
            return this;
        }

        public MailMessage build() {
            return new MailMessage(to, template, subject, model, attachments);
        }
    }
}
