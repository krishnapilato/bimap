package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.dto.CampaignRequest;
import com.bimap.iam.modules.mailing.dto.CampaignSchedule;
import com.bimap.iam.modules.mailing.dto.CampaignTestRequest;
import com.bimap.iam.modules.mailing.dto.CampaignUpdate;
import com.bimap.iam.modules.mailing.dto.CampaignView;
import com.bimap.iam.modules.mailing.dto.DeliveryCounts;
import com.bimap.iam.modules.mailing.repository.CampaignRepository;
import com.bimap.iam.modules.mailing.repository.MailingListRepository;
import com.bimap.iam.modules.mailing.repository.SubscriberRepository;
import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.dto.SentEmailResponse;
import com.bimap.iam.modules.notification.repository.SentEmailRepository;
import com.bimap.iam.modules.notification.service.EmailLogService;
import com.bimap.iam.modules.notification.service.MailDispatcher;
import com.bimap.iam.modules.notification.service.MailDispatcher.CampaignEnvelope;
import com.bimap.iam.modules.notification.service.MailProperties;
import com.bimap.platform.context.AuthenticatedUser;
import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.web.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/// Writing, scheduling, testing and sending campaigns.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampaignService {

    private final MailingListRepository lists;
    private final CampaignRepository campaigns;
    private final SubscriberRepository subscribers;
    private final SentEmailRepository deliveryLog;
    private final CampaignLauncher launcher;
    private final CampaignRenderer renderer;
    private final SubscriptionLinks links;
    private final MailDispatcher dispatcher;
    private final MailProperties mail;
    private final MailingViews views;

    public PageResponse<CampaignView> search(String listId, CampaignStatus status, Pageable pageable) {
        var page = campaigns.search(requireList(listId), status, pageable);
        var counts = deliveriesFor(page.getContent());
        return PageResponse.of(page, campaign ->
                views.campaign(campaign, counts.getOrDefault(campaign.getPublicId(), DeliveryCounts.EMPTY)));
    }

    public CampaignView findOne(String listId, String campaignId) {
        return describe(require(listId, campaignId));
    }

    @Transactional
    public CampaignView create(String listId, CampaignRequest request) {
        var list = requireActive(requireList(listId));
        var campaign = campaigns.save(Campaign.builder()
                .list(list)
                .subject(request.subject())
                .preheader(request.preheader())
                .body(request.body())
                .build());
        return views.campaign(campaign, DeliveryCounts.EMPTY);
    }

    @Transactional
    public CampaignView update(String listId, String campaignId, CampaignUpdate update) {
        var campaign = requireEditable(require(listId, campaignId));

        if (update.subject() != null) {
            campaign.setSubject(update.subject());
        }
        if (update.preheader() != null) {
            campaign.setPreheader(update.preheader().isEmpty() ? null : update.preheader());
        }
        if (update.body() != null) {
            campaign.setBody(update.body());
        }
        return views.campaign(campaign, DeliveryCounts.EMPTY);
    }

    /// Anything that reached an inbox is the record of what people received, so only a campaign
    /// that never started sending can be deleted.
    @Transactional
    public void delete(String listId, String campaignId) {
        var campaign = require(listId, campaignId);
        if (campaign.getStartedAt() != null) {
            throw new BusinessRuleException("A campaign that has started sending stays on record and cannot be deleted.");
        }
        campaigns.delete(campaign);
    }

    @Transactional
    public CampaignView duplicate(String listId, String campaignId) {
        var original = require(listId, campaignId);
        requireActive(original.getList());
        return views.campaign(campaigns.save(original.duplicate()), DeliveryCounts.EMPTY);
    }

    @Transactional
    public CampaignView schedule(String listId, String campaignId, CampaignSchedule schedule) {
        var campaign = requireEditable(require(listId, campaignId));
        requireActive(campaign.getList());

        campaign.schedule(schedule.sendAt());
        log.info("Campaign {} scheduled for {}", campaign.getPublicId(), schedule.sendAt());
        return describe(campaign);
    }

    @Transactional
    public CampaignView unschedule(String listId, String campaignId) {
        var campaign = require(listId, campaignId);
        if (campaign.getStatus() != CampaignStatus.SCHEDULED) {
            throw new BusinessRuleException("Only a scheduled campaign can be unscheduled.");
        }
        campaign.unschedule();
        return describe(campaign);
    }

    /// Runs outside a transaction so the launch commits on its own and the answer reads it back.
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CampaignView send(String listId, String campaignId) {
        var campaign = require(listId, campaignId);
        launcher.launch(campaign.getId());
        return describe(reload(campaign));
    }

    /// Stops a send between two messages. Whoever was not reached yet will not be.
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CampaignView cancel(String listId, String campaignId) {
        var campaign = require(listId, campaignId);
        if (campaigns.finish(campaign.getId(), CampaignStatus.CANCELLED, Instant.now()) == 0) {
            throw new BusinessRuleException("Only a campaign that is sending can be stopped.");
        }
        log.info("Campaign {} cancelled by {}", campaign.getPublicId(), CurrentRequest.userEmail().orElse("system"));
        return describe(reload(campaign));
    }

    /// A preview through the real pipeline, personalised as the given address would see it.
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public SentEmailResponse sendTest(String listId, String campaignId, CampaignTestRequest request) {
        var campaign = reload(require(listId, campaignId));
        var list = campaign.getList();

        var recipient = subscribers.findByListAndEmailIgnoreCase(list, request.to())
                .map(subscriber -> new CampaignRenderer.Recipient(subscriber.getEmail(), subscriber.getFirstName(),
                        subscriber.getLastName(), links.manageUrl(subscriber), null))
                .orElseGet(() -> sampleRecipient(request.to()));

        var rendered = renderer.render(campaign, recipient);
        var outcome = dispatcher.sendCampaign(new CampaignEnvelope(request.to(), "[Test] " + rendered.subject(),
                rendered.html(), rendered.text(), campaign.getPublicId(), CampaignMessages.TEST, null));

        return deliveryLog.findById(outcome.id())
                .map(EmailLogService::toResponse)
                .orElseThrow(() -> new IllegalStateException("The test message was sent but could not be read back"));
    }

    public PageResponse<SentEmailResponse> deliveries(String listId, String campaignId, DeliveryStatus status,
                                                      Pageable pageable) {
        var campaign = require(listId, campaignId);
        return PageResponse.of(deliveryLog.campaignDeliveries(campaign.getPublicId(), CampaignMessages.LIVE,
                status, pageable).map(EmailLogService::toResponse));
    }

    private CampaignView describe(Campaign campaign) {
        return views.campaign(campaign, DeliveryTally.of(
                deliveryLog.countCampaignDeliveries(campaign.getPublicId(), CampaignMessages.LIVE)));
    }

    private Map<String, DeliveryCounts> deliveriesFor(List<Campaign> page) {
        if (page.isEmpty()) {
            return Map.of();
        }
        var ids = page.stream().map(Campaign::getPublicId).toList();
        return deliveryLog.countCampaignDeliveries(ids, CampaignMessages.LIVE).stream()
                .collect(Collectors.groupingBy(row -> (String) row[0],
                        Collectors.collectingAndThen(Collectors.toList(), DeliveryTally::of)));
    }

    private CampaignRenderer.Recipient sampleRecipient(String address) {
        var firstName = CurrentRequest.user()
                .map(AuthenticatedUser::displayName)
                .map(name -> name.split("\\s+")[0])
                .orElse(address.substring(0, Math.max(address.indexOf('@'), 0)));
        var preview = "%s/subscriptions/manage?token=preview".formatted(mail.appBaseUrl());
        return new CampaignRenderer.Recipient(address, firstName, null, preview, null);
    }

    private Campaign reload(Campaign campaign) {
        return campaigns.findWithListById(campaign.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", campaign.getPublicId()));
    }

    private MailingList requireList(String listId) {
        return lists.findByPublicId(listId)
                .orElseThrow(() -> new ResourceNotFoundException("Mailing list", listId));
    }

    private Campaign require(String listId, String campaignId) {
        return campaigns.findByListAndPublicId(requireList(listId), campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", campaignId));
    }

    private static Campaign requireEditable(Campaign campaign) {
        if (!campaign.getStatus().isEditable()) {
            throw new BusinessRuleException("A campaign can only be changed before it starts sending.");
        }
        return campaign;
    }

    private static MailingList requireActive(MailingList list) {
        if (!list.isActive()) {
            throw new BusinessRuleException("This list is archived. Restore it before writing to it.");
        }
        return list;
    }
}
