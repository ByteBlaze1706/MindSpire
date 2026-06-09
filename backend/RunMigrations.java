import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Arrays;

public class RunMigrations {
    private static final String[] MIGRATION_FILES = {
        "20260607000000_init_schema.sql",
        "20260607000100_patch_revisions.sql",
        "20260607000200_phase3_db_adjustments.sql",
        "20260607000300_phase4_revisions.sql",
        "20260607000400_phase5_community.sql",
        "20260607000500_phase6_counselor.sql",
        "20260607000700_phase8_ai.sql",
        "20260607000900_sprint1_auth_patch.sql",
        "20260607001000_phase9_admin.sql"
    };

    public static void main(String[] args) {
        loadEnv();

        String url = getEnv("JDBC_DATABASE_URL", "jdbc:postgresql://localhost:5432/postgres");
        String user = getEnv("JDBC_DATABASE_USERNAME", "postgres");
        String password = getEnv("JDBC_DATABASE_PASSWORD", "postgres");
        
        String migrationsDir = "../supabase/migrations/";
        String seedFile = "../supabase/seed.sql";
        
        System.out.println("Starting Database Migrations Runner...");
        System.out.println("Connecting to database: " + url);
        System.out.println("Using username: " + user);
        
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connection established to live database.");
            
            // 1. SELECT 1 test
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("SELECT 1");
                System.out.println("VERIFICATION: Connection verified with SELECT 1");
            }

            // 2. Run all migration files
            for (String file : MIGRATION_FILES) {
                String filePath = migrationsDir + file;
                System.out.println("Applying migration: " + file);
                
                String sql = new String(Files.readAllBytes(Paths.get(filePath)));
                
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute(sql);
                    System.out.println("SUCCESS: Applied " + file);
                } catch (Exception e) {
                    System.err.println("MIGRATION FAILURE in file: " + file);
                    e.printStackTrace();
                    System.exit(1);
                }
            }
            
            // 3. Execute seed.sql
            System.out.println("Applying seed data: seed.sql");
            String seedSql = new String(Files.readAllBytes(Paths.get(seedFile)));
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(seedSql);
                System.out.println("SUCCESS: Applied seed.sql");
            } catch (Exception e) {
                System.err.println("SEED FILE FAILURE in seed.sql");
                e.printStackTrace();
                System.exit(1);
            }
            
            System.out.println("All database migrations and seeding completed successfully!");
            
        } catch (Exception e) {
            System.err.println("DATABASE CONNECTION FAILURE!");
            e.printStackTrace();
            System.exit(1);
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
