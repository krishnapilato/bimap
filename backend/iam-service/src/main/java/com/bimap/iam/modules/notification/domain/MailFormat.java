package com.bimap.iam.modules.notification.domain;

/// Whether the body of a message was markup or prose.
///
/// Derived from the body rather than declared by the caller — a sender who has to say twice what
/// they are sending has two chances to disagree with themselves.
///
/// @author Khova Krishna Pilato
public enum MailFormat {
    HTML,
    TEXT
}
