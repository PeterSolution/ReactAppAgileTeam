package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.Zadanie;

import java.util.List;

@Repository
public interface ZadanieRepository extends JpaRepository<Zadanie, Long> {
    List<Zadanie> findByProjektIdOrderByKolejnoscAsc(Long projektId);
    List<Zadanie> findByProjektId(Long projektId);
}
