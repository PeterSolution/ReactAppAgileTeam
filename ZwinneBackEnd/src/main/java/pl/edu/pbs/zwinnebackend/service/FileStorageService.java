package pl.edu.pbs.zwinnebackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import pl.edu.pbs.zwinnebackend.model.PlikMetadane;
import pl.edu.pbs.zwinnebackend.model.Projekt;
import pl.edu.pbs.zwinnebackend.model.Uzytkownik;
import pl.edu.pbs.zwinnebackend.model.Zadanie;
import pl.edu.pbs.zwinnebackend.repository.PlikMetadaneRepository;
import pl.edu.pbs.zwinnebackend.repository.ProjektRepository;
import pl.edu.pbs.zwinnebackend.repository.UzytkownikRepository;
import pl.edu.pbs.zwinnebackend.repository.ZadanieRepository;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    @Autowired
    private PlikMetadaneRepository plikMetadaneRepository;

    @Autowired
    private ProjektRepository projektRepository;

    @Autowired
    private ZadanieRepository zadanieRepository;

    @Autowired
    private UzytkownikRepository uzytkownikRepository;

    @Autowired
    public FileStorageService(@Value("${app.upload.dir}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir)
                .toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Nie można utworzyć katalogu do przechowywania plików.", ex);
        }
    }

    @Transactional
    public PlikMetadane storeFile(MultipartFile file, Long projectId, Long taskId, Uzytkownik currentUser) {
        // Sanityzacja nazwy pliku
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        
        try {
            // Sprawdzenie poprawności ścieżki (zabezpieczenie przed Directory Traversal)
            if (originalFileName.contains("..")) {
                throw new IllegalArgumentException("Nazwa pliku zawiera niepoprawne znaki: " + originalFileName);
            }

            // Generujemy unikalną nazwę pliku na dysku serwera, zachowując rozszerzenie
            String fileExtension = "";
            int extensionIndex = originalFileName.lastIndexOf('.');
            if (extensionIndex > 0) {
                fileExtension = originalFileName.substring(extensionIndex);
            }
            String savedFileName = UUID.randomUUID().toString() + fileExtension;

            // Zapis pliku fizycznie na dysku
            Path targetLocation = this.fileStorageLocation.resolve(savedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Zapis metadanych w bazie
            Projekt projekt = projektRepository.findById(projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje."));

            Zadanie zadanie = null;
            if (taskId != null) {
                zadanie = zadanieRepository.findById(taskId)
                        .orElseThrow(() -> new IllegalArgumentException("Zadanie o ID " + taskId + " nie istnieje."));
            }

            PlikMetadane metadane = PlikMetadane.builder()
                    .nazwaPliku(originalFileName)
                    .sciezkaPliku(savedFileName)
                    .typPliku(file.getContentType())
                    .rozmiar(file.getSize())
                    .projekt(projekt)
                    .zadanie(zadanie)
                    .przeslanyPrzez(currentUser)
                    .build();

            return plikMetadaneRepository.save(metadane);
        } catch (IOException ex) {
            throw new RuntimeException("Nie udało się zapisać pliku: " + originalFileName + ". Spróbuj ponownie!", ex);
        }
    }

    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("Plik nie został znaleziony: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Niepoprawna ścieżka pliku: " + fileName, ex);
        }
    }

    public List<PlikMetadane> getFilesByProject(Long projectId) {
        if (!projektRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Projekt o ID " + projectId + " nie istnieje.");
        }
        return plikMetadaneRepository.findByProjektId(projectId);
    }

    public List<PlikMetadane> getFilesByTask(Long taskId) {
        if (!zadanieRepository.existsById(taskId)) {
            throw new IllegalArgumentException("Zadanie o ID " + taskId + " nie istnieje.");
        }
        return plikMetadaneRepository.findByZadanieId(taskId);
    }

    public PlikMetadane getFileMetadata(Long fileId) {
        return plikMetadaneRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono pliku o ID: " + fileId));
    }

    @Transactional
    public void deleteFile(Long fileId) {
        PlikMetadane metadane = getFileMetadata(fileId);
        
        try {
            // Usunięcie fizyczne z dysku
            Path filePath = this.fileStorageLocation.resolve(metadane.getSciezkaPliku()).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Błąd podczas usuwania pliku z dysku", ex);
        }

        // Usunięcie wpisu w bazie danych
        plikMetadaneRepository.delete(metadane);
    }
}
