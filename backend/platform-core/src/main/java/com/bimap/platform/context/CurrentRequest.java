package com.bimap.platform.context;

import java.util.Optional;
import java.util.concurrent.Callable;

/// Ambient access to the [RequestContext] of the request being served on this thread.
/// @author Khova Krishna Pilato
public final class CurrentRequest {

    private static final ScopedValue<RequestContext> CONTEXT = ScopedValue.newInstance();

    private CurrentRequest() {
    }

    /// Runs `op` with `context` bound, and unbinds it on the way out even if `op` throws.
    public static <T> T bind(RequestContext context, Callable<T> op) throws Exception {
        return ScopedValue.where(CONTEXT, context).call(op::call);
    }

    public static Optional<RequestContext> context() {
        return CONTEXT.isBound() ? Optional.of(CONTEXT.get()) : Optional.empty();
    }

    public static Optional<AuthenticatedUser> user() {
        return context().flatMap(RequestContext::maybeUser);
    }

    /// The caller's id, for stamping `created_by` style audit columns.
    public static Optional<Long> userId() {
        return user().map(AuthenticatedUser::id);
    }

    public static Optional<String> userEmail() {
        return user().map(AuthenticatedUser::email);
    }

    public static Optional<String> tenant() {
        return user().map(AuthenticatedUser::tenant);
    }

    public static String correlationId() {
        return context().map(RequestContext::correlationId).orElse("-");
    }
}
