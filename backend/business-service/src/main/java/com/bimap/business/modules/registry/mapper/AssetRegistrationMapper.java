package com.bimap.business.modules.registry.mapper;

import com.bimap.business.modules.registry.domain.AssetRegistration;
import com.bimap.business.modules.registry.dto.AssetRegistrationRequest;
import com.bimap.business.modules.registry.dto.AssetRegistrationView;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

/// @author Khova Krishna Pilato
@Mapper(unmappedTargetPolicy = ReportingPolicy.ERROR, unmappedSourcePolicy = ReportingPolicy.IGNORE)
public interface AssetRegistrationMapper {

    @Mapping(target = "id", source = "publicId")
    @Mapping(target = "fullAddress", expression = "java(registration.fullAddress())")
    AssetRegistrationView toView(AssetRegistration registration);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "publicId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "reviewNote", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "reviewedAt", ignore = true)
    @Mapping(target = "reviewedBy", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    AssetRegistration toEntity(AssetRegistrationRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "publicId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "reviewNote", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "reviewedAt", ignore = true)
    @Mapping(target = "reviewedBy", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void applyUpdate(AssetRegistrationRequest request, @MappingTarget AssetRegistration registration);
}
