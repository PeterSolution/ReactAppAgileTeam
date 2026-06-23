package pl.edu.pbs.zwinnebackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Rola;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.model.WiadomoscChat;
import pl.edu.pbs.zwinnebackend.model.Zadanie;
import pl.edu.pbs.zwinnebackend.repository.ProjektRepository;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;
import pl.edu.pbs.zwinnebackend.repository.ZadanieRepository;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;

import java.util.List;

@Service
public class ZadanieService {

    @Autowired
    private ZadanieRepository zadanieRepository;

    @Autowired
    private ProjektRepository projektRepository;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatService chatService;

    public List<Zadanie> getTasksByProject(Long projectId) {
        if (!projektRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje.");
        }
        return zadanieRepository.findByProjektIdOrderByKolejnoscAsc(projectId);
    }

    public Zadanie getTaskById(Long taskId) {
        return zadanieRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Zadanie o ID " + taskId + " nie istnieje."));
    }

    @Transactional
    public Zadanie createTask(Long projectId, Zadanie zadanie) {
        Projekt projekt = projektRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje."));

        zadanie.setProjekt(projekt);
        if (zadanie.getKolejnosc() == null) {
            int currentTasksCount = zadanieRepository.findByProjektId(projectId).size();
            zadanie.setKolejnosc(currentTasksCount + 1);
        }
        return zadanieRepository.save(zadanie);
    }

    @Transactional
    public Zadanie updateTask(Long taskId, Zadanie details) {
        Zadanie zadanie = getTaskById(taskId);
        
        pl.edu.pbs.zwinnebackend.model.StatusZadania oldStatus = zadanie.getStatus();
        pl.edu.pbs.zwinnebackend.model.StatusZadania newStatus = details.getStatus();
        
        zadanie.setNazwa(details.getNazwa());
        zadanie.setOpis(details.getOpis());
        zadanie.setStatus(newStatus);
        
        // Save deadline
        zadanie.setDeadline(details.getDeadline());
        
        if (details.getKolejnosc() != null) {
            zadanie.setKolejnosc(details.getKolejnosc());
        }
        if (details.getPrzypisanyStudent() != null) {
            Uzytkownik student = uzytkownikRepository.findById(details.getPrzypisanyStudent().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Student o ID " + details.getPrzypisanyStudent().getId() + " nie istnieje."));
            if (student.getRola() != Rola.ROLE_STUDENT) {
                throw new IllegalArgumentException("Przypisywany użytkownik musi być studentem.");
            }
            zadanie.setPrzypisanyStudent(student);
        } else {
            zadanie.setPrzypisanyStudent(null);
        }
        
        Zadanie updatedTask = zadanieRepository.save(zadanie);
        
        // Send real-time notification if status has changed
        if (oldStatus != newStatus) {
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                Uzytkownik currentUser = null;
                if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
                    currentUser = ((UserPrincipal) auth.getPrincipal()).getUzytkownik();
                }
                
                String userName = currentUser != null ? (currentUser.getImie() + " " + currentUser.getNazwisko()) : "Użytkownik";
                
                String action = "zmienił status";
                if (newStatus == pl.edu.pbs.zwinnebackend.model.StatusZadania.DONE) {
                    action = "ukończył zadanie";
                } else if (newStatus == pl.edu.pbs.zwinnebackend.model.StatusZadania.IN_PROGRESS) {
                    action = "rozpoczął zadanie";
                } else if (newStatus == pl.edu.pbs.zwinnebackend.model.StatusZadania.TODO) {
                    action = "cofnął zadanie";
                }
                
                String systemMessageText = userName + " " + action + " \"" + updatedTask.getNazwa() + "\"";
                
                // Save message in the project's chat
                WiadomoscChat systemMsg = chatService.saveSystemMessage(updatedTask.getProjekt().getId(), systemMessageText);
                
                // Broadcast through WebSocket
                messagingTemplate.convertAndSend("/topic/project/" + updatedTask.getProjekt().getId(), systemMsg);
            } catch (Exception ex) {
                System.err.println("Błąd podczas wysyłania powiadomienia WebSocket: " + ex.getMessage());
            }
        }
        
        return updatedTask;
    }

    @Transactional
    public void deleteTask(Long taskId) {
        Zadanie zadanie = getTaskById(taskId);
        zadanieRepository.delete(zadanie);
    }

    @Transactional
    public Zadanie assignStudentToTask(Long taskId, Long studentId) {
        Zadanie zadanie = getTaskById(taskId);
        if (studentId == null) {
            zadanie.setPrzypisanyStudent(null);
        } else {
            Uzytkownik student = uzytkownikRepository.findById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Użytkownik o ID " + studentId + " nie istnieje."));
            if (student.getRola() != Rola.ROLE_STUDENT) {
                throw new IllegalArgumentException("Tylko użytkownicy o roli STUDENT mogą być przypisani do zadań.");
            }
            zadanie.setPrzypisanyStudent(student);
        }
        return zadanieRepository.save(zadanie);
    }
}
