package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.MailingListStatus;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.dto.AudienceCounts;
import com.bimap.iam.modules.mailing.dto.CampaignCounts;
import com.bimap.iam.modules.mailing.dto.GrowthPoint;
import com.bimap.iam.modules.mailing.dto.MailingListRequest;
import com.bimap.iam.modules.mailing.dto.MailingListStatusChange;
import com.bimap.iam.modules.mailing.dto.MailingListUpdate;
import com.bimap.iam.modules.mailing.dto.MailingListView;
import com.bimap.iam.modules.mailing.dto.MailingOverview;
import com.bimap.iam.modules.mailing.repository.CampaignRepository;
import com.bimap.iam.modules.mailing.repository.MailingListRepository;
import com.bimap.iam.modules.mailing.repository.StatusCount;
import com.bimap.iam.modules.mailing.repository.SubscriberRepository;
import com.bimap.iam.modules.mailing.service.MailingViews.ListActivity;
import com.bimap.iam.modules.notification.repository.SentEmailRepository;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ResourceConflictException;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.web.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/// Creating, describing and retiring mailing lists.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MailingListService {

    private static final int OVERVIEW_DAYS = 30;

    private final MailingListRepository lists;
    private final SubscriberRepository subscribers;
    private final CampaignRepository campaigns;
    private final SentEmailRepository deliveryLog;
    private final MailingViews views;

    public PageResponse<MailingListView> search(String term, MailingListStatus status, Pageable pageable) {
        var page = lists.search(blankToNull(term), status, pageable);
        var ids = page.getContent().stream().map(MailingList::getId).toList();
        var audiences = audienceByList(ids);
        var activity = activityByList(ids);

        return PageResponse.of(page, list -> views.list(list,
                audiences.getOrDefault(list.getId(), AudienceCounts.EMPTY),
                activity.getOrDefault(list.getId(), ListActivity.NONE)));
    }

    public MailingListView findOne(String listId) {
        return describe(require(listId));
    }

    @Transactional
    public MailingListView create(MailingListRequest request) {
        if (lists.existsByNameIgnoreCase(request.name())) {
            throw duplicateName();
        }

        var list = lists.save(MailingList.builder()
                .name(request.name())
                .description(request.description())
                .doubleOptIn(request.doubleOptInOrDefault())
                .publicSignup(request.publicSignupOrDefault())
                .build());

        log.info("Created mailing list {}", list.getName());
        return views.list(list, AudienceCounts.EMPTY, ListActivity.NONE);
    }

    @Transactional
    public MailingListView update(String listId, MailingListUpdate update) {
        var list = require(listId);

        if (update.name() != null) {
            if (lists.existsByNameIgnoreCaseAndIdNot(update.name(), list.getId())) {
                throw duplicateName();
            }
            list.setName(update.name());
        }
        if (update.description() != null) {
            list.setDescription(update.description().isEmpty() ? null : update.description());
        }
        if (update.doubleOptIn() != null) {
            list.setDoubleOptIn(update.doubleOptIn());
        }
        if (update.publicSignup() != null) {
            list.setPublicSignup(update.publicSignup());
        }
        return describe(list);
    }

    /// Archiving pulls scheduled campaigns back to drafts, so nothing fires at a retired audience.
    @Transactional
    public MailingListView changeStatus(String listId, MailingListStatusChange change) {
        var list = require(listId);
        if (list.getStatus() == change.status()) {
            return describe(list);
        }

        if (change.status() == MailingListStatus.ARCHIVED) {
            if (campaigns.existsByListAndStatus(list, CampaignStatus.SENDING)) {
                throw new BusinessRuleException("A campaign is still sending to this list. Stop it or let it finish first.");
            }
            campaigns.findByListAndStatus(list, CampaignStatus.SCHEDULED).forEach(Campaign::unschedule);
        }

        list.setStatus(change.status());
        log.info("Mailing list {} is now {}", list.getName(), change.status());
        return describe(list);
    }

    /// Removes the list with every subscriber and campaign on it. Delivery-log rows survive.
    @Transactional
    public void delete(String listId) {
        var list = require(listId);
        if (list.isActive()) {
            throw new BusinessRuleException("Archive the list before deleting it.");
        }
        lists.delete(list);
        log.info("Deleted mailing list {} with its subscribers and campaigns", list.getName());
    }

    public MailingOverview overview() {
        var since = Instant.now().minus(Duration.ofDays(OVERVIEW_DAYS));

        return new MailingOverview(
                lists.countByStatus(MailingListStatus.ACTIVE),
                lists.countByStatus(MailingListStatus.ARCHIVED),
                audienceOf(subscribers.countByStatus()),
                subscribers.countDistinctSubscribedAddresses(),
                new CampaignCounts(
                        campaigns.countByStatus(CampaignStatus.DRAFT),
                        campaigns.countByStatus(CampaignStatus.SCHEDULED),
                        campaigns.countByStatus(CampaignStatus.SENDING),
                        campaigns.countByStatus(CampaignStatus.SENT),
                        campaigns.countByStatus(CampaignStatus.CANCELLED)),
                DeliveryTally.of(deliveryLog.countTemplateDeliveriesSince(CampaignMessages.LIVE, since)),
                growth(null, OVERVIEW_DAYS));
    }

    /// One point per UTC day, oldest first, including the days nothing happened.
    public List<GrowthPoint> growth(String listId, int days) {
        var id = listId == null ? null : require(listId).getId();
        var today = LocalDate.now(ZoneOffset.UTC);
        var firstDay = today.minusDays(days - 1L);
        var since = firstDay.atStartOfDay(ZoneOffset.UTC).toInstant();

        var joined = perDay(subscribers.subscriptionsPerDay(since, id));
        var left = perDay(subscribers.unsubscriptionsPerDay(since, id));

        return firstDay.datesUntil(today.plusDays(1))
                .map(day -> new GrowthPoint(day, joined.getOrDefault(day, 0L), left.getOrDefault(day, 0L)))
                .toList();
    }

    MailingList require(String listId) {
        return lists.findByPublicId(listId)
                .orElseThrow(() -> new ResourceNotFoundException("Mailing list", listId));
    }

    private MailingListView describe(MailingList list) {
        var ids = List.of(list.getId());
        return views.list(list,
                audienceByList(ids).getOrDefault(list.getId(), AudienceCounts.EMPTY),
                activityByList(ids).getOrDefault(list.getId(), ListActivity.NONE));
    }

    private Map<Long, AudienceCounts> audienceByList(Collection<Long> listIds) {
        if (listIds.isEmpty()) {
            return Map.of();
        }
        return subscribers.countByStatusForLists(listIds).stream()
                .collect(Collectors.groupingBy(StatusCount::listId,
                        Collectors.collectingAndThen(Collectors.toList(), MailingListService::audienceOf)));
    }

    private Map<Long, ListActivity> activityByList(Collection<Long> listIds) {
        if (listIds.isEmpty()) {
            return Map.of();
        }
        return campaigns.summariseLists(listIds).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> new ListActivity(((Number) row[1]).longValue(), (Instant) row[2])));
    }

    static AudienceCounts audienceOf(List<StatusCount> rows) {
        var byStatus = rows.stream().collect(Collectors.toMap(StatusCount::status, StatusCount::total, Long::sum));
        return AudienceCounts.of(
                byStatus.getOrDefault(SubscriptionStatus.SUBSCRIBED, 0L),
                byStatus.getOrDefault(SubscriptionStatus.PENDING, 0L),
                byStatus.getOrDefault(SubscriptionStatus.UNSUBSCRIBED, 0L));
    }

    private static Map<LocalDate, Long> perDay(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
                row -> toLocalDate(row[0]),
                row -> ((Number) row[1]).longValue()));
    }

    private static LocalDate toLocalDate(Object value) {
        return switch (value) {
            case LocalDate date -> date;
            case java.sql.Date date -> date.toLocalDate();
            default -> LocalDate.parse(value.toString());
        };
    }

    private static ResourceConflictException duplicateName() {
        return new ResourceConflictException("A mailing list with this name already exists.");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
