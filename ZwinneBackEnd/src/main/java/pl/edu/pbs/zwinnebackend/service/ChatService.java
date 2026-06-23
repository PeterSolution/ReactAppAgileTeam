package pl.edu.pbs.zwinnebackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.model.WiadomoscChat;
import pl.edu.pbs.zwinnebackend.repository.ProjektRepository;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;
import pl.edu.pbs.zwinnebackend.repository.WiadomoscChatRepository;

import java.util.List;

@Service
public class ChatService {

    @Autowired
    private WiadomoscChatRepository chatRepository;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @Autowired
    private ProjektRepository projektRepository;

    @Transactional
    public WiadomoscChat savePublicMessage(Long senderId, String content) {
        Uzytkownik sender = uzytkownikRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + senderId + " nie istnieje."));

        WiadomoscChat message = WiadomoscChat.builder()
                .nadawca(sender)
                .projekt(null) // null to czat publiczny
                .tresc(content)
                .build();

        return chatRepository.save(message);
    }

    @Transactional
    public WiadomoscChat saveProjectMessage(Long senderId, Long projectId, String content) {
        Uzytkownik sender = uzytkownikRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + senderId + " nie istnieje."));

        Projekt projekt = projektRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje."));

        // Weryfikacja czy student należy do projektu
        boolean isMember = projekt.getStudenci().contains(sender) || 
                           sender.getRola().name().equals("ROLE_PROWADZACY");
        if (!isMember) {
            throw new IllegalArgumentException("Nie należysz do tego projektu, nie możesz pisać na jego czacie.");
        }

        WiadomoscChat message = WiadomoscChat.builder()
                .nadawca(sender)
                .projekt(projekt)
                .tresc(content)
                .build();

        return chatRepository.save(message);
    }

    @Transactional
    public WiadomoscChat saveSystemMessage(Long projectId, String content) {
        Projekt projekt = projektRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje."));

        WiadomoscChat message = WiadomoscChat.builder()
                .nadawca(null)
                .projekt(projekt)
                .tresc(content)
                .build();

        return chatRepository.save(message);
    }

    public List<WiadomoscChat> getPublicMessages() {
        return chatRepository.findByProjektIsNullOrderByDataWyslaniaAsc();
    }

    public List<WiadomoscChat> getProjectMessages(Long projectId) {
        if (!projektRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje.");
        }
        return chatRepository.findByProjektIdOrderByDataWyslaniaAsc(projectId);
    }
}
