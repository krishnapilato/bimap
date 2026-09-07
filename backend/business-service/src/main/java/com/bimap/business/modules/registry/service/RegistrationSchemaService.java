package com.bimap.business.modules.registry.service;

import com.bimap.business.modules.registry.domain.RegistrationStatus;
import com.bimap.business.modules.registry.dto.FieldOption;
import com.bimap.business.modules.registry.dto.FieldType;
import com.bimap.business.modules.registry.dto.FormField;
import com.bimap.business.modules.registry.dto.FormSchema;
import com.bimap.business.modules.registry.dto.FormSection;
import com.bimap.business.modules.registry.dto.TableColumn;
import com.bimap.business.modules.registry.dto.TableSchema;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/// Describes the registration form and table to whichever client renders them.
///
/// The guided order lives here, in `cascade`: region narrows province, province narrows
/// municipality, municipality narrows the street, the street narrows the postcode, and the
/// municipality narrows the responsible body. A client walks that list rather than hard-coding
/// the sequence, so changing the flow is a server-side edit.
///
/// @author Khova Krishna Pilato
@Service
public class RegistrationSchemaService {

    private static final String SCHEMA_VERSION = "2.0.0";
    private static final String GEO = "/api/v1/geo";

    /// The order the surveyor is walked through, exactly as the form presents it.
    private static final List<String> CASCADE = List.of(
            "region", "provinceName", "municipality", "address", "postalCode",
            "assetName", "istatCode", "entityName");

    public FormSchema formSchema() {
        return new FormSchema("asset-registration", "Asset registration", SCHEMA_VERSION, CASCADE,
                List.of(location(), asset(), protection()));
    }

    public TableSchema tableSchema() {
        return new TableSchema("asset-registrations", List.of(
                new TableColumn("assetName", "Asset", FieldType.TEXT, true, true, true),
                new TableColumn("municipality", "Municipality", FieldType.TEXT, true, true, true),
                new TableColumn("provinceCode", "Province", FieldType.TEXT, true, true, true),
                new TableColumn("region", "Region", FieldType.TEXT, true, true, true),
                new TableColumn("istatCode", "ISTAT", FieldType.TEXT, true, true, true),
                new TableColumn("fullAddress", "Address", FieldType.TEXT, false, true, true),
                new TableColumn("postalCode", "CAP", FieldType.TEXT, true, true, false),
                new TableColumn("entityName", "Responsible body", FieldType.TEXT, true, true, false),
                new TableColumn("entityBillingCode", "Billing code", FieldType.TEXT, false, true, false),
                new TableColumn("constraintType", "Constraint", FieldType.TEXT, true, true, false),
                new TableColumn("status", "Status", FieldType.SELECT, true, true, true),
                new TableColumn("createdBy", "Surveyor", FieldType.TEXT, true, true, false),
                new TableColumn("createdAt", "Recorded", FieldType.TEXT, true, false, true)),
                "createdAt", "desc");
    }

