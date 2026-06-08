package pl.edu.pbs.zwinnebackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;
import pl.edu.pbs.zwinnebackend.service.ProjektService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/projects")
public class ProjektController {

    @Autowired
    private ProjektService projektService;

    @GetMapping
    public ResponseEntity<Page<Projekt>> getAllProjects(
            @RequestParam(value = "search", required = false, defaultValue = "") String search,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size,
            @RequestParam(value = "sortBy", required = false, defaultValue = "utworzony") String sortBy,
            @RequestParam(value = "direction", required = false, defaultValue = "DESC") String direction,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        Page<Projekt> projects = projektService.getAllProjects(search, page, size, sortBy, direction, currentUser);
        return ResponseEntity.ok(projects);
    }
    @GetMapping("/all")
    public ResponseEntity<List<Projekt>> getAllProjectsWithoutPagination() {
        return ResponseEntity.ok(projektService.getAllProjects());
    }


    // Dodatkowy endpoint wyszukiwania mapujący się na format ENDPOINTS.projects.search z frontendu
    @GetMapping("/search")
    public ResponseEntity<?> searchProjects(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Page<Projekt> projects = projektService.getAllProjects(query, 0, 50, "utworzony", "DESC", currentUser);
        return ResponseEntity.ok(projects.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Projekt> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(projektService.getProjectById(id));
    }

    @PostMapping
    // @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<Projekt> createProject(@Valid @RequestBody Projekt projekt) {
        return ResponseEntity.ok(projektService.createProject(projekt));
    }

    @PutMapping("/{id}")
    // @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<Projekt> updateProject(@PathVariable Long id, @Valid @RequestBody Projekt details) {
        return ResponseEntity.ok(projektService.updateProject(id, details));
    }

    @DeleteMapping("/{id}")
    // @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<?> deleteProject(@PathVariable Long id) {
        projektService.deleteProject(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Projekt został usunięty.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{projectId}/students")
    public ResponseEntity<Set<Uzytkownik>> getStudentsByProject(@PathVariable Long projectId) {
        Projekt projekt = projektService.getProjectById(projectId);
        return ResponseEntity.ok(projekt.getStudenci());
    }

    @PostMapping("/{projectId}/students/{studentId}")
    // @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<?> addStudentToProject(@PathVariable Long projectId, @PathVariable Long studentId) {
        projektService.addStudentToProject(projectId, studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Student został dodany do projektu.");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{projectId}/students/{studentId}")
    // @PreAuthorize("hasRole('PROWADZACY')")
    public ResponseEntity<?> removeStudentFromProject(@PathVariable Long projectId, @PathVariable Long studentId) {
        projektService.removeStudentFromProject(projectId, studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Student został usunięty z projektu.");
        return ResponseEntity.ok(response);
    }
}
