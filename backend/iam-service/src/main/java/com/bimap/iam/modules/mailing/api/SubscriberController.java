package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.dto.SubscriberImportReport;
import com.bimap.iam.modules.mailing.dto.SubscriberImportRequest;
import com.bimap.iam.modules.mailing.dto.SubscriberRequest;
import com.bimap.iam.modules.mailing.dto.SubscriberStatusChange;
import com.bimap.iam.modules.mailing.dto.SubscriberUpdate;
import com.bimap.iam.modules.mailing.dto.SubscriberView;
import com.bimap.iam.modules.mailing.service.SubscriberService;
import com.bimap.platform.error.UpstreamServiceException;
import com.bimap.platform.web.PageResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/mailing-lists/{listId}/subscribers")
@RequiredArgsConstructor
public class SubscriberController implements SubscriberApi {

    private final SubscriberService subscribers;

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('mailing:read')")
    public PageResponse<SubscriberView> search(
            @PathVariable String listId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) SubscriptionStatus status,
            @PageableDefault(size = 25, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return subscribers.search(listId, q, status, pageable);
    }

    /// Mapped before `/{subscriberId}` on purpose, and without `produces`, for the same reason the
    /// registration export is: a restrictive `Accept` must not turn it into a lookup for "export".
    @Override
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('mailing:read')")
    public void exportCsv(@PathVariable String listId,
                          @RequestParam(required = false) SubscriptionStatus status,
                          HttpServletResponse response) {
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"%s\"".formatted(subscribers.exportFilename(listId)));
        try {
            subscribers.exportCsv(listId, status, response.getOutputStream());
        } catch (IOException failure) {
            throw new UpstreamServiceException("csv-export", "the export could not be written", failure);
        }
    }

    @Override
    @GetMapping("/{subscriberId}")
    @PreAuthorize("hasAuthority('mailing:read')")
    public SubscriberView findOne(@PathVariable String listId, @PathVariable String subscriberId) {
        return subscribers.findOne(listId, subscriberId);
    }

    @Override
    @PostMapping
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<SubscriberView> add(@PathVariable String listId,
                                              @Valid @RequestBody SubscriberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(subscribers.add(listId, request));
    }

    @Override
    @PostMapping("/import")
    @PreAuthorize("hasAuthority('mailing:write')")
    public SubscriberImportReport importRows(@PathVariable String listId,
                                             @Valid @RequestBody SubscriberImportRequest request) {
        return subscribers.importRows(listId, request);
    }

    @Override
    @PatchMapping("/{subscriberId}")
    @PreAuthorize("hasAuthority('mailing:write')")
    public SubscriberView update(@PathVariable String listId, @PathVariable String subscriberId,
                                 @Valid @RequestBody SubscriberUpdate update) {
        return subscribers.update(listId, subscriberId, update);
    }

    @Override
    @PutMapping("/{subscriberId}/status")
    @PreAuthorize("hasAuthority('mailing:write')")
    public SubscriberView changeStatus(@PathVariable String listId, @PathVariable String subscriberId,
                                       @Valid @RequestBody SubscriberStatusChange change) {
        return subscribers.changeStatus(listId, subscriberId, change);
    }

    @Override
    @PostMapping("/{subscriberId}/confirmation")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<Void> resendConfirmation(@PathVariable String listId, @PathVariable String subscriberId) {
        subscribers.resendConfirmation(listId, subscriberId);
        return ResponseEntity.accepted().build();
    }

    @Override
    @DeleteMapping("/{subscriberId}")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<Void> remove(@PathVariable String listId, @PathVariable String subscriberId) {
        subscribers.remove(listId, subscriberId);
        return ResponseEntity.noContent().build();
    }
}
