package com.example.beans.login;

import com.example.beans.User;

import lombok.Data;

@Data
public class LoginResponse {
	private String jwttoken;
	private User user;
}