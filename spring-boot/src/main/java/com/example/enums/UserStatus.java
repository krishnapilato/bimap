package com.example.enums;

public enum UserStatus {

    NOT_CONFIRMED, CONFIRMED;

    public boolean isConfirmed() {
        return this == CONFIRMED;
    }

    public boolean isPending() {
        return this == NOT_CONFIRMED;
    }
}