package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.auth.dto.OperationResult;
import com.bimap.iam.modules.auth.service.ClientFingerprint;
import com.bimap.iam.modules.mailing.dto.PublicListView;
import com.bimap.iam.modules.mailing.dto.SubscribeRequest;
import com.bimap.iam.modules.mailing.dto.SubscriptionTokenRequest;
import com.bimap.iam.modules.mailing.dto.SubscriptionView;
import com.bimap.iam.modules.mailing.dto.UnsubscribeRequest;
import com.bimap.iam.modules.mailing.service.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController implements SubscriptionApi {

    private final SubscriptionService subscriptions;

    @Override
    @GetMapping("/lists/{listId}")
    public PublicListView publicList(@PathVariable String listId) {
        return subscriptions.publicList(listId);
    }

    @Override
    @PostMapping
    public ResponseEntity<OperationResult> subscribe(@Valid @RequestBody SubscribeRequest request,
                                                     HttpServletRequest httpRequest) {
        subscriptions.subscribe(request, ClientFingerprint.from(httpRequest));
        return ResponseEntity.accepted().body(OperationResult.of(
                "Thanks. If this address needs confirming, a link is on its way."));
    }

    @Override
    @PostMapping("/confirm")
    public SubscriptionView confirm(@Valid @RequestBody SubscriptionTokenRequest request,
                                    HttpServletRequest httpRequest) {
        return subscriptions.confirm(request.token(), ClientFingerprint.from(httpRequest));
    }

    @Override
    @GetMapping("/manage")
    public SubscriptionView manage(@RequestParam String token) {
        return subscriptions.manage(token);
    }

    @Override
    @PostMapping("/unsubscribe")
    public SubscriptionView unsubscribe(@Valid @RequestBody UnsubscribeRequest request) {
        return subscriptions.unsubscribe(request.token(), request.reason());
    }

    @Override
    @PostMapping("/resubscribe")
    public SubscriptionView resubscribe(@Valid @RequestBody SubscriptionTokenRequest request,
                                        HttpServletRequest httpRequest) {
        return subscriptions.resubscribe(request.token(), ClientFingerprint.from(httpRequest));
    }

    @Override
    @PostMapping("/one-click")
    public ResponseEntity<Void> oneClick(@RequestParam String token) {
        subscriptions.oneClickUnsubscribe(token);
        return ResponseEntity.ok().build();
    }
}
