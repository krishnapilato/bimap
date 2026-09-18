package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.mailing.domain.MailingListStatus;
import com.bimap.iam.modules.mailing.dto.GrowthPoint;
import com.bimap.iam.modules.mailing.dto.MailingListRequest;
import com.bimap.iam.modules.mailing.dto.MailingListStatusChange;
import com.bimap.iam.modules.mailing.dto.MailingListUpdate;
import com.bimap.iam.modules.mailing.dto.MailingListView;
import com.bimap.iam.modules.mailing.dto.MailingOverview;
import com.bimap.iam.modules.mailing.service.MailingListService;
import com.bimap.platform.web.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
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

import java.util.List;

/// @author Khova Krishna Pilato
@Validated
@RestController
@RequestMapping("/api/v1/mailing-lists")
@RequiredArgsConstructor
public class MailingListController implements MailingListApi {

    private final MailingListService lists;

    @Override
    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('mailing:read')")
    public MailingOverview overview() {
        return lists.overview();
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('mailing:read')")
    public PageResponse<MailingListView> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) MailingListStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return lists.search(q, status, pageable);
    }

    @Override
    @GetMapping("/{listId}")
    @PreAuthorize("hasAuthority('mailing:read')")
    public MailingListView findOne(@PathVariable String listId) {
        return lists.findOne(listId);
    }

    @Override
    @PostMapping
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<MailingListView> create(@Valid @RequestBody MailingListRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lists.create(request));
    }

    @Override
    @PatchMapping("/{listId}")
    @PreAuthorize("hasAuthority('mailing:write')")
    public MailingListView update(@PathVariable String listId, @Valid @RequestBody MailingListUpdate update) {
        return lists.update(listId, update);
    }

    @Override
    @PutMapping("/{listId}/status")
    @PreAuthorize("hasAuthority('mailing:write')")
    public MailingListView changeStatus(@PathVariable String listId,
                                        @Valid @RequestBody MailingListStatusChange change) {
        return lists.changeStatus(listId, change);
    }

    @Override
    @DeleteMapping("/{listId}")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<Void> delete(@PathVariable String listId) {
        lists.delete(listId);
        return ResponseEntity.noContent().build();
    }

    @Override
    @GetMapping("/{listId}/growth")
    @PreAuthorize("hasAuthority('mailing:read')")
    public List<GrowthPoint> growth(@PathVariable String listId,
                                    @RequestParam(required = false, defaultValue = "30") int days) {
        return lists.growth(listId, days);
    }
}
