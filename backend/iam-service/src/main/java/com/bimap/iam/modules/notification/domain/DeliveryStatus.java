package com.bimap.iam.modules.notification.domain;

/// What became of one outgoing message.
///
/// `QUEUED` is not a promise that anything was sent: it is what a row says while the relay is
/// disabled, or before the async dispatch has come back with an answer.
///
/// @author Khova Krishna Pilato
public enum DeliveryStatus {
    QUEUED,
    SENT,
    FAILED
}
