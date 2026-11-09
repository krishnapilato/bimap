package com.bimap.validation;

import module java.base;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Size(max = 100)
@Pattern(regexp = "\\p{L}[\\p{L}\\p{M} '’.-]*")
@ReportAsSingleViolation
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface PersonName {

    String message() default "must contain only letters, spaces, apostrophes, dots and hyphens.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
