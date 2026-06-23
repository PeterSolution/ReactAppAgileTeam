package pl.edu.pbs.zwinnebackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pl.edu.pbs.zwinnebackend.model.Komentarz;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.model.Zadanie;
import pl.edu.pbs.zwinnebackend.repository.KomentarzRepository;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;
import pl.edu.pbs.zwinnebackend.service.ZadanieService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ZadanieController {

    @Autowired
    private ZadanieService zadanieService;

    @Autowired
    private KomentarzRepository komentarzRepository;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<List<Zadanie>> getTasksByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(zadanieService.getTasksByProject(projectId));
    }

    @PostMapping("/projects/{projectId}/tasks")
    @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<Zadanie> createTask(@PathVariable Long projectId, @Valid @RequestBody Zadanie zadanie) {
        return ResponseEntity.ok(zadanieService.createTask(projectId, zadanie));
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<Zadanie> updateTask(@PathVariable Long taskId, @Valid @RequestBody Zadanie details) {
        return ResponseEntity.ok(zadanieService.updateTask(taskId, details));
    }

    @PutMapping("/projects/{projectId}/tasks/{taskId}")
    public ResponseEntity<Zadanie> updateTaskNested(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody Zadanie details) {
        return ResponseEntity.ok(zadanieService.updateTask(taskId, details));
    }

    @DeleteMapping("/tasks/{taskId}")
    @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<?> deleteTask(@PathVariable Long taskId) {
        zadanieService.deleteTask(taskId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Zadanie zostało usunięte.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/tasks/{taskId}/assign/{studentId}")
    public ResponseEntity<Zadanie> assignStudentToTask(
            @PathVariable Long taskId,
            @PathVariable(required = false) Long studentId) {
        return ResponseEntity.ok(zadanieService.assignStudentToTask(taskId, studentId));
    }

    @GetMapping("/tasks/{taskId}/comments")
    public ResponseEntity<List<Komentarz>> getComments(@PathVariable Long taskId) {
        return ResponseEntity.ok(komentarzRepository.findByZadanieIdOrderByDataUtworzeniaAsc(taskId));
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<Komentarz> addComment(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        String tresc = payload.get("tresc");
        if (tresc == null || tresc.trim().isEmpty()) {
            throw new IllegalArgumentException("Treść komentarza nie może być pusta.");
        }
        
        Zadanie zadanie = zadanieService.getTaskById(taskId);
        Uzytkownik autor = uzytkownikRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Użytkownik nie istnieje."));
        
        Komentarz komentarz = Komentarz.builder()
                .zadanie(zadanie)
                .autor(autor)
                .tresc(tresc)
                .build();
                
        return ResponseEntity.ok(komentarzRepository.save(komentarz));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        Komentarz komentarz = komentarzRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Komentarz o ID " + commentId + " nie istnieje."));
        
        boolean isAuthor = komentarz.getAutor().getId().equals(currentUser.getId());
        boolean isLecturer = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(pl.edu.pbs.zwinnebackend.model.Rola.ROLE_PROWADZACY.name()));
                
        if (!isAuthor && !isLecturer) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Brak uprawnień do usunięcia komentarza.");
        }
        
        komentarzRepository.delete(komentarz);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Komentarz został usunięty.");
        return ResponseEntity.ok(response);
    }
}
