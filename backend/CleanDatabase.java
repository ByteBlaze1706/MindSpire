import java.io.File;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class CleanDatabase {
    public static void main(String[] args) {
        loadEnv();

        String url = getEnv("JDBC_DATABASE_URL", "jdbc:postgresql://localhost:5432/postgres");
        String user = getEnv("JDBC_DATABASE_USERNAME", "postgres");
        String password = getEnv("JDBC_DATABASE_PASSWORD", "postgres");
        
        System.out.println("Cleaning the database by dropping and recreating public schema...");
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            stmt.execute("DROP SCHEMA public CASCADE");
            System.out.println("SUCCESS: Dropped schema public.");
            
            stmt.execute("CREATE SCHEMA public");
            System.out.println("SUCCESS: Created schema public.");
            
            stmt.execute("GRANT ALL ON SCHEMA public TO postgres");
            stmt.execute("GRANT ALL ON SCHEMA public TO anon");
            stmt.execute("GRANT ALL ON SCHEMA public TO authenticated");
            stmt.execute("GRANT ALL ON SCHEMA public TO service_role");
            System.out.println("SUCCESS: Re-granted default permissions on public schema.");
            
            System.out.println("Database is now clean!");
        } catch (Exception e) {
            System.out.println("FAILURE during database cleaning!");
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
