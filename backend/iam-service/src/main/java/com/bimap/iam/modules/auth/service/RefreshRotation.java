package com.bimap.iam.modules.auth.service;

import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.platform.security.IssuedToken;

/// The outcome of trading in a refresh token: who it belonged to, and its replacement.
/// @author Khova Krishna Pilato
public record RefreshRotation(UserAccount account, IssuedToken refreshToken) {
}
