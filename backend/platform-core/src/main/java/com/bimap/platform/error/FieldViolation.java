package com.bimap.platform.error;

/// One rejected input, flattened so a form can bind the message straight to a control.
/// @author Khova Krishna Pilato
public record FieldViolation(String field, String message, Object rejectedValue) {
}
