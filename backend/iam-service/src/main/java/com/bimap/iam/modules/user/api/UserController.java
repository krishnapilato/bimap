package com.bimap.iam.modules.user.api;

import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.dto.AccountStatusChange;
import com.bimap.iam.modules.user.dto.CreateUserRequest;
import com.bimap.iam.modules.user.dto.UpdateUserRequest;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.iam.modules.user.dto.UserStatistics;
import com.bimap.iam.modules.user.service.UserLifecycleService;
import com.bimap.iam.modules.user.service.UserService;
import com.bimap.platform.web.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController implements UserApi {

    private final UserService userService;
    private final UserLifecycleService lifecycleService;

    @Override
    @GetMapping("/me")
    public UserResponse me() {
        return userService.currentUser();
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public PageResponse<UserResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AccountStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return userService.search(q, status, pageable);
    }

    @Override
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public UserStatistics statistics() {
        return userService.statistics();
    }

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public UserResponse findOne(@PathVariable String id) {
        return userService.findById(id);
    }

    @Override
    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public UserResponse update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @Override
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public UserResponse changeStatus(@PathVariable String id, @Valid @RequestBody AccountStatusChange change) {
        return lifecycleService.changeStatus(id, change);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        lifecycleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
