package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.Rola;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;

import java.util.List;
import java.util.Optional;

@Repository
public interface UzytkownikRepository extends JpaRepository<Uzytkownik, Long> {
    Optional<Uzytkownik> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Uzytkownik> findByRola(Rola rola);
}
