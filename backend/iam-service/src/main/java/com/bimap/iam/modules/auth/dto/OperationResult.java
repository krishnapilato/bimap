package com.bimap.iam.modules.auth.dto;

/// Acknowledgement for flows that deliberately reveal nothing else.
/// @author Khova Krishna Pilato
public record OperationResult(String message) {

    public static OperationResult of(String message) {
        return new OperationResult(message);
    }
}
