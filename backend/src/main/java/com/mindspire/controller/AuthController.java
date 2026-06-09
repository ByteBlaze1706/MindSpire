package com.mindspire.controller;

import com.mindspire.dto.AuthResponse;
import com.mindspire.dto.LoginRequest;
import com.mindspire.dto.RegisterRequest;
import com.mindspire.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class AuthController {

    private final AuthService authService;

    @org.springframework.beans.factory.annotation.Value("${mindspire.cookie.secure:false}")
    private boolean cookieSecure;

    private void setTokenCookie(HttpServletResponse response, String token) {
        // Build secure HttpOnly cookie with SameSite=Strict flag
        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true)
                .secure(cookieSecure) // Dynamic based on env properties
                .path("/")
                .maxAge(86400) // 24 Hours
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearTokenCookie(HttpServletResponse response) {
        // Clear token cookie
        ResponseCookie cookie = ResponseCookie.from("token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0) // Instantly expires
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.login(loginRequest);
            
            if (authResponse.isRequiresApproval()) {
                return ResponseEntity.ok(authResponse);
            }

            // Extract JWT token from message payload
            String token = authResponse.getMessage();
            authResponse.setMessage("Authentication successful.");
            
            setTokenCookie(response, token);
            
            return ResponseEntity.ok(authResponse);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(423).body(Map.of("success", false, "error", e.getMessage())); // Locked state
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", e.getMessage())); // Unauthorized
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest, HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.register(registerRequest);
            
            String token = authResponse.getMessage();
            authResponse.setMessage("Registration successful.");
            
            setTokenCookie(response, token);
            
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        clearTokenCookie(response);
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully."));
    }

    @GetMapping("/branding")
    public ResponseEntity<?> getBranding(@RequestParam(value = "subdomain", required = false) String subdomain) {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        String jsonConfig = authService.getBrandingConfig(email, subdomain);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .body(jsonConfig);
    }
}
