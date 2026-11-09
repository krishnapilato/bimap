package com.bimap.validation;

import module java.base;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Email
@Size(max = 256)
@Pattern(regexp = "[A-Za-z0-9._%+-]++@(?![^@]*\\.\\.)[A-Za-z0-9-]++\\.[A-Za-z0-9.-]++(?<!\\.)")
@ReportAsSingleViolation
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface EmailAddress {

    String message() default "must be a well-formed email address.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
