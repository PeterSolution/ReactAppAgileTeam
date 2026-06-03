package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.RefreshToken;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    
    Optional<RefreshToken> findByUzytkownik(Uzytkownik uzytkownik);
    
    @Modifying
    int deleteByUzytkownik(Uzytkownik uzytkownik);
}
