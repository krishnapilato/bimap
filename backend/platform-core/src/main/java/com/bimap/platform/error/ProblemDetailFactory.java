package com.bimap.platform.error;

import com.bimap.platform.context.CurrentRequest;
import org.springframework.http.ProblemDetail;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/// Builds RFC 7807 problem documents with the members every BiMap error carries.
/// @author Khova Krishna Pilato
public class ProblemDetailFactory {

    private static final String TYPE_PREFIX = "urn:bimap:error:";

    public ProblemDetail create(ErrorCode code, String detail, String path) {
        var problem = ProblemDetail.forStatusAndDetail(code.status(), detail);
        problem.setType(URI.create(TYPE_PREFIX + code.slug()));
        problem.setTitle(code.title());
        problem.setProperty("code", code.name());
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("correlationId", CurrentRequest.correlationId());
        if (path != null) {
            problem.setInstance(URI.create(path));
        }
        return problem;
    }

    public ProblemDetail create(ErrorCode code, String detail, String path, Map<String, Object> extra) {
        var problem = create(code, detail, path);
        extra.forEach(problem::setProperty);
        return problem;
    }

    public ProblemDetail withViolations(ErrorCode code, String detail, String path, List<FieldViolation> violations) {
        var problem = create(code, detail, path);
        problem.setProperty("violations", violations);
        return problem;
    }
}
