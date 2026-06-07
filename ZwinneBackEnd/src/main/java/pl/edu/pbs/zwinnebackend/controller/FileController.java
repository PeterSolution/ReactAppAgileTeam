package pl.edu.pbs.zwinnebackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pl.edu.pbs.zwinnebackend.model.PlikMetadane;
import pl.edu.pbs.zwinnebackend.security.UserPrincipal;
import pl.edu.pbs.zwinnebackend.service.FileStorageService;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    @PostMapping("/projects/{projectId}/files")
    public ResponseEntity<PlikMetadane> uploadFile(
            @PathVariable Long projectId,
            @RequestParam(value = "taskId", required = false) Long taskId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        PlikMetadane metadata = fileStorageService.storeFile(file, projectId, taskId, currentUser.getUzytkownik());
        return ResponseEntity.ok(metadata);
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId, HttpServletRequest request) {
        PlikMetadane metadata = fileStorageService.getFileMetadata(fileId);
        Resource resource = fileStorageService.loadFileAsResource(metadata.getSciezkaPliku());

        String contentType = metadata.getTypPliku();
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getNazwaPliku() + "\"")
                .body(resource);
    }

    @GetMapping("/projects/{projectId}/files")
    public ResponseEntity<List<PlikMetadane>> getFilesByProject(@PathVariable Long projectId) {
        List<PlikMetadane> files = fileStorageService.getFilesByProject(projectId);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/tasks/{taskId}/files")
    public ResponseEntity<List<PlikMetadane>> getFilesByTask(@PathVariable Long taskId) {
        List<PlikMetadane> files = fileStorageService.getFilesByTask(taskId);
        return ResponseEntity.ok(files);
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable Long fileId) {
        fileStorageService.deleteFile(fileId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Plik został usunięty.");
        return ResponseEntity.ok(response);
    }
}
