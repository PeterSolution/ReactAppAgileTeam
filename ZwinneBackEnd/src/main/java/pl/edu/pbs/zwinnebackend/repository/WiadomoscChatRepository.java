package pl.edu.pbs.zwinnebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.edu.pbs.zwinnebackend.model.WiadomoscChat;

import java.util.List;

@Repository
public interface WiadomoscChatRepository extends JpaRepository<WiadomoscChat, Long> {
    List<WiadomoscChat> findByProjektIsNullOrderByDataWyslaniaAsc();
    List<WiadomoscChat> findByProjektIdOrderByDataWyslaniaAsc(Long projektId);
}
