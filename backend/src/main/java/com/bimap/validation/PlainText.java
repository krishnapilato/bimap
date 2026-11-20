package com.bimap.validation;

import module java.base;
import jakarta.validation.Constraint;
import jakarta.validation.OverridesAttribute;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Size
@Pattern(regexp = "[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N} '’\".,;:?!()\\[\\]/+*&°_-]*")
@ReportAsSingleViolation
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface PlainText {

    String message() default "must start with a letter or number and use only letters, numbers and common punctuation.";

    @OverridesAttribute(constraint = Size.class, name = "max")
    int max() default 255;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
