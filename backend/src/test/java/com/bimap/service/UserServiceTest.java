package com.bimap.service;

import com.bimap.model.User;
import com.bimap.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Test
    void authenticatedIdentityIsLoadedByIdEvenIfItsEmailHasChanged() {
        var repository = mock(UserRepository.class);
        var authentication = mock(AuthenticationManager.class);
        var original = new User("Original", "User", "renamed@bimap.test", "hash", User.Role.USER);
        when(authentication.authenticate(any())).thenReturn(UsernamePasswordAuthenticationToken.authenticated("42", null, List.of()));
        when(repository.findById(42L)).thenReturn(Optional.of(original));
        var service = new UserService(repository, mock(PasswordEncoder.class), authentication, "http://localhost:4200");

        assertThat(service.authenticate("reassigned@bimap.test", "password")).isSameAs(original);
        verify(repository, never()).findByEmail(any());
    }
}
