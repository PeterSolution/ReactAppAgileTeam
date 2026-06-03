package pl.edu.pbs.zwinnebackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.model.RefreshToken;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.repository.RefreshTokenRepository;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    @Value("${app.jwt.refresh-expiration-ms}")
    private Long refreshTokenDurationMs;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        Uzytkownik uzytkownik = uzytkownikRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + userId + " nie istnieje."));

        // Sprawdzamy czy istnieje już token dla tego użytkownika
        Optional<RefreshToken> existingTokenOpt = refreshTokenRepository.findByUzytkownik(uzytkownik);

        RefreshToken refreshToken;
        if (existingTokenOpt.isPresent()) {
            refreshToken = existingTokenOpt.get();
            refreshToken.setToken(UUID.randomUUID().toString());
            refreshToken.setDataWygasniecia(Instant.now().plusMillis(refreshTokenDurationMs));
        } else {
            refreshToken = RefreshToken.builder()
                    .uzytkownik(uzytkownik)
                    .token(UUID.randomUUID().toString())
                    .dataWygasniecia(Instant.now().plusMillis(refreshTokenDurationMs))
                    .build();
        }

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getDataWygasniecia().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new IllegalArgumentException("Token odświeżania wygasł. Zaloguj się ponownie.");
        }
        return token;
    }

    @Transactional
    public int deleteByUserId(Long userId) {
        Uzytkownik uzytkownik = uzytkownikRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + userId + " nie istnieje."));
        return refreshTokenRepository.deleteByUzytkownik(uzytkownik);
    }
}
