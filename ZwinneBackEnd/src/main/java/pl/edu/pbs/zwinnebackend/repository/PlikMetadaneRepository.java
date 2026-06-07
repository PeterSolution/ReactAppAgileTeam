package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.PlikMetadane;

import java.util.List;

@Repository
public interface PlikMetadaneRepository extends JpaRepository<PlikMetadane, Long> {
    List<PlikMetadane> findByProjektId(Long projektId);
    List<PlikMetadane> findByZadanieId(Long zadanieId);
}
