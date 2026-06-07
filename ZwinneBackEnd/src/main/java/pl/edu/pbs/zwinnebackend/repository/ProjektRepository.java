package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.Projekt;

@Repository
public interface ProjektRepository extends JpaRepository<Projekt, Long> {
    Page<Projekt> findByNazwaContainingIgnoreCase(String nazwa, Pageable pageable);
    
    Page<Projekt> findByStudenciId(Long studentId, Pageable pageable);
    
    Page<Projekt> findByNazwaContainingIgnoreCaseAndStudenciId(String nazwa, Long studentId, Pageable pageable);
}
