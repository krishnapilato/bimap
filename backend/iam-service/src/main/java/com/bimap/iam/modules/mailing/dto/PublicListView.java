package com.bimap.iam.modules.mailing.dto;

/// What the public subscription page may show about a list.
/// @author Khova Krishna Pilato
public record PublicListView(String id, String name, String description, boolean doubleOptIn) {
}
