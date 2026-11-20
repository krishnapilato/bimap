package com.bimap.controller;

import module java.base;

import com.bimap.core.HtmlErrorPage;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.Nullable;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final HtmlErrorPage errorPage;

    public GlobalExceptionHandler(HtmlErrorPage errorPage) {
        this.errorPage = errorPage;
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleExceptionInternal(Exception exception, @Nullable Object body, @NonNull HttpHeaders headers, @NonNull HttpStatusCode status, @NonNull WebRequest request) {
        if (request instanceof ServletWebRequest servlet && errorPage.acceptsHtml(servlet.getRequest()) && servlet.getResponse() != null) {
            var response = Objects.requireNonNull(servlet.getResponse());
            headers.forEach((name, values) -> values.forEach(value -> response.addHeader(name, value)));
            try {
                errorPage.write(servlet.getRequest(), response, status.value());
            } catch (IOException exceptionWritingPage) {
                throw new UncheckedIOException(exceptionWritingPage);
            }
            return null;
        }
        return super.handleExceptionInternal(exception, body, headers, status, request);
    }

    @ExceptionHandler
    @Nullable ProblemDetail handleMailException(MailException exception, HttpServletRequest request, HttpServletResponse response) throws IOException {
        log.warn("Email delivery failed: {}", exception.getClass().getSimpleName());
        if (errorPage.acceptsHtml(request)) {
            errorPage.write(request, response, HttpStatus.SERVICE_UNAVAILABLE.value());
            return null;
        }
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, "The email could not be sent. Try again later.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception, @NonNull HttpHeaders headers, @NonNull HttpStatusCode status, @NonNull WebRequest request) {
        var errors = new LinkedHashMap<String, String>();
        exception.getBindingResult().getFieldErrors().forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        exception.getBody().setProperty("errors", errors);
        return handleExceptionInternal(exception, exception.getBody(), headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException exception, @NonNull HttpHeaders headers, @NonNull HttpStatusCode status, @NonNull WebRequest request) {
        var errors = new LinkedHashMap<String, String>();
        exception.getParameterValidationResults().forEach(result -> {
            if (result instanceof ParameterErrors fields) {
                fields.getFieldErrors().forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
            } else {
                errors.putIfAbsent(result.getMethodParameter().getParameterName(), result.getResolvableErrors().getFirst().getDefaultMessage());
            }
        });
        exception.getBody().setProperty("errors", errors);
        return handleExceptionInternal(exception, exception.getBody(), headers, status, request);
    }
}
