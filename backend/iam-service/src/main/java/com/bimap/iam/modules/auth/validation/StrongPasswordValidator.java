package com.bimap.iam.modules.auth.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;
import java.util.function.Predicate;

/// Reports every rule a password breaks, not just the first.
/// @author Khova Krishna Pilato
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    private static final int MIN_LENGTH = 12;
    private static final int MAX_LENGTH = 128;

    private record Rule(String requirement, Predicate<String> satisfiedBy) {
    }

    private static final List<Rule> RULES = List.of(
            new Rule("at least %d characters".formatted(MIN_LENGTH), value -> value.length() >= MIN_LENGTH),
            new Rule("at most %d characters".formatted(MAX_LENGTH), value -> value.length() <= MAX_LENGTH),
            new Rule("an uppercase letter", value -> value.chars().anyMatch(Character::isUpperCase)),
            new Rule("a lowercase letter", value -> value.chars().anyMatch(Character::isLowerCase)),
            new Rule("a digit", value -> value.chars().anyMatch(Character::isDigit)),
            new Rule("a symbol", value -> value.chars().anyMatch(codePoint ->
                    !Character.isLetterOrDigit(codePoint) && !Character.isWhitespace(codePoint))),
            new Rule("no whitespace", value -> value.chars().noneMatch(Character::isWhitespace)));

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return true;
        }

        var unmet = RULES.stream()
                .filter(rule -> !rule.satisfiedBy().test(password))
                .map(Rule::requirement)
                .toList();

        return unmet.isEmpty() || reject(context, "Password needs " + String.join(", ", unmet));
    }

    private static boolean reject(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        return false;
    }
}
