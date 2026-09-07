package com.bimap.business.modules.registry.dto;

import java.util.List;

/// One field of the registration form, described well enough for a client to render and
/// validate it without hard-coding anything.
///
/// @param lookupUrl Endpoint an AUTOCOMPLETE field queries, with `q` and `limit`.
/// @param dependsOn Field whose value narrows this one, e.g. province depends on region.
/// @param pattern   Same regular expression the server validates with, so both agree.
/// @author Khova Krishna Pilato
public record FormField(
        String name,
        String label,
        FieldType type,
        boolean required,
        Integer maxLength,
        String pattern,
        String placeholder,
        String help,
        String lookupUrl,
        String dependsOn,
        List<FieldOption> options) {

    public static Builder named(String name, String label, FieldType type) {
        return new Builder(name, label, type);
    }

    /// @author Khova Krishna Pilato
    public static final class Builder {

        private final String name;
        private final String label;
        private final FieldType type;
        private boolean required;
        private Integer maxLength;
        private String pattern;
        private String placeholder;
        private String help;
        private String lookupUrl;
        private String dependsOn;
        private List<FieldOption> options = List.of();

        private Builder(String name, String label, FieldType type) {
            this.name = name;
            this.label = label;
            this.type = type;
        }

        public Builder required() {
            this.required = true;
            return this;
        }

        public Builder maxLength(int value) {
            this.maxLength = value;
            return this;
        }

        public Builder pattern(String value) {
            this.pattern = value;
            return this;
        }

        public Builder placeholder(String value) {
            this.placeholder = value;
            return this;
        }

        public Builder help(String value) {
            this.help = value;
            return this;
        }

        public Builder lookup(String url, String dependsOnField) {
            this.lookupUrl = url;
            this.dependsOn = dependsOnField;
            return this;
        }

        public Builder options(List<FieldOption> values) {
            this.options = List.copyOf(values);
            return this;
        }

        public FormField build() {
            return new FormField(name, label, type, required, maxLength, pattern,
                    placeholder, help, lookupUrl, dependsOn, options);
        }
    }
}
