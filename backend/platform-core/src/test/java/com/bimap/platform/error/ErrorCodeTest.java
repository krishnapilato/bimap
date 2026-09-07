package com.bimap.platform.error;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class ErrorCodeTest {

    @ParameterizedTest
    @EnumSource(ErrorCode.class)
    @DisplayName("every code has a status, a title and a URI-safe slug")
    void everyCodeIsComplete(ErrorCode code) {
        assertThat(code.status()).isNotNull();
        assertThat(code.title()).isNotBlank();
        assertThat(code.slug()).matches("[a-z-]+");
    }

    @Test
    @DisplayName("slugs are unique, so the problem type identifies exactly one failure")
    void slugsAreUnique() {
        var slugs = Arrays.stream(ErrorCode.values()).map(ErrorCode::slug).distinct().count();
        assertThat(slugs).isEqualTo(ErrorCode.values().length);
    }

    @ParameterizedTest
    @EnumSource(ErrorCode.class)
    @DisplayName("no code maps to a 2xx, which would make a failure look like a success")
    void neverReportsSuccess(ErrorCode code) {
        assertThat(code.status().isError()).isTrue();
    }
}
