package com.bimap.iam.modules.user.mapper;

import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.dto.UpdateUserRequest;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.platform.context.AuthenticatedUser;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

/// @author Khova Krishna Pilato
@Mapper(unmappedTargetPolicy = ReportingPolicy.ERROR, unmappedSourcePolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(target = "id", source = "publicId")
    @Mapping(target = "fullName", expression = "java(account.fullName())")
    @Mapping(target = "permissions", expression = "java(account.getRole().authorities())")
    UserResponse toResponse(UserAccount account);

    List<UserResponse> toResponses(List<UserAccount> accounts);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "displayName", expression = "java(account.fullName())")
    @Mapping(target = "role", expression = "java(account.getRole().name())")
    @Mapping(target = "authorities", expression = "java(account.getRole().authorities())")
    @Mapping(target = "tenant", ignore = true)
    AuthenticatedUser toPrincipal(UserAccount account);

    /// Copies only the members the caller actually sent.
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "publicId", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "authProvider", ignore = true)
    @Mapping(target = "externalId", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    @Mapping(target = "failedLoginAttempts", ignore = true)
    @Mapping(target = "lockedUntil", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "passwordChangedAt", ignore = true)
    @Mapping(target = "activatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void applyUpdate(UpdateUserRequest request, @MappingTarget UserAccount account);
}
