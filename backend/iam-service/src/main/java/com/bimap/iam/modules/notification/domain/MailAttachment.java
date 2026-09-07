package com.bimap.iam.modules.notification.domain;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/// A file to hang off an outgoing message.
/// @author Khova Krishna Pilato
public record MailAttachment(String filename, String contentType, byte[] content) {

    public MailAttachment {
        content = content == null ? new byte[0] : content.clone();
    }

    public static MailAttachment of(Path path, String contentType) throws IOException {
        return new MailAttachment(path.getFileName().toString(), contentType, Files.readAllBytes(path));
    }

    public Resource asResource() {
        return new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
