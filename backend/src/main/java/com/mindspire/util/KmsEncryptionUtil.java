package com.mindspire.util;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HexFormat;

public class KmsEncryptionUtil {

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Derives KEK deterministically from master KEK using SHA-256 and salt.
     */
    private static byte[] deriveKek(String masterKey) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String salted = masterKey + "mindspire-dek-salt";
        return digest.digest(salted.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Performs envelope encryption on text payload.
     */
    public static EncryptionResult encrypt(String plainText, String masterKey) throws Exception {
        // 1. Generate random 256-bit DEK
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(256);
        SecretKey dek = keyGen.generateKey();
        byte[] dekBytes = dek.getEncoded();

        // 2. Encrypt text with DEK using AES/GCM
        byte[] iv = new byte[12];
        RANDOM.nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.ENCRYPT_MODE, dek, spec);
        byte[] encryptedPayload = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

        // Split tag and ciphertext (GCM appends tag of 16 bytes at the end in Java)
        byte[] ciphertext = Arrays.copyOfRange(encryptedPayload, 0, encryptedPayload.length - 16);
        byte[] authTag = Arrays.copyOfRange(encryptedPayload, encryptedPayload.length - 16, encryptedPayload.length);

        HexFormat hex = HexFormat.of();
        String ciphertextPayload = hex.formatHex(iv) + ":" + hex.formatHex(authTag) + ":" + hex.formatHex(ciphertext);

        // 3. Encrypt DEK with derived KEK using AES/CBC
        byte[] dekIv = new byte[16];
        RANDOM.nextBytes(dekIv);
        byte[] kekBytes = deriveKek(masterKey);
        SecretKeySpec kekSpec = new SecretKeySpec(kekBytes, "AES");
        
        Cipher dekCipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        dekCipher.init(Cipher.ENCRYPT_MODE, kekSpec, new IvParameterSpec(dekIv));
        byte[] encryptedDek = dekCipher.doFinal(hex.formatHex(dekBytes).getBytes(StandardCharsets.UTF_8));

        String encryptedDekPayload = hex.formatHex(dekIv) + ":" + hex.formatHex(encryptedDek);

        return new EncryptionResult(ciphertextPayload, encryptedDekPayload, "kms-master-v1");
    }

    /**
     * Performs envelope decryption.
     */
    public static String decrypt(String ciphertextPayload, String encryptedDekPayload, String masterKey) throws Exception {
        HexFormat hex = HexFormat.of();

        // 1. Decrypt DEK
        String[] dekParts = encryptedDekPayload.split(":");
        byte[] dekIv = hex.parseHex(dekParts[0]);
        byte[] encryptedDekBytes = hex.parseHex(dekParts[1]);

        byte[] kekBytes = deriveKek(masterKey);
        SecretKeySpec kekSpec = new SecretKeySpec(kekBytes, "AES");

        Cipher dekCipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        dekCipher.init(Cipher.DECRYPT_MODE, kekSpec, new IvParameterSpec(dekIv));
        byte[] decryptedDekHexBytes = dekCipher.doFinal(encryptedDekBytes);
        String dekHex = new String(decryptedDekHexBytes, StandardCharsets.UTF_8);
        byte[] dekBytes = hex.parseHex(dekHex);
        SecretKeySpec dekSpec = new SecretKeySpec(dekBytes, "AES");

        // 2. Decrypt Content
        String[] contentParts = ciphertextPayload.split(":");
        byte[] iv = hex.parseHex(contentParts[0]);
        byte[] authTag = hex.parseHex(contentParts[1]);
        byte[] ciphertext = hex.parseHex(contentParts[2]);

        // Recombine ciphertext and auth tag for Java Cipher
        byte[] combined = new byte[ciphertext.length + authTag.length];
        System.arraycopy(ciphertext, 0, combined, 0, ciphertext.length);
        System.arraycopy(authTag, 0, combined, ciphertext.length, authTag.length);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.DECRYPT_MODE, dekSpec, spec);
        byte[] decryptedBytes = cipher.doFinal(combined);

        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    public static class EncryptionResult {
        public final String ciphertext;
        public final String encryptedDek;
        public final String keyRef;

        public EncryptionResult(String ciphertext, String encryptedDek, String keyRef) {
            this.ciphertext = ciphertext;
            this.encryptedDek = encryptedDek;
            this.keyRef = keyRef;
        }
    }
}
