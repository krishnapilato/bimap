package com.bimap.iam.modules.notification.api;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.domain.MailAttachment;
import com.bimap.iam.modules.notification.dto.SendEmailRequest;
import com.bimap.iam.modules.notification.dto.SentEmailResponse;
import com.bimap.iam.modules.notification.repository.SentEmailRepository;
import com.bimap.iam.modules.notification.service.EmailLogService;
import com.bimap.iam.modules.notification.service.MailDispatcher;
import com.bimap.platform.web.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController implements NotificationApi {

    private final EmailLogService emailLog;
    private final SentEmailRepository repository;
    private final MailDispatcher dispatcher;

    @Override
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public PageResponse<SentEmailResponse> history(
            @RequestParam(required = false) String recipient,
            @RequestParam(required = false) DeliveryStatus status,
            @PageableDefault(size = 25, sort = "sentAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return emailLog.history(recipient, status, pageable);
    }

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public SentEmailResponse one(@PathVariable String id) {
        return repository.findByPublicId(id)
                .map(EmailLogService::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such message"));
    }

    @Override
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public SentEmailResponse send(@Valid @RequestBody SendEmailRequest request) {
        var outcome = dispatcher.sendComposed(
                request.to(), request.subject(), request.body(), decode(request.attachments()));

        return repository.findById(outcome.id())
                .map(EmailLogService::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "The message was sent but could not be read back"));
    }

    /// Rejects a payload that is not base64 rather than letting it reach the mail transport as
    /// something unreadable.
    private static List<MailAttachment> decode(List<SendEmailRequest.Attachment> attachments) {
        try {
            return attachments.stream()
                    .map(a -> new MailAttachment(
                            a.filename(), a.contentType(), Base64.getDecoder().decode(a.content())))
                    .toList();
        } catch (IllegalArgumentException malformed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An attachment is not valid base64");
        }
    }
}
