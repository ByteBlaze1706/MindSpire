package com.mindspire.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class StudentRosterDto {
    private UUID id;
    private String email;
    private String pseudonym;
    private boolean activeConsent;
}
