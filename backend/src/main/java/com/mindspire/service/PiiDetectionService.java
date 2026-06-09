package com.mindspire.service;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;

@Service
public class PiiDetectionService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", Pattern.CASE_INSENSITIVE);

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "\\b(?:\\+?\\d{1,3}[- .]?)?\\(?[0-9]{3}\\)?[- .]?[0-9]{3}[- .]?[0-9]{4}\\b");

    // Matches standard institutional roll number patterns (e.g., 20CS30045, 2021BT1012, 9-10 digits)
    private static final Pattern ROLL_NUMBER_PATTERN = Pattern.compile(
            "\\b(?:\\d{2,4}[A-Z]{2,4}\\d{3,5}|\\d{8,10})\\b", Pattern.CASE_INSENSITIVE);

    public boolean containsPii(String text) {
        if (text == null || text.trim().isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(text).find() ||
               PHONE_PATTERN.matcher(text).find() ||
               ROLL_NUMBER_PATTERN.matcher(text).find();
    }

    public void validateContent(String text) {
        if (containsPii(text)) {
            throw new IllegalArgumentException("Personal Identifiable Information (PII) detected. For privacy compliance, you cannot post emails, phone numbers, or student roll IDs.");
        }
    }
}
