package com.bimap.iam.modules.notification.service;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.domain.MailAttachment;
import com.bimap.iam.modules.notification.domain.MailFormat;
import com.bimap.iam.modules.notification.domain.SentEmail;
import com.bimap.iam.modules.notification.dto.SentEmailResponse;
import com.bimap.iam.modules.notification.repository.SentEmailRepository;
import com.bimap.platform.web.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/// Writes and reads the delivery log.
///
/// Recording runs in its own transaction. The alternative is a log that disappears exactly when it
/// is most wanted: a send that fails inside a rolled-back request would take its own evidence with
/// it, and "there is no record of it" is the least useful thing an audit trail can say.
///
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailLogService {

    /// A tag with a known name and a closing bracket: loose enough for real markup, tight enough
    /// that prose containing a comparison or an arrow is still prose.
    private static final Pattern MARKUP = Pattern.compile("<([a-z][a-z0-9]*)\\b[^>]*>", Pattern.CASE_INSENSITIVE);

    private static final int MAX_BODY = 100_000;

    private final SentEmailRepository repository;

    public static MailFormat formatOf(String body) {
        return body != null && MARKUP.matcher(body).find() ? MailFormat.HTML : MailFormat.TEXT;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SentEmail record(String recipient,
                            String subject,
                            String template,
                            String body,
                            List<MailAttachment> attachments,
                            DeliveryStatus status,
                            String failureReason) {

        var row = SentEmail.builder()
                .publicId(UUID.randomUUID().toString())
                .recipient(recipient)
                .subject(subject)
                .template(template)
                .format(formatOf(body))
                .status(status)
                .body(truncate(body))
                .attachmentSummary(summarise(attachments))
                .failureReason(truncate(failureReason, 512))
                .sentAt(Instant.now())
                .build();

        return repository.save(row);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settle(Long id, DeliveryStatus status, String failureReason) {
        repository.findById(id).ifPresent(row -> {
            row.setStatus(status);
            row.setFailureReason(truncate(failureReason, 512));
            repository.save(row);
        });
    }

    @Transactional(readOnly = true)
    public PageResponse<SentEmailResponse> history(String recipient, DeliveryStatus status, Pageable pageable) {
        var page = repository.search(blankToNull(recipient), status, pageable);
        return PageResponse.of(page.map(EmailLogService::toResponse));
    }

    @Transactional(readOnly = true)
    public long countByStatus(DeliveryStatus status) {
        return repository.countByStatus(status);
    }

    public static SentEmailResponse toResponse(SentEmail row) {
        return new SentEmailResponse(
                row.getPublicId(),
                row.getRecipient(),
                row.getSubject(),
                row.getTemplate(),
                row.getFormat(),
                row.getStatus(),
                row.getBody(),
                parseAttachments(row.getAttachmentSummary()),
                row.getFailureReason(),
                row.getSentAt());
    }

    /// `name:bytes` pairs, separated by `|`. A filename containing either character is escaped by
    /// dropping it, which is safe here: this string is a description, never an instruction.
    private static String summarise(List<MailAttachment> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        return attachments.stream()
                .map(a -> a.filename().replace('|', ' ').replace(':', ' ') + ":" + a.size())
                .reduce((left, right) -> left + "|" + right)
                .orElse(null);
    }

    private static List<SentEmailResponse.AttachmentSummary> parseAttachments(String summary) {
        if (summary == null || summary.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(summary.split("\\|"))
                .map(entry -> {
                    var split = entry.lastIndexOf(':');
                    if (split < 0) {
                        return new SentEmailResponse.AttachmentSummary(entry, 0L);
                    }
                    var size = 0L;
                    try {
                        size = Long.parseLong(entry.substring(split + 1));
                    } catch (NumberFormatException ignored) {
                        // A malformed row is still worth showing; only its size is unknown.
                    }
                    return new SentEmailResponse.AttachmentSummary(entry.substring(0, split), size);
                })
                .toList();
    }

    private static String truncate(String value) {
        return truncate(value, MAX_BODY);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
