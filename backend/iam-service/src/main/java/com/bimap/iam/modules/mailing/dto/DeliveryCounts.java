package com.bimap.iam.modules.mailing.dto;

/// Delivery-log outcomes for a set of campaign messages.
/// @author Khova Krishna Pilato
public record DeliveryCounts(long queued, long sent, long failed) {

    public static final DeliveryCounts EMPTY = new DeliveryCounts(0, 0, 0);
}
