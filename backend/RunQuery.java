import java.io.File;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class RunQuery {
    public static void main(String[] args) {
        loadEnv();

        String url = getEnv("JDBC_DATABASE_URL", "jdbc:postgresql://localhost:5432/postgres");
        String user = getEnv("JDBC_DATABASE_USERNAME", "postgres");
        String password = getEnv("JDBC_DATABASE_PASSWORD", "postgres");

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Adding token_id column to anonymous_profiles...");
            stmt.execute("ALTER TABLE public.anonymous_profiles ADD COLUMN IF NOT EXISTS token_id VARCHAR(100) UNIQUE;");
            System.out.println("Successfully added token_id column.");

            System.out.println("Populating token_id column for existing profiles...");
            stmt.execute("UPDATE public.anonymous_profiles SET token_id = 'NMIMS-' || upper(substring(md5(random()::text) from 1 for 6)) WHERE token_id IS NULL;");
            System.out.println("Successfully populated existing profiles with random tokens.");

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
