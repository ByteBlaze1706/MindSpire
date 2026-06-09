package com.mindspire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private UUID id;
    private String email;
    private String role;
    private UUID institutionId;
    private String subdomain;
    private String message;
    private boolean requiresApproval;
}
