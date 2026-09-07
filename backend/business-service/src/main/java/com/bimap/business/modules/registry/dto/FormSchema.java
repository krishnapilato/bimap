package com.bimap.business.modules.registry.dto;

import java.util.List;

/// The registration form, described by the server that validates it.
///
/// The client renders whatever comes back rather than shipping its own copy of the field list,
/// so a new field is added in one place and both sides agree on its rules.
///
/// @param cascade The guided order the surveyor is walked through, as field names. Each field in
///                this list narrows the next, and a client can drive the whole flow from it
///                without hard-coding the sequence.
/// @author Khova Krishna Pilato
public record FormSchema(
        String id,
        String title,
        String version,
        List<String> cascade,
        List<FormSection> sections) {

    public FormSchema {
        cascade = cascade == null ? List.of() : List.copyOf(cascade);
        sections = sections == null ? List.of() : List.copyOf(sections);
    }
}
