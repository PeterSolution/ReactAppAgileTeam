package pl.edu.pbs.zwinnebackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pl.edu.pbs.zwinnebackend.model.Zadanie;
import pl.edu.pbs.zwinnebackend.service.ZadanieService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ZadanieController {

    @Autowired
    private ZadanieService zadanieService;

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
}
