package com.example.beans;

import lombok.Data;

@Data
public class LoginResponse { private String jwttoken; private User user; }