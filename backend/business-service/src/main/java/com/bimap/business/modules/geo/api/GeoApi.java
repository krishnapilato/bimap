package com.bimap.business.modules.geo.api;

import com.bimap.business.modules.geo.dto.AddressView;
import com.bimap.business.modules.geo.dto.EntityCodeView;
import com.bimap.business.modules.geo.dto.MunicipalityView;
import com.bimap.business.modules.geo.dto.ProvinceView;
import com.bimap.business.modules.geo.dto.RegionView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

/// The documented contract for `/api/v1/geo`.
///
/// These endpoints are the guided cascade the registration form walks through:
///
/// `region → province → municipality → address → postal code → ISTAT code → responsible body`
///
/// Each step takes the previous answers as optional filters. Choosing Lombardia means the
/// province lookup never offers Verona; passing nothing means the same endpoint still searches
/// the whole country, so any step can also be used on its own.
///
/// Every endpoint answers with at most `limit` rows, five by default.
///
/// @author Khova Krishna Pilato
@Tag(name = "Geography", description = "The guided location cascade, addresses and public-body codes")
@SecurityRequirement(name = "bearerAuth")
public interface GeoApi {

    @Operation(summary = "Step 1 — search regions",
            description = "Matches on region name, accent- and case-insensitively.")
    @ApiResponse(responseCode = "200", description = "Matching regions, best first")
    List<RegionView> regions(
            @Parameter(description = "What the user has typed so far", example = "lomb")
            @RequestParam(required = false, defaultValue = "") @Size(max = 64) String q,
            @Parameter(description = "Maximum rows to return")
            @RequestParam(required = false, defaultValue = "5") @Min(1) @Max(50) int limit);

    @Operation(summary = "Step 2 — search provinces within a region",
            description = """
                    Matches on province name or two-letter code. Pass `region` to restrict the
                    result to that region only; omit it to search nationally.
                    """)
    @ApiResponse(responseCode = "200", description = "Matching provinces, best first")
    List<ProvinceView> provinces(
            @Parameter(description = "Name or code fragment", example = "mi")
            @RequestParam(required = false, defaultValue = "") @Size(max = 64) String q,
            @Parameter(description = "Region chosen in step 1", example = "Lombardia")
            @RequestParam(required = false) String region,
            @RequestParam(required = false, defaultValue = "5") @Min(1) @Max(50) int limit);

    @Operation(summary = "Step 3 — search municipalities, with their ISTAT codes",
            description = """
                    Matches on municipality name, ISTAT code or cadastral code, so one input serves
                    all three. Pass `region` and `province` from the previous steps to narrow the
                    result; naming the region also makes the upstream read far smaller.

                    The chosen row carries the ISTAT code, the cadastral code and the default
                    postcode, so steps 5 and 6 of the form fill themselves in.
                    """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matching municipalities, best first"),
            @ApiResponse(responseCode = "502", description = "The geography source is unreachable",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    List<MunicipalityView> municipalities(
            @Parameter(description = "Name, ISTAT code or cadastral code fragment", example = "mila")
            @RequestParam(required = false, defaultValue = "") @Size(max = 64) String q,
            @Parameter(description = "Region chosen in step 1", example = "Lombardia")
            @RequestParam(required = false) String region,
            @Parameter(description = "Province chosen in step 2, by name or code", example = "MI")
            @RequestParam(required = false) String province,
            @RequestParam(required = false, defaultValue = "5") @Min(1) @Max(50) int limit);

    @Operation(summary = "Read one municipality by ISTAT code")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Municipality found"),
            @ApiResponse(responseCode = "404", description = "No municipality carries that code",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    MunicipalityView municipality(
            @Parameter(description = "Six-digit ISTAT code", example = "015146") @PathVariable String istatCode);

    @Operation(summary = "Step 4 — resolve a street within the chosen municipality",
            description = """
                    Backed by OpenStreetMap. Pass `street` with the `municipality` and `province`
                    already chosen, and the search stays inside that comune. Pass `q` alone for a
                    free-text lookup anywhere in Italy.

                    Each match carries the postcode and the coordinates, which is what fills in
                    step 5 and the map pin.
                    """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matching addresses, most relevant first"),
            @ApiResponse(responseCode = "502", description = "The address source is unreachable",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    List<AddressView> addresses(
            @Parameter(description = "Street, with or without the number", example = "Via Giacomo Leopardi 4")
            @RequestParam(required = false) String street,
            @Parameter(description = "Municipality chosen in step 3", example = "Milano")
            @RequestParam(required = false) String municipality,
            @Parameter(description = "Province chosen in step 2", example = "Milano")
            @RequestParam(required = false) String province,
            @Parameter(description = "Region chosen in step 1", example = "Lombardia")
            @RequestParam(required = false) String region,
            @Parameter(description = "Free-text address, used when no street is given")
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "5") @Min(1) @Max(20) int limit);

    @Operation(summary = "Step 5 — postcodes for the chosen municipality and street",
            description = """
                    Most comuni have exactly one CAP and the field can be filled in without asking.
                    Larger cities have many, and only the street narrows them, so pass `street`
                    when it is known.
                    """)
    @ApiResponse(responseCode = "200", description = "Candidate postcodes, most specific first")
    List<String> postalCodes(
            @Parameter(description = "Municipality chosen in step 3", example = "Milano")
            @RequestParam @NotBlank String municipality,
            @Parameter(description = "Province chosen in step 2", example = "Milano")
            @RequestParam(required = false) String province,
            @Parameter(description = "Street resolved in step 4", example = "Via Giacomo Leopardi")
            @RequestParam(required = false) String street,
            @RequestParam(required = false, defaultValue = "5") @Min(1) @Max(20) int limit);

    @Operation(summary = "Step 7 — look up the responsible public body and its billing code",
            description = """
                    Searches the Italian public-body directory by name. Pass the municipality,
                    province or region already chosen and only bodies seated there are returned,
                    which is what stops a search for an Archivio di Stato returning thirty cities.
                    """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matching bodies"),
            @ApiResponse(responseCode = "502", description = "The directory is unreachable",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    List<EntityCodeView> entityCodes(
            @Parameter(description = "Part of the body name", example = "Archivio di Stato")
            @RequestParam @NotBlank @Size(max = 128) String q,
            @Parameter(description = "Municipality chosen in step 3", example = "Varese")
            @RequestParam(required = false) String municipality,
            @Parameter(description = "Province chosen in step 2", example = "VA")
            @RequestParam(required = false) String province,
            @Parameter(description = "Region chosen in step 1", example = "Lombardia")
            @RequestParam(required = false) String region,
            @RequestParam(required = false, defaultValue = "5") @Min(1) @Max(50) int limit);
}
