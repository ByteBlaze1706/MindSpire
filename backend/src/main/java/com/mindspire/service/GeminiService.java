package com.mindspire.service;

import com.mindspire.dto.ChatResponse;
import com.mindspire.entity.AiChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class GeminiService {

    @Value("${mindspire.gemini.api-key}")
    private String apiKey;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    private static final List<String> CRISIS_KEYWORDS = List.of(
            "suicide", "kill myself", "end my life", "want to die", "harm myself", 
            "self-harm", "cut myself", "hang myself", "poison myself", "jump off",
            "atmarahatya", "marna chahta", "jeevan samapt"
    );

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Checks user prompt for crisis language patterns.
     */
    public boolean scanForCrisis(String text) {
        if (text == null) return false;
        String normalized = text.toLowerCase(Locale.ROOT);
        for (String keyword : CRISIS_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calls Gemini API to generate supportive wellness content.
     */
    public ChatResponse generateResponse(UUID sessionId, String sessionTitle, String userMessage, List<AiChatMessage> history, String language) {
        boolean isCrisis = scanForCrisis(userMessage);
        
        String crisisHelpline = "If you or someone you know is struggling or in distress, help is available. " +
                "Please reach out to Tele-MANAS (Mental Health Assistance and Nationally Actionable Plan) at 14416 or 1-800-891-4416. " +
                "These services are free, confidential, and available 24/7. " +
                "Please connect with your university counselor immediately.";

        if (isCrisis) {
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .sessionTitle(sessionTitle)
                    .response("I hear that you're going through a very difficult time, but I cannot assist with this. " +
                            "Please contact our helpline support systems immediately. " + crisisHelpline)
                    .isCrisis(true)
                    .crisisHelpline(crisisHelpline)
                    .escalateToCounselor(true)
                    .build();
        }

        // System instructions template
        String systemInstruction = "You are MindSpire AI, a digital mental wellness assistant. " +
                "Provide supportive, empathetic wellness tips, mindfulness exercises, or journaling reflections. " +
                "CRITICAL SAFETY RULE: You are not a medical professional, and you must never diagnose the user " +
                "with any mental health condition, recommend medication, or replace a human clinical counselor. " +
                "If the user shows signs of distress, suggest talking to an institution counselor. " +
                "IMPORTANT: You must write your entire response in the requested language: " + language + ".";

        if (apiKey == null || apiKey.equals("mock-gemini-api-key") || apiKey.trim().isEmpty()) {
            // Simulated response when API key is not configured
            String mockReply = getMockReply(userMessage, language);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .sessionTitle(sessionTitle)
                    .response(mockReply)
                    .isCrisis(false)
                    .crisisHelpline("")
                    .escalateToCounselor(userMessage.toLowerCase().contains("counselor") || userMessage.toLowerCase().contains("sad"))
                    .build();
        }

        try {
            // Build the REST JSON payload for Gemini API
            StringBuilder contentsJson = new StringBuilder();
            contentsJson.append("{\"contents\":[");
            
            // Add system instruction inside the user contents context
            contentsJson.append("{\"role\":\"user\",\"parts\":[{\"text\":\"")
                    .append(escapeJson(systemInstruction))
                    .append("\"}]},");
            
            // Add conversation history if present
            for (AiChatMessage msg : history) {
                contentsJson.append("{\"role\":\"")
                        .append(msg.getRole().equals("user") ? "user" : "model")
                        .append("\",\"parts\":[{\"text\":\"")
                        .append(escapeJson(msg.getEncryptedContent())) // Assumed decrypted/processed content passed here
                        .append("\"}]},");
            }
            
            // Add active message
            contentsJson.append("{\"role\":\"user\",\"parts\":[{\"text\":\"")
                    .append(escapeJson(userMessage))
                    .append("\"}]}");
            
            contentsJson.append("]}");

            String url = GEMINI_API_URL + apiKey;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(contentsJson.toString(), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String responseBody = response.body();
                String aiText = extractTextFromGeminiJson(responseBody);
                return ChatResponse.builder()
                        .sessionId(sessionId)
                        .sessionTitle(sessionTitle)
                        .response(aiText)
                        .isCrisis(false)
                        .crisisHelpline("")
                        .escalateToCounselor(userMessage.toLowerCase().contains("counselor"))
                        .build();
            } else {
                System.err.println("Gemini API Error! Status Code: " + response.statusCode());
                System.err.println("Gemini API Error Response: " + response.body());
                return ChatResponse.builder()
                        .sessionId(sessionId)
                        .sessionTitle(sessionTitle)
                        .response("I apologize, I am experiencing temporary difficulties connecting to my cognitive system. How else can I support your wellbeing?")
                        .isCrisis(false)
                        .crisisHelpline("")
                        .escalateToCounselor(false)
                        .build();
            }
        } catch (Exception e) {
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .sessionTitle(sessionTitle)
                    .response("I apologize, I could not complete the response due to a system network error. Please try again.")
                    .isCrisis(false)
                    .crisisHelpline("")
                    .escalateToCounselor(false)
                    .build();
        }
    }

    private String getMockReply(String userMessage, String language) {
        String lang = language != null ? language.toLowerCase() : "english";
        if (lang.contains("hindi")) {
            return "नमस्ते! मैं आपका माइंडस्पायर एआई साथी हूं। [सिमुलेशन मोड] मैं आपको ध्यान लगाने या तनाव कम करने के सांस अभ्यास करने की सलाह दे सकता हूं। क्या आप सांस अभ्यास करना चाहते हैं?";
        } else if (lang.contains("marathi")) {
            return "नमस्कार! मी तुमचा माइंडस्पायर एआय साथीदार आहे. [सिम्युलेशन मोड] तुमच्या भावनांबद्दल मला सांगा. मी तुम्हाला मदत करू शकेन.";
        } else if (lang.contains("tamil")) {
            return "வணக்கம்! நான் உங்கள் மைண்ட்ஸ்பயர் AI துணைவன். [உருவகப்படுத்துதல் முறை] உங்கள் ஆரோக்கியத்தை மேம்படுத்த நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?";
        } else if (lang.contains("telugu")) {
            return "నమస్కారం! నేను మీ మైండ్‌స్పైర్ AI సహచరుడిని. [సిమ్యులేషన్ మోడ్] మీ మానసిక ఆరోగ్యానికి నేను ఎలా సహాయపడగలను?";
        } else if (lang.contains("bengali")) {
            return "হ্যালো! আমি আপনার মাইন্ডস্পায়ার এআই সঙ্গী। [সিমুলেশন মোড] আমি আপনাকে ভালো রাখতে সাহায্য করতে পারি। আপনি কি অনুভূতি ভাগ করতে চান?";
        } else if (lang.contains("gujarati")) {
            return "નમસ્તે! હું તમારો માઇન્ડસ્પાયર એઆઇ સાથી છું. [સિમ્યુલેશન મોડ] તમારી ચિંતાઓ મને કહો.";
        }
        return "Hello! I am your MindSpire AI Companion. [Simulation Mode: API Key is unconfigured]. " +
                "I can suggest breathing exercises, wellness checks, or simple journaling. What would you like to explore today?";
    }

    private String escapeJson(String rawText) {
        if (rawText == null) return "";
        return rawText.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String extractTextFromGeminiJson(String json) {
        // Basic JSON parsing to extract: candidates[0].content.parts[0].text
        try {
            int textIdx = json.indexOf("\"text\":");
            if (textIdx != -1) {
                int start = json.indexOf("\"", textIdx + 7);
                int end = json.indexOf("\"", start + 1);
                // Keep reading if backslash escapes double quote
                while (json.charAt(end - 1) == '\\') {
                    end = json.indexOf("\"", end + 1);
                }
                String extracted = json.substring(start + 1, end);
                // Unescape standard sequences
                return extracted.replace("\\n", "\n")
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\");
            }
        } catch (Exception e) {
            // Ignore parsing error, return fallback
        }
        return "I processed your request, but I had trouble formatting the response payload. Please ask again.";
    }
}
