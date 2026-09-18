package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.repository.CampaignRepository;
import com.bimap.iam.modules.mailing.repository.SubscriberRepository;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ResourceConflictException;
import com.bimap.platform.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/// Starts a campaign, whether an administrator pressed send or its scheduled time arrived.
///
/// The claim is a conditional update, so two instances reaching the same scheduled campaign at the
/// same moment cannot both send it: only one update finds it still waiting.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class CampaignLauncher {

    private final CampaignRepository campaigns;
    private final SubscriberRepository subscribers;
    private final ApplicationEventPublisher events;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void launch(Long campaignId) {
        var campaign = campaigns.findWithListById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", campaignId));
        var list = campaign.getList();

        if (!list.isActive()) {
            throw new BusinessRuleException("The list is archived, so nothing can be sent to it.");
        }
        if (!campaign.getStatus().canStartSending()) {
            throw new BusinessRuleException("This campaign has already been sent.");
        }

        var recipients = subscribers.countByListAndStatus(list, SubscriptionStatus.SUBSCRIBED);
        if (recipients == 0) {
            throw new BusinessRuleException("Nobody on this list has confirmed a subscription yet.");
        }
        if (campaigns.claimForSending(campaignId, Math.toIntExact(recipients), Instant.now()) == 0) {
            throw new ResourceConflictException("This campaign is already being sent.");
        }

        events.publishEvent(new CampaignLaunched(campaignId));
        log.info("Campaign {} to {} is sending to {} subscriber(s)", campaign.getPublicId(), list.getName(), recipients);
    }

    /// Sends a scheduled campaign that can no longer go out back to the drafts, instead of retrying
    /// it every half minute forever.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void abandonSchedule(Long campaignId, String reason) {
        campaigns.findWithListById(campaignId)
                .filter(campaign -> campaign.getStatus() == CampaignStatus.SCHEDULED)
                .ifPresent(campaign -> {
                    campaign.unschedule();
                    log.warn("Scheduled campaign {} returned to draft: {}", campaign.getPublicId(), reason);
                });
    }
}
