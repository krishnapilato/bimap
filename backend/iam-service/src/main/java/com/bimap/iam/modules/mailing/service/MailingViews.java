package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.mailing.dto.AudienceCounts;
import com.bimap.iam.modules.mailing.dto.CampaignView;
import com.bimap.iam.modules.mailing.dto.DeliveryCounts;
import com.bimap.iam.modules.mailing.dto.MailingListView;
import com.bimap.iam.modules.mailing.dto.SubscriberView;
import com.bimap.iam.modules.mailing.dto.SubscriptionView;
import com.bimap.iam.modules.notification.service.EmailLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

/// Turns mailing entities into the records the API answers with.
/// @author Khova Krishna Pilato
@Component
@RequiredArgsConstructor
public class MailingViews {

    private final SubscriptionLinks links;

    /// What a list has sent so far.
    /// @author Khova Krishna Pilato
    public record ListActivity(long campaigns, Instant lastSentAt) {

        public static final ListActivity NONE = new ListActivity(0, null);
    }

    public MailingListView list(MailingList list, AudienceCounts audience, ListActivity activity) {
        return new MailingListView(
                list.getPublicId(),
                list.getName(),
                list.getDescription(),
                list.isDoubleOptIn(),
                list.isPublicSignup(),
                list.acceptsPublicSignups() ? links.signupUrl(list) : null,
                list.getStatus(),
                audience,
                activity.campaigns(),
                activity.lastSentAt(),
                list.getCreatedBy(),
                list.getCreatedAt(),
                list.getUpdatedAt());
    }

    public SubscriberView subscriber(Subscriber subscriber) {
        return new SubscriberView(
                subscriber.getPublicId(),
                subscriber.getList().getPublicId(),
                subscriber.getEmail(),
                subscriber.getFirstName(),
                subscriber.getLastName(),
                subscriber.fullName(),
                subscriber.getStatus(),
                subscriber.getSource(),
                subscriber.getSubscribedAt(),
                subscriber.getUnsubscribedAt(),
                subscriber.getUnsubscribeReason(),
                subscriber.getConfirmationSentAt(),
                subscriber.getCreatedAt(),
                subscriber.getUpdatedAt());
    }

    public CampaignView campaign(Campaign campaign, DeliveryCounts deliveries) {
        return new CampaignView(
                campaign.getPublicId(),
                campaign.getList().getPublicId(),
                campaign.getList().getName(),
                campaign.getSubject(),
                campaign.getPreheader(),
                campaign.getBody(),
                EmailLogService.formatOf(campaign.getBody()),
                campaign.getStatus(),
                campaign.getScheduledAt(),
                campaign.getStartedAt(),
                campaign.getCompletedAt(),
                campaign.getRecipientCount(),
                deliveries,
                campaign.getCreatedBy(),
                campaign.getCreatedAt(),
                campaign.getUpdatedAt());
    }

    public SubscriptionView subscription(Subscriber subscriber) {
        var list = subscriber.getList();
        return new SubscriptionView(
                list.getPublicId(),
                list.getName(),
                list.getDescription(),
                list.isActive(),
                subscriber.getEmail(),
                subscriber.getFirstName(),
                subscriber.getStatus(),
                subscriber.getSubscribedAt(),
                subscriber.getUnsubscribedAt());
    }
}
