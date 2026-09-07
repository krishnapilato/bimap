package com.bimap.iam.modules.notification.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/// One rendered-and-ready email: recipient, template, model, and any attachments.
/// @author Khova Krishna Pilato
public record MailMessage(String to, MailTemplate template, Map<String, Object> model, List<MailAttachment> attachments) {

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

    /// @author Khova Krishna Pilato
    public static final class Builder {

        private final String to;
        private final Map<String, Object> model = new LinkedHashMap<>();
        private final List<MailAttachment> attachments = new java.util.ArrayList<>();
        private MailTemplate template;

        private Builder(String to) {
            this.to = to;
        }

        public Builder template(MailTemplate value) {
            this.template = value;
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
            return new MailMessage(to, template, model, attachments);
        }
    }
}
