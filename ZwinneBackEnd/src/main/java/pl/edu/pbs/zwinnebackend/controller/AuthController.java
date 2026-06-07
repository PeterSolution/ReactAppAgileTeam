package pl.edu.pbs.zwinnebackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import pl.edu.pbs.zwinnebackend.dto.*;
import pl.edu.pbs.zwinnebackend.model.RefreshToken;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.security.JwtTokenProvider;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;
import pl.edu.pbs.zwinnebackend.service.RefreshTokenService;
import pl.edu.pbs.zwinnebackend.service.UserService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            Uzytkownik uzytkownik = userService.registerUser(registerRequest);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Zarejestrowano pomyślnie.");
            response.put("userId", uzytkownik.getId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", ex.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(userPrincipal.getId());

            return ResponseEntity.ok(JwtAuthenticationResponse.builder()
                    .accessToken(jwt)
                    .refreshToken(refreshToken.getToken())
                    .id(userPrincipal.getId())
                    .email(userPrincipal.getEmail())
                    .rola(userPrincipal.getUzytkownik().getRola().name())
                    .firstName(userPrincipal.getUzytkownik().getImie())
                    .lastName(userPrincipal.getUzytkownik().getNazwisko())
                    .build());
        } catch (Exception ex) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Niepoprawny e-mail lub hasło.");
            return ResponseEntity.status(401).body(response);
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshJWT(@Valid @RequestBody TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUzytkownik)
                .map(uzytkownik -> {
                    String token = tokenProvider.generateTokenFromUserId(uzytkownik.getId());
                    // Generujemy również nowy Refresh Token w celu przedłużenia sesji (tzw. Refresh Token Rotation)
                    RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(uzytkownik.getId());
                    return ResponseEntity.ok(TokenRefreshResponse.builder()
                            .accessToken(token)
                            .refreshToken(newRefreshToken.getToken())
                            .build());
                })
                .orElseThrow(() -> new IllegalArgumentException("Token odświeżania nie istnieje w bazie danych."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            refreshTokenService.deleteByUserId(principal.getId());
        }
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Wylogowano pomyślnie.");
        return ResponseEntity.ok(response);
    }
}
