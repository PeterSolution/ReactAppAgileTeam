package pl.edu.pbs.zwinnebackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Rola;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.model.Zadanie;
import pl.edu.pbs.zwinnebackend.repository.ProjektRepository;
import pl.edu.pbs.zwinnebackend.repository.ZadanieRepository;
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

    @Autowired
    private ZadanieRepository zadanieRepository;

    @Autowired
    private ProjektRepository projektRepository;

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

    @GetMapping("/calendar")
    public ResponseEntity<List<Map<String, Object>>> getCalendarData(@AuthenticationPrincipal UserPrincipal currentUser) {
        boolean isLecturer = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(Rola.ROLE_PROWADZACY.name()));
                
        List<Projekt> projects;
        if (isLecturer) {
            projects = projektRepository.findAll();
        } else {
            projects = projektRepository.findByStudenciId(currentUser.getId());
        }
        
        List<Map<String, Object>> response = new java.util.ArrayList<>();
        for (Projekt p : projects) {
            Map<String, Object> projectMap = new HashMap<>();
            projectMap.put("id", p.getId());
            projectMap.put("nazwa", p.getNazwa());
            projectMap.put("dataOddania", p.getDataOddania());
            
            List<Zadanie> tasks = zadanieRepository.findByProjektIdOrderByKolejnoscAsc(p.getId());
            List<Map<String, Object>> tasksList = new java.util.ArrayList<>();
            for (Zadanie t : tasks) {
                Map<String, Object> taskMap = new HashMap<>();
                taskMap.put("id", t.getId());
                taskMap.put("nazwa", t.getNazwa());
                taskMap.put("deadline", t.getDeadline());
                taskMap.put("status", t.getStatus());
                tasksList.add(taskMap);
            }
            projectMap.put("tasks", tasksList);
            response.add(projectMap);
        }
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{projectId}/stats")
    public ResponseEntity<Map<String, Object>> getProjectStats(@PathVariable Long projectId) {
        List<Zadanie> tasks = zadanieRepository.findByProjektIdOrderByKolejnoscAsc(projectId);
        
        long todo = tasks.stream().filter(t -> t.getStatus() == pl.edu.pbs.zwinnebackend.model.StatusZadania.TODO).count();
        long inProgress = tasks.stream().filter(t -> t.getStatus() == pl.edu.pbs.zwinnebackend.model.StatusZadania.IN_PROGRESS).count();
        long done = tasks.stream().filter(t -> t.getStatus() == pl.edu.pbs.zwinnebackend.model.StatusZadania.DONE).count();
        long total = tasks.size();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("todo", todo);
        stats.put("inProgress", inProgress);
        stats.put("done", done);
        
        return ResponseEntity.ok(stats);
    }
}
