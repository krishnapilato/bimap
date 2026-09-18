package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.dto.CampaignRequest;
import com.bimap.iam.modules.mailing.dto.CampaignSchedule;
import com.bimap.iam.modules.mailing.dto.CampaignTestRequest;
import com.bimap.iam.modules.mailing.dto.CampaignUpdate;
import com.bimap.iam.modules.mailing.dto.CampaignView;
import com.bimap.iam.modules.mailing.service.CampaignService;
import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.dto.SentEmailResponse;
import com.bimap.platform.web.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/mailing-lists/{listId}/campaigns")
@RequiredArgsConstructor
public class CampaignController implements CampaignApi {

    private final CampaignService campaigns;

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('mailing:read')")
    public PageResponse<CampaignView> search(
            @PathVariable String listId,
            @RequestParam(required = false) CampaignStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return campaigns.search(listId, status, pageable);
    }

    @Override
    @GetMapping("/{campaignId}")
    @PreAuthorize("hasAuthority('mailing:read')")
    public CampaignView findOne(@PathVariable String listId, @PathVariable String campaignId) {
        return campaigns.findOne(listId, campaignId);
    }

    @Override
    @PostMapping
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<CampaignView> create(@PathVariable String listId, @Valid @RequestBody CampaignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaigns.create(listId, request));
    }

    @Override
    @PatchMapping("/{campaignId}")
    @PreAuthorize("hasAuthority('mailing:write')")
    public CampaignView update(@PathVariable String listId, @PathVariable String campaignId,
                               @Valid @RequestBody CampaignUpdate update) {
        return campaigns.update(listId, campaignId, update);
    }

    @Override
    @DeleteMapping("/{campaignId}")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<Void> delete(@PathVariable String listId, @PathVariable String campaignId) {
        campaigns.delete(listId, campaignId);
        return ResponseEntity.noContent().build();
    }

    @Override
    @PostMapping("/{campaignId}/duplicate")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<CampaignView> duplicate(@PathVariable String listId, @PathVariable String campaignId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaigns.duplicate(listId, campaignId));
    }

    @Override
    @PostMapping("/{campaignId}/schedule")
    @PreAuthorize("hasAuthority('mailing:write')")
    public CampaignView schedule(@PathVariable String listId, @PathVariable String campaignId,
                                 @Valid @RequestBody CampaignSchedule schedule) {
        return campaigns.schedule(listId, campaignId, schedule);
    }

    @Override
    @PostMapping("/{campaignId}/unschedule")
    @PreAuthorize("hasAuthority('mailing:write')")
    public CampaignView unschedule(@PathVariable String listId, @PathVariable String campaignId) {
        return campaigns.unschedule(listId, campaignId);
    }

    @Override
    @PostMapping("/{campaignId}/send")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<CampaignView> send(@PathVariable String listId, @PathVariable String campaignId) {
        return ResponseEntity.accepted().body(campaigns.send(listId, campaignId));
    }

    @Override
    @PostMapping("/{campaignId}/cancel")
    @PreAuthorize("hasAuthority('mailing:write')")
    public CampaignView cancel(@PathVariable String listId, @PathVariable String campaignId) {
        return campaigns.cancel(listId, campaignId);
    }

    @Override
    @PostMapping("/{campaignId}/test")
    @PreAuthorize("hasAuthority('mailing:write')")
    public ResponseEntity<SentEmailResponse> sendTest(@PathVariable String listId, @PathVariable String campaignId,
                                                      @Valid @RequestBody CampaignTestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaigns.sendTest(listId, campaignId, request));
    }

    @Override
    @GetMapping("/{campaignId}/deliveries")
    @PreAuthorize("hasAuthority('mailing:read')")
    public PageResponse<SentEmailResponse> deliveries(@PathVariable String listId, @PathVariable String campaignId,
                                                      @RequestParam(required = false) DeliveryStatus status,
                                                      @PageableDefault(size = 25) Pageable pageable) {
        return campaigns.deliveries(listId, campaignId, status, pageable);
    }
}
