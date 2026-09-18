package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.repository.CampaignRepository;
import com.bimap.platform.error.ApplicationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/// Launches campaigns whose time has come, and picks up sends a restart interrupted.
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class CampaignScheduler {

    private final CampaignRepository campaigns;
    private final CampaignLauncher launcher;
    private final CampaignDeliveryWorker worker;

    @Scheduled(fixedDelayString = "${bimap.mailing.scheduler-interval:PT30S}",
               initialDelayString = "${bimap.mailing.scheduler-interval:PT30S}")
    public void launchDueCampaigns() {
        for (var campaignId : campaigns.findDueIds(Instant.now())) {
            try {
                launcher.launch(campaignId);
            } catch (ApplicationException refused) {
                launcher.abandonSchedule(campaignId, refused.getMessage());
            }
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void resumeInterruptedSends() {
        for (var campaignId : campaigns.findIdsByStatus(CampaignStatus.SENDING)) {
            log.info("Resuming campaign {} where the last run left off", campaignId);
            worker.resume(campaignId);
        }
    }
}