    /// Steps 1 to 5 of the cascade. Each lookup receives the answers above it as query
    /// parameters, so the options offered are always the ones that can actually be true.
    private static FormSection location() {
        return new FormSection("location", "Where the asset stands",
                "Each field narrows the one below it.", List.of(

                FormField.named("region", "Region", FieldType.AUTOCOMPLETE).required()
                        .maxLength(64)
                        .lookup(GEO + "/regions", null)
                        .placeholder("Lombardia").build(),

                FormField.named("provinceName", "Province", FieldType.AUTOCOMPLETE).required()
                        .maxLength(64)
                        .lookup(GEO + "/provinces?region={region}", "region")
                        .placeholder("Varese")
                        .help("Only provinces of the chosen region are offered.").build(),

                FormField.named("provinceCode", "Province code", FieldType.TEXT).required()
                        .maxLength(2).pattern("[A-Za-z]{2}")
                        .help("Filled in from the chosen province.").build(),

                FormField.named("municipality", "Municipality", FieldType.AUTOCOMPLETE).required()
                        .maxLength(96)
                        .lookup(GEO + "/municipalities?region={region}&province={provinceCode}", "provinceName")
                        .help("Search by name, ISTAT code or cadastral code.").build(),

                FormField.named("address", "Street", FieldType.AUTOCOMPLETE).required()
                        .maxLength(256)
                        .lookup(GEO + "/addresses?municipality={municipality}&province={provinceName}", "municipality")
                        .placeholder("Via Giacomo Leopardi")
                        .help("Choosing a match fills in the postcode and the coordinates.").build(),

                FormField.named("houseNumber", "Number", FieldType.TEXT).maxLength(16).build(),

                FormField.named("postalCode", "CAP", FieldType.AUTOCOMPLETE)
                        .maxLength(5).pattern("^$|[0-9]{5}")
                        .lookup(GEO + "/postal-codes?municipality={municipality}&street={address}", "address")
                        .help("Usually a single value, offered as a list only where a comune has several.")
                        .build(),

                FormField.named("locality", "Locality", FieldType.TEXT).maxLength(128).build(),

                FormField.named("latitude", "Latitude", FieldType.COORDINATE)
                        .help("Captured from the map or from the resolved address.").build(),

                FormField.named("longitude", "Longitude", FieldType.COORDINATE).build()));
    }

    /// Steps 6 to 8. The asset name is the only field the surveyor types unaided.
    private static FormSection asset() {
        return new FormSection("asset", "The asset itself", null, List.of(

                FormField.named("assetName", "Asset name", FieldType.TEXT).required()
                        .maxLength(256)
                        .placeholder("Palazzo Estense")
                        .help("The one field with no lookup behind it.").build(),

                FormField.named("istatCode", "ISTAT code", FieldType.TEXT).required()
                        .maxLength(6).pattern("[0-9]{6}")
                        .lookup(GEO + "/municipalities?q={municipality}&region={region}", "municipality")
                        .help("Filled in from the chosen municipality, and editable if it needs correcting.")
                        .build(),

                FormField.named("cadastralCode", "Cadastral code", FieldType.TEXT)
                        .maxLength(4).pattern("^$|[A-Z][0-9]{3}")
                        .help("Agenzia delle Entrate code, filled in with the ISTAT code.").build(),

                FormField.named("entityName", "Responsible body", FieldType.AUTOCOMPLETE)
                        .maxLength(256)
                        .lookup(GEO + "/entity-codes?municipality={municipality}&province={provinceCode}", "municipality")
                        .placeholder("Archivio di Stato")
                        .help("Only bodies seated in the chosen municipality are offered.").build(),

                FormField.named("entityBillingCode", "Asset billing code", FieldType.TEXT)
                        .maxLength(16)
                        .help("Filled in from the chosen body.").build(),

                FormField.named("assetReference", "Internal reference", FieldType.TEXT)
                        .maxLength(64)
                        .help("Identifier carried over from the paper record.").build()));
    }

    private static FormSection protection() {
        return new FormSection("protection", "Protection and title", null, List.of(
                FormField.named("ownership", "Ownership", FieldType.TEXT).maxLength(128).build(),
                FormField.named("protectionMeasure", "Protection measure", FieldType.TEXT).maxLength(256).build(),
                FormField.named("constraintType", "Constraint", FieldType.TEXT).maxLength(128).build(),
                FormField.named("cadastralReference", "Cadastral reference", FieldType.TEXT).maxLength(128).build(),
                FormField.named("transcription", "Transcription", FieldType.TEXT).maxLength(128).build(),
                FormField.named("notes", "Notes", FieldType.TEXTAREA).maxLength(2000).build(),
                FormField.named("status", "Status", FieldType.SELECT).options(statusOptions()).build()));
    }

    private static List<FieldOption> statusOptions() {
        return Arrays.stream(RegistrationStatus.values())
                .map(status -> new FieldOption(status.name(), humanise(status.name())))
                .toList();
    }

    private static String humanise(String constant) {
        var lower = constant.toLowerCase(java.util.Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
