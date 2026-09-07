package com.bimap.iam.modules.user.dto;

/// Headline counts for the administration screen.
/// @author Khova Krishna Pilato
public record UserStatistics(long total, long active, long pendingActivation, long locked, long disabled) {
}
