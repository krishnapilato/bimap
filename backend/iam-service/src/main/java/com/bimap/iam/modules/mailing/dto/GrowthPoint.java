package com.bimap.iam.modules.mailing.dto;

import java.time.LocalDate;

/// One UTC day of audience movement.
/// @author Khova Krishna Pilato
public record GrowthPoint(LocalDate date, long subscribed, long unsubscribed) {
}
