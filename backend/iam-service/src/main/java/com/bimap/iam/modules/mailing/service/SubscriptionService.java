package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.auth.service.ClientFingerprint;
import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.mailing.domain.SubscriptionSource;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.dto.PublicListView;
import com.bimap.iam.modules.mailing.dto.SubscribeRequest;
import com.bimap.iam.modules.mailing.dto.SubscriptionView;
import com.bimap.iam.modules.mailing.repository.MailingListRepository;
import com.bimap.iam.modules.mailing.repository.SubscriberRepository;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/// What a subscriber can do for themselves, with nothing but the link in an email.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionService {

    private static final String ONE_CLICK_REASON = "One-click unsubscribe from the mail client";

    private final MailingListRepository lists;
    private final SubscriberRepository subscribers;
    private final SubscriptionLinks links;
    private final MailingViews views;
    private final MailingProperties properties;
    private final ApplicationEventPublisher events;

    public PublicListView publicList(String listId) {
        var list = signupList(listId);
        return new PublicListView(list.getPublicId(), list.getName(), list.getDescription(), list.isDoubleOptIn());
    }

    /// Answers the same way whether the address was new, pending or already subscribed, so the
    /// public page cannot be used to find out who is on a list.
    @Transactional
    public void subscribe(SubscribeRequest request, ClientFingerprint client) {
        var list = signupList(request.listId());
        var subscriber = subscribers.findByListAndEmailIgnoreCase(list, request.email())
                .orElseGet(() -> Subscriber.builder()
                        .list(list)
                        .email(request.email())
                        .source(SubscriptionSource.SIGNUP_FORM)
                        .build());

        if (subscriber.getStatus() == SubscriptionStatus.SUBSCRIBED && subscriber.getId() != null) {
            return;
        }

        var now = Instant.now();
        subscriber.adoptNames(request.firstName(), request.lastName());
        subscriber.setConsentIp(client.ipAddress());

        if (!list.isDoubleOptIn()) {
            subscriber.confirm(now);
            subscribers.save(subscriber);
            return;
        }

        subscriber.awaitConfirmation();
        if (subscriber.confirmationSentWithin(properties.confirmationCooldown(), now)) {
            subscribers.save(subscriber);
            return;
        }

        subscriber.setConfirmationSentAt(now);
        subscribers.save(subscriber);
        events.publishEvent(new ConfirmationsRequested(List.of(new ConfirmationsRequested.Confirmation(
                subscriber.getEmail(), subscriber.getFirstName(), list.getName(), links.confirmUrl(subscriber)))));
    }

    /// Records the consent from the address that followed the link, which is the evidence that matters.
    @Transactional
    public SubscriptionView confirm(String token, ClientFingerprint client) {
        var subscriber = resolve(token);

        if (subscriber.getStatus() == SubscriptionStatus.PENDING) {
            requireOpen(subscriber.getList());
            subscriber.confirm(Instant.now());
            subscriber.setConsentIp(client.ipAddress());
            log.info("{} confirmed their subscription to {}", subscriber.getEmail(), subscriber.getList().getName());
        }
        return views.subscription(subscriber);
    }

    public SubscriptionView manage(String token) {
        return views.subscription(resolve(token));
    }

    /// Always allowed, archived list or not: leaving must never depend on the state of the list.
    @Transactional
    public SubscriptionView unsubscribe(String token, String reason) {
        var subscriber = resolve(token);
        subscriber.unsubscribe(reason, Instant.now());
        log.info("{} unsubscribed from {}", subscriber.getEmail(), subscriber.getList().getName());
        return views.subscription(subscriber);
    }

    @Transactional
    public SubscriptionView resubscribe(String token, ClientFingerprint client) {
        var subscriber = resolve(token);
        requireOpen(subscriber.getList());

        if (subscriber.getStatus() != SubscriptionStatus.SUBSCRIBED) {
            subscriber.confirm(Instant.now());
            subscriber.setConsentIp(client.ipAddress());
            log.info("{} resubscribed to {}", subscriber.getEmail(), subscriber.getList().getName());
        }
        return views.subscription(subscriber);
    }

    /// The RFC 8058 endpoint an inbox posts to. It has no page to show, only a status to return.
    @Transactional
    public void oneClickUnsubscribe(String token) {
        resolve(token).unsubscribe(ONE_CLICK_REASON, Instant.now());
    }

    private Subscriber resolve(String token) {
        return links.subscriberIdOf(token)
                .flatMap(subscribers::findByPublicId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "This link is not valid, or the subscription it belonged to no longer exists."));
    }

    private MailingList signupList(String listId) {
        return lists.findByPublicId(listId)
                .filter(MailingList::acceptsPublicSignups)
                .orElseThrow(() -> new ResourceNotFoundException("Mailing list", listId));
    }

    private static void requireOpen(MailingList list) {
        if (!list.isActive()) {
            throw new BusinessRuleException("This list has been archived and no longer takes subscribers.");
        }
    }
}
