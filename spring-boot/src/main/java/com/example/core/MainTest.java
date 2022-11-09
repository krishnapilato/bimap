package com.example.core;

import java.net.InetAddress;
import java.net.UnknownHostException;

public class MainTest {

	public static void main(String[] args) throws Exception {
		String host = "http://127.0.0.1:4200/";
		try {
			InetAddress inetAddress = InetAddress.getByName(host);
			// show the Internet Address as name/address
			System.out.println(inetAddress.getHostName() + " " + inetAddress.getHostAddress());
		} catch (UnknownHostException exception) {
			System.err.println("ERROR: Cannot access '" + host + "'");
		}

	}

}
