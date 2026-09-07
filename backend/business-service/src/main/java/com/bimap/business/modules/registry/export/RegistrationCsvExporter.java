package com.bimap.business.modules.registry.export;

import com.bimap.business.modules.registry.domain.AssetRegistration;
import com.bimap.business.modules.registry.repository.AssetRegistrationRepository;
import com.bimap.business.modules.registry.repository.RegistrationFilter;
import com.opencsv.CSVWriter;
import com.opencsv.ICSVWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.function.Function;

/// Writes registrations out as CSV.
///
/// Rows are written with a plain loop rather than `stream.peek(...).count()`, which looks tidier
/// and silently exports nothing: `count()` is allowed to skip the pipeline entirely when it can
/// derive the size without traversing it, and `peek` does not stop that. OpenCSV handles the
/// quoting, which is the part that goes wrong by hand when an address contains a comma.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
public class RegistrationCsvExporter {

    /// A UTF-8 byte order mark, without which Excel opens accented Italian names as mojibake.
    /// Written as an escape so no editor can silently strip it.
    private static final String BOM = "\uFEFF";

    private static final List<Column> COLUMNS = List.of(
            new Column("id", AssetRegistration::getPublicId),
            new Column("region", AssetRegistration::getRegion),
            new Column("province", AssetRegistration::getProvinceName),
            new Column("province_code", AssetRegistration::getProvinceCode),
            new Column("municipality", AssetRegistration::getMunicipality),
            new Column("istat_code", AssetRegistration::getIstatCode),
            new Column("cadastral_code", AssetRegistration::getCadastralCode),
            new Column("postal_code", AssetRegistration::getPostalCode),
            new Column("address", AssetRegistration::getAddress),
            new Column("house_number", AssetRegistration::getHouseNumber),
            new Column("locality", AssetRegistration::getLocality),
            new Column("latitude", registration -> text(registration.getLatitude())),
            new Column("longitude", registration -> text(registration.getLongitude())),
            new Column("asset_name", AssetRegistration::getAssetName),
            new Column("asset_reference", AssetRegistration::getAssetReference),
            new Column("entity_name", AssetRegistration::getEntityName),
            new Column("entity_billing_code", AssetRegistration::getEntityBillingCode),
            new Column("ownership", AssetRegistration::getOwnership),
            new Column("protection_measure", AssetRegistration::getProtectionMeasure),
            new Column("constraint_type", AssetRegistration::getConstraintType),
            new Column("cadastral_reference", AssetRegistration::getCadastralReference),
            new Column("transcription", AssetRegistration::getTranscription),
            new Column("notes", AssetRegistration::getNotes),
            new Column("status", registration -> registration.getStatus().name()),
            new Column("surveyor", AssetRegistration::getCreatedBy),
            new Column("recorded_at", registration -> text(registration.getCreatedAt())));

    private record Column(String header, Function<AssetRegistration, String> value) {
    }

    private final AssetRegistrationRepository registrations;

    @Transactional(readOnly = true)
    public void writeTo(OutputStream output, RegistrationFilter filter) throws IOException {
        var rows = rows(filter);

        try (Writer writer = new OutputStreamWriter(output, StandardCharsets.UTF_8);
             ICSVWriter csv = new CSVWriter(writer)) {

            writer.write(BOM);
            csv.writeNext(COLUMNS.stream().map(Column::header).toArray(String[]::new));

            var written = 0L;
            for (var registration : rows) {
                csv.writeNext(toRow(registration));
                written++;
            }
            csv.flush();

            log.info("Exported {} registration(s) as CSV", written);
        }
    }

    public static String suggestedFilename() {
        return "bimap-registrations-%s.csv".formatted(Instant.now().toString().substring(0, 10));
    }

    /// Oldest first, and tie-broken on the primary key, so paging cannot repeat or skip a row
    /// while other surveyors are still submitting.
    private List<AssetRegistration> rows(RegistrationFilter filter) {
        var sort = Sort.by(Sort.Direction.ASC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id"));
        return registrations.findAll(filter.toSpecification(), sort);
    }

    private static String[] toRow(AssetRegistration registration) {
        return COLUMNS.stream()
                .map(column -> nullSafe(column.value().apply(registration)))
                .toArray(String[]::new);
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
