package com.bimap.iam.modules.mailing.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class MergeTagsTest {

    @Test
    @DisplayName("known tags are filled in, with or without inner spacing")
    void fillsKnownTags() {
        var body = "Hello {{firstName}}, you are on {{ listName }}.";

        assertThat(MergeTags.apply(body, Map.of("firstName", "Giulia", "listName", "Bulletin"), false))
                .isEqualTo("Hello Giulia, you are on Bulletin.");
    }

    @Test
    @DisplayName("an unknown tag is left as written, so a typo shows up in the test send")
    void leavesUnknownTags() {
        assertThat(MergeTags.apply("Hi {{fristName}}", Map.of("firstName", "Giulia"), false))
                .isEqualTo("Hi {{fristName}}");
    }

    @Test
    @DisplayName("values are escaped in markup, because subscribers choose their own names")
    void escapesValuesInMarkup() {
        var values = Map.of("firstName", "<img src=x onerror=alert(1)>");

        assertThat(MergeTags.apply("<p>Hello {{firstName}}</p>", values, true))
                .isEqualTo("<p>Hello &lt;img src=x onerror=alert(1)&gt;</p>");
    }

    @Test
    @DisplayName("values containing replacement syntax are inserted literally")
    void treatsDollarSignsLiterally() {
        assertThat(MergeTags.apply("{{firstName}}", Map.of("firstName", "$1 \\ money"), false))
                .isEqualTo("$1 \\ money");
    }

    @Test
    @DisplayName("an empty or missing body passes through untouched")
    void toleratesEmptyBodies() {
        assertThat(MergeTags.apply(null, Map.of(), true)).isNull();
        assertThat(MergeTags.apply("", Map.of(), true)).isEmpty();
    }
}
