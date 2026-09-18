package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.repository.CampaignRepository;
import com.bimap.iam.modules.mailing.repository.SubscriberRepository;
import com.bimap.iam.modules.notification.repository.SentEmailRepository;
import com.bimap.iam.modules.notification.service.MailDispatcher;
import com.bimap.iam.modules.notification.service.MailDispatcher.CampaignEnvelope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

/// Delivers a campaign one subscriber at a time, on a virtual thread.
///
/// Anyone who already has a delivery-log row for the campaign is skipped, which makes a send that
/// was cut short by a restart resumable without mailing anybody twice. Cancellation is checked
/// between messages rather than enforced by interrupting one mid-conversation with the relay.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class CampaignDeliveryWorker {

    private static final int BATCH_SIZE = 200;
    private static final int CANCELLATION_CHECK_INTERVAL = 20;

    private final CampaignRepository campaigns;
    private final SubscriberRepository subscribers;
    private final SentEmailRepository deliveryLog;
    private final CampaignRenderer renderer;
    private final SubscriptionLinks links;
    private final MailDispatcher dispatcher;
    private final MailingProperties properties;

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onLaunched(CampaignLaunched event) {
        deliver(event.campaignId());
    }

    @Async("mailExecutor")
    public void resume(Long campaignId) {
        deliver(campaignId);
    }

    void deliver(Long campaignId) {
        var campaign = campaigns.findWithListById(campaignId).orElse(null);
        if (campaign == null || campaign.getStatus() != CampaignStatus.SENDING) {
            return;
        }

        var afterId = 0L;
        var attempted = 0;

        while (true) {
            var batch = subscribers.findByListAndStatusAndIdGreaterThanOrderByIdAsc(
                    campaign.getList(), SubscriptionStatus.SUBSCRIBED, afterId, PageRequest.ofSize(BATCH_SIZE));
            if (batch.isEmpty()) {
                break;
            }

            for (var subscriber : batch) {
                if (attempted % CANCELLATION_CHECK_INTERVAL == 0 && wasStopped(campaignId)) {
                    log.info("Campaign {} stopped after {} message(s)", campaign.getPublicId(), attempted);
                    return;
                }
                if (alreadyAttempted(campaign, subscriber)) {
                    continue;
                }
                send(campaign, subscriber);
                attempted++;
                if (!pause()) {
                    log.warn("Campaign {} interrupted after {} message(s); it resumes on the next start",
                            campaign.getPublicId(), attempted);
                    return;
                }
            }
            afterId = batch.getLast().getId();
        }

        campaigns.finish(campaignId, CampaignStatus.SENT, Instant.now());
        log.info("Campaign {} finished: {} message(s) attempted", campaign.getPublicId(), attempted);
    }

    private void send(Campaign campaign, Subscriber subscriber) {
        var recipient = new CampaignRenderer.Recipient(subscriber.getEmail(), subscriber.getFirstName(),
                subscriber.getLastName(), links.manageUrl(subscriber), links.oneClickUrl(subscriber));
        var rendered = renderer.render(campaign, recipient);

        dispatcher.sendCampaign(new CampaignEnvelope(subscriber.getEmail(), rendered.subject(), rendered.html(),
                rendered.text(), campaign.getPublicId(), CampaignMessages.LIVE, recipient.oneClickUrl()));
    }

    private boolean alreadyAttempted(Campaign campaign, Subscriber subscriber) {
        return deliveryLog.existsByCampaignIdAndTemplateAndRecipientIgnoreCase(
                campaign.getPublicId(), CampaignMessages.LIVE, subscriber.getEmail());
    }

    private boolean wasStopped(Long campaignId) {
        return campaigns.statusOf(campaignId).map(status -> status != CampaignStatus.SENDING).orElse(true);
    }

    private boolean pause() {
        try {
            Thread.sleep(properties.sendInterval());
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
