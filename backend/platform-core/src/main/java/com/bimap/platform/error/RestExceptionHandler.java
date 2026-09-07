package com.bimap.platform.error;

import com.bimap.platform.context.CurrentRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

/// Single place where an exception becomes an HTTP response.
/// @author Khova Krishna Pilato
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
@RequiredArgsConstructor
public class RestExceptionHandler {

    private final ProblemDetailFactory problems;

    /// Every deliberate application failure funnels through here.
    @ExceptionHandler(ApplicationException.class)
    public ProblemDetail onApplicationException(ApplicationException exception, HttpServletRequest request) {
        switch (exception) {
            case UpstreamServiceException upstream ->
                    log.error("Upstream dependency failed: {}", upstream.getMessage(), upstream);
            case AuthenticationFailedException failure ->
                    log.warn("Authentication rejected [{}]: {}", failure.code(), failure.getMessage());
            case ResourceNotFoundException notFound ->
                    log.debug("Not found [{}]: {}", notFound.code(), notFound.getMessage());
            case ResourceConflictException conflict ->
                    log.info("Conflict [{}]: {}", conflict.code(), conflict.getMessage());
            case BusinessRuleException rule ->
                    log.info("Rule violated [{}]: {}", rule.code(), rule.getMessage());
            case ApplicationException other ->
                    log.debug("Request refused [{}]: {}", other.code(), other.getMessage());
        }
        return problems.create(exception.code(), exception.getMessage(), request.getRequestURI(), exception.details());
    }

    /// `@Valid` failures on a request body, flattened per field.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail onInvalidBody(MethodArgumentNotValidException exception, HttpServletRequest request) {
        var violations = exception.getBindingResult().getAllErrors().stream()
                .map(error -> error instanceof FieldError field
                        ? new FieldViolation(field.getField(), field.getDefaultMessage(), field.getRejectedValue())
                        : new FieldViolation(error.getObjectName(), error.getDefaultMessage(), null))
                .toList();

        return problems.withViolations(ErrorCode.VALIDATION_FAILED,
                "%d field(s) failed validation".formatted(violations.size()), request.getRequestURI(), violations);
    }

    /// `@Validated` failures on query parameters and path variables.
    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail onInvalidParameter(ConstraintViolationException exception, HttpServletRequest request) {
        List<FieldViolation> violations = exception.getConstraintViolations().stream()
                .map(violation -> new FieldViolation(
                        String.valueOf(violation.getPropertyPath()),
                        violation.getMessage(),
                        violation.getInvalidValue()))
                .toList();

        return problems.withViolations(ErrorCode.VALIDATION_FAILED,
                "%d parameter(s) failed validation".formatted(violations.size()), request.getRequestURI(), violations);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ProblemDetail onMalformedRequest(Exception exception, HttpServletRequest request) {
        var detail = switch (exception) {
            case MissingServletRequestParameterException missing ->
                    "Required parameter %s is missing".formatted(quoted(missing.getParameterName()));
            case MethodArgumentTypeMismatchException mismatch ->
                    "Parameter %s could not be read as %s".formatted(quoted(mismatch.getName()),
                            mismatch.getRequiredType() == null
                                    ? "the expected type"
                                    : mismatch.getRequiredType().getSimpleName());
            default -> "The request body could not be parsed";
        };
        log.debug("Malformed request to {}: {}", request.getRequestURI(), exception.getMessage());
        return problems.create(ErrorCode.MALFORMED_REQUEST, detail, request.getRequestURI());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail onUnmappedPath(NoResourceFoundException exception, HttpServletRequest request) {
        return problems.create(ErrorCode.RESOURCE_NOT_FOUND,
                "No endpoint is mapped to %s %s".formatted(request.getMethod(), exception.getResourcePath()),
                request.getRequestURI());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail onAuthentication(AuthenticationException exception, HttpServletRequest request) {
        log.warn("Authentication failed for {}: {}", request.getRequestURI(), exception.getMessage());
        return problems.create(ErrorCode.AUTHENTICATION_REQUIRED,
                "Authentication is required to access this resource", request.getRequestURI());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail onAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        log.warn("Access denied for {} on {}", CurrentRequest.userEmail().orElse("anonymous"), request.getRequestURI());
        return problems.create(ErrorCode.ACCESS_DENIED,
                "You do not have permission to perform this action", request.getRequestURI());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail onDataIntegrity(DataIntegrityViolationException exception, HttpServletRequest request) {
        log.warn("Database rejected the write on {}: {}", request.getRequestURI(),
                exception.getMostSpecificCause().getMessage());
        return problems.create(ErrorCode.RESOURCE_CONFLICT,
                "The change conflicts with data that already exists", request.getRequestURI());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ProblemDetail onConcurrentModification(OptimisticLockingFailureException exception, HttpServletRequest request) {
        log.info("Concurrent modification on {}", request.getRequestURI());
        return problems.create(ErrorCode.RESOURCE_CONFLICT,
                "Someone else changed this record while you were editing it. Reload and try again.",
                request.getRequestURI());
    }

    /// Last line of defence.
    @ExceptionHandler(Exception.class)
    public ProblemDetail onUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), exception);
        return problems.create(ErrorCode.INTERNAL_ERROR,
                "Something went wrong on our side. Quote the correlation id when reporting this.",
                request.getRequestURI());
    }

    private static String quoted(String value) {
        return "\"" + value + "\"";
    }
}
