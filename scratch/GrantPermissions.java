import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class GrantPermissions {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
        String user = "postgres.gbvvarizcuuqrtlxwign";
        String password = "Devayani17@123";

        try {
            Class.forName("org.postgresql.Driver");
            System.out.println("Connecting to database...");
            Connection conn = DriverManager.getConnection(url, user, password);
            System.out.println("Connected successfully!");

            Statement stmt = conn.createStatement();
            
            System.out.println("Granting privileges on tables...");
            stmt.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;");
            
            System.out.println("Granting privileges on sequences...");
            stmt.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;");
            
            System.out.println("Granting privileges on functions...");
            stmt.execute("GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;");

            System.out.println("Altering default privileges for future tables...");
            stmt.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;");
            stmt.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;");
            stmt.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;");

            System.out.println("Creating public SELECT policy on institutions...");
            stmt.execute("DROP POLICY IF EXISTS read_institution_public ON public.institutions;");
            stmt.execute("CREATE POLICY read_institution_public ON public.institutions FOR SELECT TO public USING (true);");

            System.out.println("Inserting NMIMS university into institutions table...");
            stmt.execute("INSERT INTO public.institutions (id, name, subdomain, branding_config) " +
                         "VALUES ('e5f6a7b8-3333-3333-3333-333333333333', 'NMIMS University', 'nmims', " +
                         "'{\"primaryColor\": \"#D32F2F\", \"accentColor\": \"#FFC107\", \"logoUrl\": \"\", \"supportEmail\": \"wellness@nmims.edu\", \"emergencyPhone\": \"022-42355555\"}'::jsonb) " +
                         "ON CONFLICT (subdomain) DO NOTHING;");

            System.out.println("Permissions granted successfully!");
            stmt.close();
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
