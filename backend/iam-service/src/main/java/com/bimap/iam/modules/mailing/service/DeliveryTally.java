package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.dto.DeliveryCounts;
import com.bimap.iam.modules.notification.domain.DeliveryStatus;

import java.util.List;

/// Folds `[status, count]` rows from the delivery log into one set of counts.
/// @author Khova Krishna Pilato
final class DeliveryTally {

    private DeliveryTally() {
    }

    static DeliveryCounts of(List<Object[]> statusCountRows) {
        long queued = 0;
        long sent = 0;
        long failed = 0;

        for (var row : statusCountRows) {
            var count = ((Number) row[row.length - 1]).longValue();
            switch ((DeliveryStatus) row[row.length - 2]) {
                case QUEUED -> queued += count;
                case SENT -> sent += count;
                case FAILED -> failed += count;
            }
        }
        return new DeliveryCounts(queued, sent, failed);
    }
}
