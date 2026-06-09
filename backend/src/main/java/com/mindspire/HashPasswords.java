package com.mindspire;

import java.io.File;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashPasswords {
    public static void main(String[] args) {
        loadEnv();

        String url = getEnv("JDBC_DATABASE_URL", "jdbc:postgresql://localhost:5432/postgres");
        String user = getEnv("JDBC_DATABASE_USERNAME", "postgres");
        String password = getEnv("JDBC_DATABASE_PASSWORD", "postgres");

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hashedPassword = encoder.encode("DemoPass123!");

        System.out.println("Generated BCrypt Hash: " + hashedPassword);

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to live database.");

            // Update all seeded users with the hashed password and approve them
            String sql = "UPDATE public.users SET password_hash = ?, is_approved = true WHERE email IN (" +
                         "'student1@columbia.edu', 'counselor1@columbia.edu', 'admin@columbia.edu', 'superadmin@mindspire.app')";
            
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, hashedPassword);
                int rows = pstmt.executeUpdate();
                System.out.println("Updated " + rows + " seeded users with hashed passwords and approved status.");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void loadEnv() {
        try {
            File envFile = new File("../.env");
            if (!envFile.exists()) {
                envFile = new File(".env");
            }
            if (envFile.exists()) {
                for (String line : Files.readAllLines(envFile.toPath())) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) continue;
                    String[] parts = line.split("=", 2);
                    if (parts.length == 2) {
                        String key = parts[0].trim();
                        String val = parts[1].trim();
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, val);
                        }
                    }
                }
                System.out.println("Loaded environment settings from: " + envFile.getAbsolutePath());
            }
        } catch (Exception e) {
            System.out.println("Note: Could not parse .env file: " + e.getMessage());
        }
    }

    private static String getEnv(String key, String defaultValue) {
        String val = System.getenv(key);
        if (val == null) {
            val = System.getProperty(key);
        }
        if (val == null) {
            val = defaultValue;
        }
        return val;
    }
}
