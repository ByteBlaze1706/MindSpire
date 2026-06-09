package com.mindspire.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    @Value("${mindspire.jwt.secret}")
    private String jwtSecret;

    private static final long JWT_EXPIRATION = 86400000; // 24 hours in milliseconds

    private SecretKey getSigningKey() {
        byte[] keyBytes = this.jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generates a token with custom claims.
     */
    public String generateToken(String email, String role, UUID institutionId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + JWT_EXPIRATION);

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .claim("institutionId", institutionId.toString())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSignKey())
                .compact();
    }

    private SecretKey getSignKey() {
        return getSigningKey();
    }

    /**
     * Retrieves username from JWT.
     */
    public String getUsernameFromJwt(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    /**
     * Retrieves user role from JWT.
     */
    public String getRoleFromJwt(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("role", String.class);
    }

    /**
     * Retrieves institution ID from JWT.
     */
    public UUID getInstitutionIdFromJwt(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.get("institutionId", String.class));
    }

    /**
     * Validates JWT token signature and expiration.
     */
    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(getSignKey()).build().parseSignedClaims(authToken);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }
}
