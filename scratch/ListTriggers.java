import java.io.File;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ListTriggers {
    public static void main(String[] args) {
        loadEnv();

        String url = getEnv("JDBC_DATABASE_URL", "jdbc:postgresql://localhost:5432/postgres");
        String user = getEnv("JDBC_DATABASE_USERNAME", "postgres");
        String password = getEnv("JDBC_DATABASE_PASSWORD", "postgres");

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Querying all triggers on public schema...");
            String query = "SELECT tgname AS trigger_name, relname AS table_name, proname AS function_name " +
                           "FROM pg_trigger " +
                           "JOIN pg_class ON pg_class.oid = tgrelid " +
                           "JOIN pg_proc ON pg_proc.oid = tgfoid " +
                           "JOIN pg_namespace ON pg_namespace.oid = relnamespace " +
                           "WHERE nspname = 'public';";
            
            try (ResultSet rs = stmt.executeQuery(query)) {
                while (rs.next()) {
                    System.out.printf("Table: %-25s | Trigger: %-30s | Function: %s%n",
                            rs.getString("table_name"),
                            rs.getString("trigger_name"),
                            rs.getString("function_name"));
                }
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
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String getEnv(String name, String defaultValue) {
        String val = System.getProperty(name);
        if (val == null) {
            val = System.getenv(name);
        }
        return val != null ? val : defaultValue;
    }
}
