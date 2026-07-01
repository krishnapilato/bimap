package com.example.beans.login;

import com.example.beans.User;

public record LoginResponse(String jwtToken, User user) { }