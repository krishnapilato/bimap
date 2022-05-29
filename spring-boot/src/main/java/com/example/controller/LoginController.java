package com.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.beans.LoginRequest;
import com.example.beans.LoginResponse;
import com.example.beans.User;
import com.example.core.security.JwtUtils;
import com.example.repository.UserRepository;

@RestController
@CrossOrigin
public class LoginController {
	@Autowired
	private AuthenticationManager authenticationManager;
	@Autowired
	private JwtUtils jwtTokenUtil;
	@Autowired
	private UserRepository userRepository;

	@PostMapping("/login")
	public LoginResponse createAuthenticationToken(@RequestBody LoginRequest loginRequest) {
		// Auth request
		authenticationManager.authenticate(
				new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

		User user = this.userRepository.findByEmailAddress(loginRequest.getUsername())
		.orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + loginRequest.getUsername()));
		
		final String token = jwtTokenUtil.generateToken(user);
		
		LoginResponse response = new LoginResponse();
		response.setJwttoken(token);
		response.setUser(user);
		
		return response;
	}
}