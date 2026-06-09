import java.net.Socket;
import java.net.InetAddress;

public class TestIPv6 {
    public static void main(String[] args) {
        String ip6 = "2406:da14:1d62:b400:a113:c511:aee7:fbc";
        int port = 5432;
        System.out.println("Testing socket connection to IPv6 address: " + ip6 + " on port " + port);
        try {
            InetAddress addr = InetAddress.getByName(ip6);
            Socket socket = new Socket(addr, port);
            System.out.println("SUCCESS: Socket connection established!");
            socket.close();
        } catch (Exception e) {
            System.out.println("FAILURE: Socket connection failed!");
            e.printStackTrace();
        }
    }
}
