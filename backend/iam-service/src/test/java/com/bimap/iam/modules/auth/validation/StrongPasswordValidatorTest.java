package com.bimap.iam.modules.auth.validation;

import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class StrongPasswordValidatorTest {

    private final StrongPasswordValidator validator = new StrongPasswordValidator();
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        context = Mockito.mock(ConstraintValidatorContext.class);
        var builder = Mockito.mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        Mockito.when(context.buildConstraintViolationWithTemplate(Mockito.anyString())).thenReturn(builder);
    }

    @Test
    @DisplayName("a password meeting every rule is accepted")
    void acceptsAStrongPassword() {
        assertThat(validator.isValid("Cadastr0-Rilievo!", context)).isTrue();
    }

    @ParameterizedTest(name = "rejects {0}")
    @ValueSource(strings = {
            "Short1!",                     // under twelve characters
            "alllowercase123!",            // no uppercase
            "ALLUPPERCASE123!",            // no lowercase
            "NoDigitsAtAllHere!",          // no digit
            "NoSymbolsAtAll12345",         // no symbol
            "Has Whitespace 12!"           // whitespace
    })
    @DisplayName("a password missing any rule is rejected")
    void rejectsWeakPasswords(String candidate) {
        assertThat(validator.isValid(candidate, context)).isFalse();
    }

    @Test
    @DisplayName("null is left to @NotBlank, so an optional password stays optional")
    void tolerAtesNull() {
        assertThat(validator.isValid(null, context)).isTrue();
    }

    @Test
    @DisplayName("the message names every rule that was missed, not just the first")
    void reportsEveryUnmetRule() {
        var messages = org.mockito.ArgumentCaptor.forClass(String.class);

        validator.isValid("short", context);

        Mockito.verify(context).buildConstraintViolationWithTemplate(messages.capture());
        assertThat(messages.getValue())
                .contains("at least 12 characters")
                .contains("an uppercase letter")
                .contains("a digit")
                .contains("a symbol");
    }
}
