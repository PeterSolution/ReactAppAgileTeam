package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.Komentarz;

import java.util.List;

@Repository
public interface KomentarzRepository extends JpaRepository<Komentarz, Long> {
    List<Komentarz> findByZadanieIdOrderByDataUtworzeniaAsc(Long zadanieId);
}
