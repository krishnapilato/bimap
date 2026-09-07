package com.bimap.business.modules.registry.service;

import com.bimap.business.modules.registry.domain.AssetRegistration;
import com.bimap.business.modules.registry.domain.RegistrationStatus;
import com.bimap.business.modules.registry.dto.AssetRegistrationRequest;
import com.bimap.business.modules.registry.dto.AssetRegistrationView;
import com.bimap.business.modules.registry.dto.RegistrationStatistics;
import com.bimap.business.modules.registry.dto.RegistrationStatusChange;
import com.bimap.business.modules.registry.mapper.AssetRegistrationMapper;
import com.bimap.business.modules.registry.repository.AssetRegistrationRepository;
import com.bimap.business.modules.registry.repository.RegistrationFilter;
import com.bimap.platform.context.AuthenticatedUser;
import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.ResourceConflictException;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.web.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/// Everything the registry does with a registration.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssetRegistrationService {

    private static final String READ_ALL = "registration:read-all";

    private final AssetRegistrationRepository registrations;
    private final AssetRegistrationMapper mapper;

    /// The dynamic table query. Callers without `registration:read-all` only ever see their own.
    public PageResponse<AssetRegistrationView> search(RegistrationFilter filter, Pageable pageable) {
        var scoped = seesEverything() ? filter : filter.restrictedTo(callerEmail());
        return PageResponse.of(registrations.findAll(scoped.toSpecification(), pageable), mapper::toView);
    }

    public AssetRegistrationView findOne(String publicId) {
        return mapper.toView(readable(publicId));
    }

    @Transactional
    public AssetRegistrationView create(AssetRegistrationRequest request) {
        if (registrations.existsByIstatCodeAndAddressIgnoreCaseAndHouseNumberIgnoreCaseAndAssetNameIgnoreCase(
                request.istatCode(), request.address(), nullSafe(request.houseNumber()), request.assetName())) {
            throw new ResourceConflictException(ErrorCode.RESOURCE_CONFLICT,
                    "That asset is already registered at this address.");
        }

        var registration = mapper.toEntity(request);
        registration.setStatus(RegistrationStatus.DRAFT);

        var saved = registrations.save(registration);
        log.info("Registered {} in {} ({})", saved.getAssetName(), saved.getMunicipality(), saved.getIstatCode());
        return mapper.toView(saved);
    }

    @Transactional
    public AssetRegistrationView update(String publicId, AssetRegistrationRequest request) {
        var registration = writable(publicId);

        if (!registration.getStatus().isEditableByAuthor() && !seesEverything()) {
            throw new BusinessRuleException("A registration can only be edited while it is a draft or rejected.");
        }

        mapper.applyUpdate(request, registration);
        return mapper.toView(registration);
    }

    @Transactional
    public AssetRegistrationView changeStatus(String publicId, RegistrationStatusChange change) {
        var registration = readable(publicId);
        var current = registration.getStatus();

        if (!current.canTransitionTo(change.status())) {
            throw new BusinessRuleException("A registration cannot move from %s to %s."
                    .formatted(current, change.status()));
        }
        if (isReview(change.status()) && !seesEverything()) {
            throw new AccessDeniedException("Reviewing registrations requires the registration:read-all permission");
        }

        applyTransition(registration, change);
        log.info("Registration {} moved from {} to {}", publicId, current, change.status());
        return mapper.toView(registration);
    }

    @Transactional
    public void delete(String publicId) {
        var registration = writable(publicId);

        if (registration.getStatus() != RegistrationStatus.DRAFT && !seesEverything()) {
            throw new BusinessRuleException("Only a draft can be deleted. Archive it instead.");
        }
        registrations.delete(registration);
    }

    public RegistrationStatistics statistics() {
        Map<String, Long> byStatus = new LinkedHashMap<>();
        registrations.countByStatus().forEach(row -> byStatus.put(String.valueOf(row[0]), (Long) row[1]));

        Map<String, Long> topRegions = new LinkedHashMap<>();
        registrations.countByRegion().stream()
                .limit(5)
                .forEach(row -> topRegions.put(String.valueOf(row[0]), (Long) row[1]));

        return new RegistrationStatistics(registrations.count(), byStatus, topRegions);
    }

    private static void applyTransition(AssetRegistration registration, RegistrationStatusChange change) {
        var now = Instant.now();
        registration.setStatus(change.status());
        registration.setReviewNote(change.note());

        switch (change.status()) {
            case SUBMITTED -> registration.setSubmittedAt(now);
            case VERIFIED, REJECTED -> {
                registration.setReviewedAt(now);
                registration.setReviewedBy(callerEmail());
            }
            case DRAFT -> {
                registration.setSubmittedAt(null);
                registration.setReviewedAt(null);
                registration.setReviewedBy(null);
            }
            case ARCHIVED -> {
            }
        }
    }

    private static boolean isReview(RegistrationStatus target) {
        return target == RegistrationStatus.VERIFIED || target == RegistrationStatus.REJECTED;
    }

    /// Readable by its author, or by anyone allowed to see every registration.
    private AssetRegistration readable(String publicId) {
        var registration = registrations.findByPublicId(publicId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", publicId));

        if (!seesEverything() && !registration.isOwnedBy(callerEmail())) {
            throw new ResourceNotFoundException("Registration", publicId);
        }
        return registration;
    }

    private AssetRegistration writable(String publicId) {
        var registration = readable(publicId);

        if (!seesEverything() && !registration.isOwnedBy(callerEmail())) {
            throw new AccessDeniedException("You can only change your own registrations");
        }
        return registration;
    }

    private static boolean seesEverything() {
        return CurrentRequest.user()
                .map(user -> user.hasAuthority(READ_ALL))
                .orElse(false);
    }

    private static String callerEmail() {
        return CurrentRequest.user().map(AuthenticatedUser::email).orElse("system");
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
