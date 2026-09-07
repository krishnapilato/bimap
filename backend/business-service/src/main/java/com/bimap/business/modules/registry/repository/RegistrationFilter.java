package com.bimap.business.modules.registry.repository;

import com.bimap.business.modules.registry.domain.AssetRegistration;
import com.bimap.business.modules.registry.domain.RegistrationStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/// The filters the dynamic table can apply, translated into one JPA specification.
///
/// Composed rather than concatenated: the query builder never sees caller text, so a filter value
/// cannot become SQL.
///
/// @author Khova Krishna Pilato
public record RegistrationFilter(
        String search,
        String region,
        String provinceCode,
        String istatCode,
        RegistrationStatus status,
        String createdBy,
        Instant createdAfter,
        Instant createdBefore) {

    private static final List<String> SEARCHABLE = List.of(
            "assetName", "address", "municipality", "entityName", "assetReference", "istatCode");

    public static RegistrationFilter none() {
        return new RegistrationFilter(null, null, null, null, null, null, null, null);
    }

    public RegistrationFilter restrictedTo(String author) {
        return new RegistrationFilter(search, region, provinceCode, istatCode, status, author,
                createdAfter, createdBefore);
    }

    public Specification<AssetRegistration> toSpecification() {
        return (root, query, builder) -> {
            var predicates = new ArrayList<Predicate>();

            if (hasText(search)) {
                var pattern = "%" + search.strip().toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.or(SEARCHABLE.stream()
                        .map(field -> builder.like(builder.lower(root.get(field)), pattern))
                        .toArray(Predicate[]::new)));
            }
            if (hasText(region)) {
                predicates.add(builder.equal(builder.lower(root.get("region")), region.toLowerCase(Locale.ROOT)));
            }
            if (hasText(provinceCode)) {
                predicates.add(builder.equal(builder.upper(root.get("provinceCode")), provinceCode.toUpperCase(Locale.ROOT)));
            }
            if (hasText(istatCode)) {
                predicates.add(builder.equal(root.get("istatCode"), istatCode.strip()));
            }
            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }
            if (hasText(createdBy)) {
                predicates.add(builder.equal(builder.lower(root.get("createdBy")), createdBy.toLowerCase(Locale.ROOT)));
            }
            if (createdAfter != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("createdAt"), createdAfter));
            }
            if (createdBefore != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("createdAt"), createdBefore));
            }

            return predicates.isEmpty() ? builder.conjunction() : builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
