package com.example.enums;

import org.springframework.security.core.GrantedAuthority;

public enum ApplicationRole implements GrantedAuthority {

    USER, MANAGER, ADMINISTRATOR;

    @Override
    public String getAuthority() {
        return "ROLE_" + name();
    }
}