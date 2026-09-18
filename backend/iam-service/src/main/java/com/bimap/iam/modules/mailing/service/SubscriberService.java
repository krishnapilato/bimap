package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.mailing.domain.SubscriptionSource;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.dto.ConsentMode;
import com.bimap.iam.modules.mailing.dto.SubscriberImportReport;
import com.bimap.iam.modules.mailing.dto.SubscriberImportRequest;
import com.bimap.iam.modules.mailing.dto.SubscriberRequest;
import com.bimap.iam.modules.mailing.dto.SubscriberStatusChange;
import com.bimap.iam.modules.mailing.dto.SubscriberUpdate;
import com.bimap.iam.modules.mailing.dto.SubscriberView;
import com.bimap.iam.modules.mailing.repository.MailingListRepository;
import com.bimap.iam.modules.mailing.repository.SubscriberRepository;
import com.bimap.iam.modules.mailing.service.SubscriberImportPlanner.Candidate;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ResourceConflictException;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.web.PageResponse;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/// Everything an administrator does to the people on a list.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriberService {

    private static final int LOOKUP_CHUNK = 500;

    private final MailingListRepository lists;
    private final SubscriberRepository subscribers;
    private final SubscriptionLinks links;
    private final MailingViews views;
    private final MailingProperties properties;
    private final SubscriberCsvExporter exporter;
    private final ApplicationEventPublisher events;
    private final Validator validator;

    public PageResponse<SubscriberView> search(String listId, String term, SubscriptionStatus status, Pageable pageable) {
        var list = requireList(listId);
        return PageResponse.of(subscribers.search(list, blankToNull(term), status, pageable), views::subscriber);
    }

    public SubscriberView findOne(String listId, String subscriberId) {
        return views.subscriber(require(listId, subscriberId));
    }

    @Transactional
    public SubscriberView add(String listId, SubscriberRequest request) {
        var list = requireActive(requireList(listId));

        subscribers.findByListAndEmailIgnoreCase(list, request.email()).ifPresent(existing -> {
            throw new ResourceConflictException("This address is already on the list.")
                    .with("subscriberId", existing.getPublicId());
        });

        var subscriber = Subscriber.builder()
                .list(list)
                .email(request.email())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .source(SubscriptionSource.ADMIN)
                .build();

        var now = Instant.now();
        var awaiting = new ArrayList<Subscriber>();
        applyConsent(subscriber, request.consent(), now, awaiting);

        subscribers.save(subscriber);
        requestConfirmations(list, awaiting, now);
        log.info("Added {} to mailing list {} as {}", subscriber.getEmail(), list.getName(), subscriber.getStatus());
        return views.subscriber(subscriber);
    }

    @Transactional
    public SubscriberView update(String listId, String subscriberId, SubscriberUpdate update) {
        var subscriber = require(listId, subscriberId);
        if (update.firstName() != null) {
            subscriber.setFirstName(update.firstName().isEmpty() ? null : update.firstName());
        }
        if (update.lastName() != null) {
            subscriber.setLastName(update.lastName().isEmpty() ? null : update.lastName());
        }
        return views.subscriber(subscriber);
    }

    @Transactional
    public SubscriberView changeStatus(String listId, String subscriberId, SubscriberStatusChange change) {
        var subscriber = require(listId, subscriberId);
        var list = subscriber.getList();
        var now = Instant.now();

        switch (change.status()) {
            case SUBSCRIBED -> {
                requireActive(list);
                subscriber.confirm(now);
            }
            case UNSUBSCRIBED -> subscriber.unsubscribe(
                    change.reason() == null || change.reason().isBlank() ? "Removed by an administrator" : change.reason(),
                    now);
            case PENDING -> {
                requireActive(list);
                guardCooldown(subscriber, now);
                subscriber.awaitConfirmation();
                requestConfirmations(list, List.of(subscriber), now);
            }
        }

        log.info("Subscriber {} on {} is now {}", subscriber.getEmail(), list.getName(), subscriber.getStatus());
        return views.subscriber(subscriber);
    }

    @Transactional
    public void resendConfirmation(String listId, String subscriberId) {
        var subscriber = require(listId, subscriberId);
        if (subscriber.getStatus() != SubscriptionStatus.PENDING) {
            throw new BusinessRuleException("Only an address that has not confirmed yet can be asked again.");
        }
        requireActive(subscriber.getList());

        var now = Instant.now();
        guardCooldown(subscriber, now);
        requestConfirmations(subscriber.getList(), List.of(subscriber), now);
    }

    /// Erases the subscriber and their consent record, as a data-protection request requires.
    @Transactional
    public void remove(String listId, String subscriberId) {
        var subscriber = require(listId, subscriberId);
        subscribers.delete(subscriber);
        log.info("Removed {} from mailing list {}", subscriber.getEmail(), subscriber.getList().getName());
    }

    /// Adds new addresses and, when asked, corrects the names of known ones. A known address never
    /// changes status here, so an import can neither resubscribe an opt-out nor demote a subscriber.
    @Transactional
    public SubscriberImportReport importRows(String listId, SubscriberImportRequest request) {
        var list = requireActive(requireList(listId));
        if (request.rows().size() > properties.maxImportRows()) {
            throw new BusinessRuleException("An import can carry at most %d rows. Split the file and try again."
                    .formatted(properties.maxImportRows()));
        }

        var plan = SubscriberImportPlanner.plan(request.rows(), validator);
        var existing = existingByEmail(list, plan.candidates());
        var now = Instant.now();

        var created = new ArrayList<Subscriber>();
        var awaiting = new ArrayList<Subscriber>();
        var updated = 0;
        var unchanged = plan.duplicates();

        for (var candidate : plan.candidates()) {
            var known = existing.get(candidate.email());
            if (known == null) {
                var subscriber = Subscriber.builder()
                        .list(list)
                        .email(candidate.email())
                        .firstName(candidate.firstName())
                        .lastName(candidate.lastName())
                        .source(SubscriptionSource.IMPORT)
                        .build();
                applyConsent(subscriber, request.consent(), now, awaiting);
                created.add(subscriber);
            } else if (request.updateExisting() && known.adoptNames(candidate.firstName(), candidate.lastName())) {
                updated++;
            } else {
                unchanged++;
            }
        }

        subscribers.saveAll(created);
        requestConfirmations(list, awaiting, now);

        log.info("Imported into {}: {} created, {} updated, {} unchanged, {} rejected",
                list.getName(), created.size(), updated, unchanged, plan.rejected().size());
        return new SubscriberImportReport(request.rows().size(), created.size(), updated, unchanged, plan.rejected());
    }

    public void exportCsv(String listId, SubscriptionStatus status, OutputStream output) throws IOException {
        var list = requireList(listId);
        exporter.writeTo(output, subscribers.exportable(list, status));
    }

    public String exportFilename(String listId) {
        var slug = requireList(listId).getName().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return "bimap-%s-subscribers-%s.csv".formatted(slug.isEmpty() ? "list" : slug,
                Instant.now().toString().substring(0, 10));
    }

    private void requestConfirmations(MailingList list, List<Subscriber> awaiting, Instant now) {
        if (awaiting.isEmpty()) {
            return;
        }
        awaiting.forEach(subscriber -> subscriber.setConfirmationSentAt(now));
        events.publishEvent(new ConfirmationsRequested(awaiting.stream()
                .map(subscriber -> new ConfirmationsRequested.Confirmation(subscriber.getEmail(),
                        subscriber.getFirstName(), list.getName(), links.confirmUrl(subscriber)))
                .toList()));
    }

    private static void applyConsent(Subscriber subscriber, ConsentMode consent, Instant now, List<Subscriber> awaiting) {
        switch (consent) {
            case CONFIRMED -> subscriber.confirm(now);
            case REQUEST_CONFIRMATION -> {
                subscriber.awaitConfirmation();
                awaiting.add(subscriber);
            }
        }
    }

    private void guardCooldown(Subscriber subscriber, Instant now) {
        if (subscriber.confirmationSentWithin(properties.confirmationCooldown(), now)) {
            throw new BusinessRuleException("A confirmation went to this address less than %d minutes ago."
                    .formatted(properties.confirmationCooldown().toMinutes()));
        }
    }

    private Map<String, Subscriber> existingByEmail(MailingList list, List<Candidate> candidates) {
        var emails = candidates.stream().map(Candidate::email).toList();
        var found = new HashMap<String, Subscriber>();

        for (var from = 0; from < emails.size(); from += LOOKUP_CHUNK) {
            subscribers.findByListAndEmailIn(list, emails.subList(from, Math.min(from + LOOKUP_CHUNK, emails.size())))
                    .forEach(subscriber -> found.put(subscriber.getEmail().toLowerCase(Locale.ROOT), subscriber));
        }
        return found;
    }

    private MailingList requireList(String listId) {
        return lists.findByPublicId(listId)
                .orElseThrow(() -> new ResourceNotFoundException("Mailing list", listId));
    }

    private Subscriber require(String listId, String subscriberId) {
        return subscribers.findByListAndPublicId(requireList(listId), subscriberId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscriber", subscriberId));
    }

    private static MailingList requireActive(MailingList list) {
        if (!list.isActive()) {
            throw new BusinessRuleException("This list is archived. Restore it before changing who is on it.");
        }
        return list;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
