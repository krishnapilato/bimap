package com.example.core;

import java.net.InetAddress;
import java.net.URI;

public class MainTest {

    public static void main(String[] args) {

        var url = URI.create("http://127.0.0.1:4200/");
        var host = url.getHost();

        try {
            var inetAddress = InetAddress.getByName(host);

            System.out.printf("""
                    Host: %s
                    IP: %s
                    %n""", inetAddress.getHostName(), inetAddress.getHostAddress());

        } catch (Exception ex) {
            System.err.println("Cannot resolve host: " + host);
        }
    }
}