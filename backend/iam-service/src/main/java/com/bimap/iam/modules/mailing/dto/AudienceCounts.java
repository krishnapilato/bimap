package com.bimap.iam.modules.mailing.dto;

/// How many addresses sit in each subscription state.
/// @author Khova Krishna Pilato
public record AudienceCounts(long total, long subscribed, long pending, long unsubscribed) {

    public static final AudienceCounts EMPTY = new AudienceCounts(0, 0, 0, 0);

    public static AudienceCounts of(long subscribed, long pending, long unsubscribed) {
        return new AudienceCounts(subscribed + pending + unsubscribed, subscribed, pending, unsubscribed);
    }
}
