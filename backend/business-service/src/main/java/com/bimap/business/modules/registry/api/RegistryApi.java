package com.bimap.business.modules.registry.api;

import com.bimap.business.modules.registry.domain.RegistrationStatus;
import com.bimap.business.modules.registry.dto.AssetRegistrationRequest;
import com.bimap.business.modules.registry.dto.AssetRegistrationView;
import com.bimap.business.modules.registry.dto.FormSchema;
import com.bimap.business.modules.registry.dto.RegistrationStatistics;
import com.bimap.business.modules.registry.dto.RegistrationStatusChange;
import com.bimap.business.modules.registry.dto.TableSchema;
import com.bimap.platform.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.Instant;

/// The documented contract for `/api/v1/registrations`.
///
/// Every read is scoped by the caller: without the `registration:read-all` permission you see
/// only what you recorded yourself.
///
/// @author Khova Krishna Pilato
@Tag(name = "Registrations", description = "Asset registrations, their form schema and their table")
@SecurityRequirement(name = "bearerAuth")
public interface RegistryApi {

    @Operation(summary = "The registration form schema",
            description = """
                    Field names, types, validation patterns and the lookup endpoint each
                    autocomplete should call. Rendering from this keeps the client and the server
                    from disagreeing about what a valid submission looks like.
                    """)
    @ApiResponse(responseCode = "200", description = "Schema returned")
    FormSchema formSchema();

    @Operation(summary = "The registrations table schema",
            description = "Column definitions, which of them sort and filter, and the default ordering.")
    @ApiResponse(responseCode = "200", description = "Schema returned")
    TableSchema tableSchema();

    @Operation(summary = "Query the registrations table",
            description = "Paged, sorted and filtered. Combine any of the filters below.")
    @ApiResponse(responseCode = "200", description = "Page of registrations")
    PageResponse<AssetRegistrationView> search(
            @Parameter(description = "Free text over asset name, address, municipality and references")
            @RequestParam(required = false) String q,
            @Parameter(description = "Exact region", example = "Lombardia")
            @RequestParam(required = false) String region,
            @Parameter(description = "Two-letter province code", example = "MI")
            @RequestParam(required = false) String provinceCode,
            @Parameter(description = "Six-digit ISTAT code", example = "015146")
            @RequestParam(required = false) String istatCode,
            @Parameter(description = "Lifecycle state")
            @RequestParam(required = false) RegistrationStatus status,
            @Parameter(description = "Recorded on or after this instant")
            @RequestParam(required = false) Instant from,
            @Parameter(description = "Recorded on or before this instant")
            @RequestParam(required = false) Instant to,
            @ParameterObject Pageable pageable);

    @Operation(summary = "Read one registration")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Registration returned"),
            @ApiResponse(responseCode = "404", description = "No such registration, or not yours",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AssetRegistrationView findOne(@PathVariable String id);

    @Operation(summary = "Record a registration", description = "Created as a draft, owned by the caller.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Registration recorded"),
            @ApiResponse(responseCode = "409", description = "That asset is already registered at this address",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<AssetRegistrationView> create(@Valid @RequestBody AssetRegistrationRequest request);

    @Operation(summary = "Update a registration",
            description = "Allowed while the record is a draft or has been rejected.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Registration updated"),
            @ApiResponse(responseCode = "422", description = "The record is no longer editable",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AssetRegistrationView update(@PathVariable String id, @Valid @RequestBody AssetRegistrationRequest request);

    @Operation(summary = "Move a registration through its lifecycle",
            description = "Verifying and rejecting require the registration:read-all permission.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "New status applied"),
            @ApiResponse(responseCode = "403", description = "Reviewing is not permitted for this caller",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Transition not allowed from the current status",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AssetRegistrationView changeStatus(@PathVariable String id, @Valid @RequestBody RegistrationStatusChange change);

    @Operation(summary = "Delete a draft")
    @ApiResponse(responseCode = "204", description = "Draft deleted")
    ResponseEntity<Void> delete(@PathVariable String id);

    @Operation(summary = "Headline registration counts")
    @ApiResponse(responseCode = "200", description = "Counts returned")
    RegistrationStatistics statistics();

    @Operation(summary = "Export registrations as CSV",
            description = "Streams the current filter as UTF-8 CSV. Requires the registration:export permission.")
    @ApiResponse(responseCode = "200", description = "CSV stream",
            content = @Content(mediaType = "text/csv"))
    void exportCsv(@RequestParam(required = false) String q,
                   @RequestParam(required = false) String region,
                   @RequestParam(required = false) String provinceCode,
                   @RequestParam(required = false) RegistrationStatus status,
                   HttpServletResponse response);
}
