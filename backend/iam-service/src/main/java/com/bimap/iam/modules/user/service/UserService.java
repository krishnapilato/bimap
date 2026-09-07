package com.bimap.iam.modules.user.service;

import com.bimap.iam.modules.auth.service.RegistrationService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.AuthProvider;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.dto.CreateUserRequest;
import com.bimap.iam.modules.user.dto.UpdateUserRequest;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.iam.modules.user.dto.UserStatistics;
import com.bimap.iam.modules.user.mapper.UserMapper;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.ResourceConflictException;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.web.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/// Reading and editing accounts.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserAccountRepository accounts;
    private final RegistrationService registrationService;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public PageResponse<UserResponse> search(String term, AccountStatus status, Pageable pageable) {
        var normalised = term == null || term.isBlank() ? null : term.strip();
        return PageResponse.of(accounts.search(normalised, status, pageable), userMapper::toResponse);
    }

    public UserResponse findById(String publicId) {
        return userMapper.toResponse(require(publicId));
    }

    /// The account behind the bearer token on this request.
    public UserResponse currentUser() {
        var email = CurrentRequest.userEmail()
                .orElseThrow(() -> new ResourceNotFoundException("No authenticated account on this request"));
        return accounts.findByEmailIgnoreCase(email)
                .map(userMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Account", email));
    }

    public boolean isEmailAvailable(String email) {
        return !accounts.existsByEmailIgnoreCase(email.strip());
    }

    public UserStatistics statistics() {
        return new UserStatistics(
                accounts.count() - accounts.countByStatus(AccountStatus.DELETED),
                accounts.countByStatus(AccountStatus.ACTIVE),
                accounts.countByStatus(AccountStatus.PENDING_ACTIVATION),
                accounts.countByStatus(AccountStatus.LOCKED),
                accounts.countByStatus(AccountStatus.DISABLED));
    }

    /// Creates an account on an administrator behalf. With no password, an invitation is sent
    /// and the recipient chooses their own.
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (accounts.existsByEmailIgnoreCase(request.email())) {
            throw new ResourceConflictException(ErrorCode.EMAIL_ALREADY_REGISTERED,
                    "An account already exists for this email address.");
        }

        var invited = request.password() == null || request.password().isBlank();
        var account = accounts.save(UserAccount.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .passwordHash(invited ? null : passwordEncoder.encode(request.password()))
                .role(request.role())
                .status(AccountStatus.PENDING_ACTIVATION)
                .authProvider(AuthProvider.LOCAL)
                .passwordChangedAt(invited ? null : Instant.now())
                .build());

        registrationService.sendActivationLink(account);
        log.info("Created {} with role {}", account.getEmail(), account.getRole());
        return userMapper.toResponse(account);
    }

    @Transactional
    public UserResponse update(String publicId, UpdateUserRequest request) {
        var account = require(publicId);

        if (request.email() != null && !request.email().equalsIgnoreCase(account.getEmail())
                && accounts.existsByEmailIgnoreCase(request.email())) {
            throw new ResourceConflictException(ErrorCode.EMAIL_ALREADY_REGISTERED,
                    "Another account already uses this email address.");
        }

        userMapper.applyUpdate(request, account);
        log.info("Updated {}", account.getEmail());
        return userMapper.toResponse(account);
    }

    private UserAccount require(String publicId) {
        return accounts.findByPublicId(publicId)
                .orElseThrow(() -> new ResourceNotFoundException("User", publicId));
    }
}
